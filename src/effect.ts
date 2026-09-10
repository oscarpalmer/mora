import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {ACTIVE, NAME_EFFECT, NAME_MORA, SYMBOL_STATE} from './constants';
import type {Effect, EffectState} from './models';

// #region Instance

function Effect(this: any, callback: GenericCallback) {
	this[SYMBOL_STATE] = {callback};

	runEffect(this[SYMBOL_STATE]);
}

Effect.prototype[NAME_MORA] = NAME_EFFECT;

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
		throw new TypeError('Effect callback must be a function');
	}

	return getEffect(callback)[0];
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

// #endregion
