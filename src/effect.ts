import {noop} from '@oscarpalmer/atoms/function';
import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {ACTIVE, BATCH, MESSAGE_EFFECT_CALLBACK, NAME_EFFECT, SYMBOL_STATE} from './constants';
import type {
	Child,
	ComputedEffect,
	Effect,
	EffectState,
	InternalEffect,
	Parent,
	ReactiveState,
} from './models';

// #region Instance

function Effect(this: InternalEffect, callback: GenericCallback, computed?: ComputedEffect): void {
	this[SYMBOL_STATE] = {
		callback,
		computed,
		active: true,
		name: NAME_EFFECT,
	};

	if (computed == null) {
		setParent(this, this[SYMBOL_STATE], ACTIVE.effect);
	}

	runEffect(this[SYMBOL_STATE]);
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
		for (const source of state.sources) {
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

	return getEffect(callback)[0];
}

function getActive(this: InternalEffect): boolean {
	return this[SYMBOL_STATE].active;
}

function getEffect(callback: GenericCallback, computed?: ComputedEffect): [Effect, EffectState] {
	// @ts-expect-error All good, no worries :-)
	const instance = new Effect(callback, computed);

	return [instance, instance[SYMBOL_STATE]];
}

export function internalEffect(callback: GenericCallback, computed?: ComputedEffect): EffectState {
	return getEffect(callback, computed)[1];
}

export function runEffect(state: EffectState): void {
	if (state.computed != null && !state.computed.dirty) {
		return;
	}

	disposeChildren(state);

	const previousEffect = ACTIVE.effect;
	const previousSources = state.sources;

	ACTIVE.effect = state;

	state.sources = undefined;

	try {
		state.callback();
	} finally {
		ACTIVE.effect = previousEffect;

		if (previousSources != null) {
			const sources = state.sources as Set<ReactiveState> | undefined;

			for (const source of previousSources) {
				if (!(sources?.has(source) ?? false)) {
					source.observers?.delete(state);
				}
			}
		}
	}
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
