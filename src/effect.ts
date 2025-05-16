import type {GenericCallback} from '@oscarpalmer/atoms/models';

type EffectState = {
	callback: GenericCallback;
};

export class Effect {
	readonly state: EffectState;

	constructor(callback: GenericCallback) {
		this.state = {
			callback,
		};

		runEffect(this);
	}
}

export function runEffect(effect: Effect): void {
	const previousEffect = activeEffect;

	activeEffect = effect;

	try {
		effect.state.callback();
	} finally {
		activeEffect = previousEffect;
	}
}

/**
 * Create an effect
 */
export function effect(callback: GenericCallback): Effect {
	return new Effect(callback);
}

export let activeEffect: Effect | undefined;

export const dirtyEffects = new Set<Effect>();
