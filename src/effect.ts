import type {GenericCallback} from '@oscarpalmer/atoms/models';

type EffectState = {
	callback: GenericCallback;
};

type InternalEffect = {
	state: EffectState;
};

export class Effect {
		private declare readonly $mora: string;

		private declare readonly state: EffectState;

		constructor(callback: GenericCallback) {
			Object.defineProperty(this, '$mora', {
				value: 'effect',
			});

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
		(effect as unknown as InternalEffect).state.callback();
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
