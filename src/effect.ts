import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {ACTIVE, NAME_EFFECT, NAME_MORA} from './constants';
import type {EffectState, InternalEffect} from './models';

export class Effect {
	declare private readonly $mora: string;

	declare private readonly state: EffectState;

	constructor(callback: GenericCallback) {
		Object.defineProperty(this, NAME_MORA, {
			value: NAME_EFFECT,
		});

		this.state = {
			callback,
		};

		runEffect(this);
	}
}

export function runEffect(effect: Effect): void {
	const previousEffect = ACTIVE.effect;

	ACTIVE.effect = effect;

	try {
		(effect as unknown as InternalEffect).state.callback();
	} finally {
		ACTIVE.effect = previousEffect;
	}
}

/**
 * Create an effect
 * @param callback Callback for handling signal effects
 * @returns Effect
 */
export function effect(callback: GenericCallback): Effect {
	return typeof callback === 'function' ? new Effect(callback) : (undefined as never);
}
