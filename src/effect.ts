import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {Signal} from './signal';

type EffectState = {
	callback: GenericCallback;
	signals: Set<Signal<never>>;
};

export let activeEffect: Effect | undefined;

export class Effect {
	readonly state: EffectState;

	constructor(callback: GenericCallback) {
		this.state = {
			callback,
			signals: new Set(),
		};

		runEffect(this);
	}
}

export function runEffect(effect: Effect): void {
	for (const signal of effect.state.signals) {
		signal.state.effects.delete(effect);
	}

	effect.state.signals.clear();

	const previousEffect = activeEffect;

	activeEffect = effect;

	try {
		effect.state.callback();
	} finally {
		activeEffect = previousEffect;
	}
}

export function effect(callback: GenericCallback): Effect {
	return new Effect(callback);
}

