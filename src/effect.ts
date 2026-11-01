import {noop} from '@oscarpalmer/atoms/function';
import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {
	ACTIVE,
	MESSAGE_EFFECT_CALLBACK,
	MESSAGE_SCOPE_CALLBACK,
	NAME_COMPUTED,
	NAME_EFFECT,
	STATUS_CHECK,
	STATUS_CLEAN,
	STATUS_DIRTY,
	STATUS_RUNNING,
	SYMBOL_STATE,
} from './constants';
import {unlinkSourcesFrom} from './helpers/graph';
import {deactivateComputedState} from './helpers/misc';
import type {
	ComputedState,
	Effect,
	InternalEffect,
	Link,
	ObserverState,
	Parent,
} from './models';

// #region Instance

function Effect(this: InternalEffect, callback: GenericCallback): void {
	const state: ObserverState = {
		callback,
		active: true,
		cursor: undefined,
		firstChild: undefined,
		firstSource: undefined,
		lastChild: undefined,
		lastSource: undefined,
		name: NAME_EFFECT,
		nextSibling: undefined,
		parent: undefined,
		previousSibling: undefined,
		queued: false,
		status: STATUS_CLEAN,
		version: 0,
	};

	this[SYMBOL_STATE] = state;

	setParent(state, ACTIVE.parent);

	runObserver(state);
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

function checkSources(node: ObserverState): void {
	let link = node.firstSource;

	while (link != null) {
		if (link.source.name === NAME_COMPUTED) {
			refreshObserver(link.source as ComputedState);

			if (node.status === STATUS_DIRTY) {
				return;
			}
		}

		link = link.nextSource;
	}
}

export function deactivateEffect(state: ObserverState): void {
	disposeChildren(state);

	state.active = false;
	state.callback = noop;
	state.cursor = undefined;

	unlinkSourcesFrom(state, state.firstSource);
}

export function disposeChildren(parent: Parent): void {
	let child = parent.firstChild;

	parent.firstChild = undefined;
	parent.lastChild = undefined;

	while (child != null) {
		const next = child.nextSibling;

		child.nextSibling = undefined;
		child.parent = undefined;
		child.previousSibling = undefined;

		if (child.name === NAME_COMPUTED) {
			deactivateComputedState(child as ComputedState);
		} else {
			deactivateEffect(child);
		}

		child = next;
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

export function refreshObserver(node: ObserverState): void {
	if (node.status === STATUS_CHECK) {
		checkSources(node);

		if (node.status === STATUS_CHECK) {
			node.status = STATUS_CLEAN;
		}
	}

	if (node.status === STATUS_DIRTY) {
		runObserver(node);
	}
}

export function removeChild(state: ObserverState): void {
	const {nextSibling, parent, previousSibling} = state;

	if (parent == null) {
		return;
	}

	if (previousSibling == null) {
		parent.firstChild = nextSibling;
	} else {
		previousSibling.nextSibling = nextSibling;
	}

	if (nextSibling == null) {
		parent.lastChild = previousSibling;
	} else {
		nextSibling.previousSibling = previousSibling;
	}

	state.nextSibling = undefined;
	state.parent = undefined;
	state.previousSibling = undefined;
}

export function runObserver(node: ObserverState): void {
	disposeChildren(node);

	const previousEffect = ACTIVE.effect;
	const previousParent = ACTIVE.parent;

	ACTIVE.effect = node;
	ACTIVE.parent = node;

	node.cursor = undefined;
	node.status = STATUS_RUNNING;
	node.version += 1;

	try {
		node.callback();
	} finally {
		ACTIVE.effect = previousEffect;
		ACTIVE.parent = previousParent;

		node.status = STATUS_CLEAN;

		const cursor = node.cursor as Link | undefined;

		unlinkSourcesFrom(node, cursor == null ? node.firstSource : cursor.nextSource);
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
		firstChild: undefined,
		lastChild: undefined,
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

export function setParent(state: ObserverState, parent?: Parent): void {
	if (parent == null) {
		return;
	}

	const last = parent.lastChild;

	state.parent = parent;
	state.previousSibling = last;

	if (last == null) {
		parent.firstChild = state;
	} else {
		last.nextSibling = state;
	}

	parent.lastChild = state;
}

function stopEffect(this: InternalEffect): void {
	const state = this[SYMBOL_STATE];

	if (state.active) {
		removeChild(state);
		deactivateEffect(state);
	}
}

// #endregion
