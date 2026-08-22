import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {ACTIVE, NAME_EFFECT} from './constants';
import type {Effect, EffectState} from './models';

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
	const state: EffectState = {
		callback,
	};

	const instance = Object.freeze({
		$mora: NAME_EFFECT,
	});

	runEffect(state);

	return [instance, state];
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
