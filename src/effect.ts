import {noop} from '@oscarpalmer/atoms/function';
import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {ACTIVE, BATCH, MESSAGE_EFFECT_CALLBACK, NAME_EFFECT, SYMBOL_STATE} from './constants';
import type {Effect, EffectState, InternalEffect} from './models';

// #region Instance

function Effect(this: InternalEffect, callback: GenericCallback): void {
	this[SYMBOL_STATE] = {
		callback,
		active: true,
		name: NAME_EFFECT,
	};

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

function getEffect(callback: GenericCallback): [Effect, EffectState] {
	// @ts-expect-error All good, no worries :-)
	const instance = new Effect(callback);

	return [instance, instance[SYMBOL_STATE]];
}

export function internalEffect(callback: GenericCallback): EffectState {
	return getEffect(callback)[1];
}

export function runEffect(state: EffectState): void {
	const previousEffect = ACTIVE.effect;

	ACTIVE.effect = state;

	try {
		state.callback();
	} finally {
		ACTIVE.effect = previousEffect;
	}
}

function stopEffect(this: InternalEffect): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	BATCH.handlers.delete(state);

	state.active = false;
	state.callback = noop;
}

// #endregion
