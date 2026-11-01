import {noop} from '@oscarpalmer/atoms/function';
import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {
	ACTIVE,
	BATCH,
	MESSAGE_EFFECT_CALLBACK,
	MESSAGE_SCOPE_CALLBACK,
	NAME_EFFECT,
	SYMBOL_STATE,
} from './constants';
import type {Child, ComputedEffect, Effect, EffectState, InternalEffect, Parent} from './models';

// #region Instance

function Effect(this: InternalEffect, callback: GenericCallback): void {
	const state = getEffectState(callback);

	this[SYMBOL_STATE] = state;

	setParent(this, state, ACTIVE.parent);

	runEffect(state);
}

Effect.prototype.stop = stopEffect;

Object.defineProperties(Effect.prototype, {
	active: {
		enumerable: true,
		get: getActive,
	},
});

// #endregion

// #region Functions

export function deactivateEffect(state: EffectState): void {
	disposeChildren(state);

	state.active = false;
	state.callback = noop;

	BATCH.handlers.delete(state);

	if (state.sources != null) {
		for (const [source] of state.sources) {
			source.observers?.delete(state);
		}

		state.sources.clear();

		state.sources = undefined;
	}
}

export function disposeChildren(parent: Parent): void {
	const {children} = parent;

	if (children == null) {
		return;
	}

	parent.children = undefined;

	for (const child of children) {
		if ('stop' in child) {
			child.stop();
		} else {
			child.deactivate();
		}
	}
}

/**
 * Create an effect
 *
 * @param callback Callback for handling signal effects
 * @returns Effect
 */
export function effect(callback: GenericCallback): Effect {
	if (typeof callback !== 'function') {
		throw new TypeError(MESSAGE_EFFECT_CALLBACK);
	}

	// @ts-expect-error All good, no worries :-)
	return new Effect(callback);
}

function getActive(this: InternalEffect): boolean {
	return this[SYMBOL_STATE].active;
}

function getEffectState(callback: GenericCallback, computed?: ComputedEffect): EffectState {
	return {
		callback,
		computed,
		active: true,
		children: undefined,
		name: NAME_EFFECT,
		parent: undefined,
		sources: undefined,
		version: 0,
	};
}

export function internalEffect(callback: GenericCallback, computed?: ComputedEffect): EffectState {
	const state = getEffectState(callback, computed);

	runEffect(state);

	return state;
}

export function runEffect(state: EffectState): void {
	if (state.computed != null && !state.computed.dirty) {
		return;
	}

	disposeChildren(state);

	const previousEffect = ACTIVE.effect;
	const previousParent = ACTIVE.parent;

	ACTIVE.effect = state;
	ACTIVE.parent = state;

	state.version += 1;

	try {
		state.callback();
	} finally {
		ACTIVE.effect = previousEffect;
		ACTIVE.parent = previousParent;

		if (state.sources != null) {
			for (const [source, version] of state.sources) {
				if (version !== state.version) {
					state.sources.delete(source);

					source.observers?.delete(state);
				}
			}
		}
	}
}

/**
 * Create a scope for effects and computeds
 *
 * _(Effects and computeds created inside the scope are not stopped when a surrounding effect re-runs; use the returned function to stop and deactivate them)_
 *
 * @param callback Callback to run inside the scope
 * @returns Function for stopping and deactivating everything created inside the scope
 */
export function scope(callback: GenericCallback): () => void {
	if (typeof callback !== 'function') {
		throw new TypeError(MESSAGE_SCOPE_CALLBACK);
	}

	const parent: Parent = {
		children: undefined,
	};

	const previousEffect = ACTIVE.effect;
	const previousParent = ACTIVE.parent;

	ACTIVE.effect = undefined;
	ACTIVE.parent = parent;

	try {
		callback();
	} finally {
		ACTIVE.effect = previousEffect;
		ACTIVE.parent = previousParent;
	}

	return () => {
		disposeChildren(parent);
	};
}

export function setParent(child: Child, state: EffectState, parent?: Parent): void {
	if (parent == null) {
		return;
	}

	state.parent = parent;

	parent.children ??= new Set();

	parent.children.add(child);
}

function stopEffect(this: InternalEffect): void {
	const state = this[SYMBOL_STATE];

	if (state.active) {
		state.parent?.children?.delete(this);

		deactivateEffect(state);
	}
}

// #endregion
