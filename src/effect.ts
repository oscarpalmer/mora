import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {Signal} from './signal';

export let activeEffect: Effect | undefined;

export class Effect {
		callback!: GenericCallback;
		signals = new Set<Signal<unknown>>();
	}

export function runEffect(effect: Effect): void {
	for (const signal of effect.signals) {
		signal.state.observers.delete(effect);
	}

	effect.signals.clear();

	const previousEffect = activeEffect;

	activeEffect = effect;

	try {
		effect.callback();
	} finally {
		activeEffect = previousEffect;
	}
}

export function effect(callback: GenericCallback): Effect {
	const instance = new Effect();

	instance.callback = callback;

	runEffect(instance);

	return instance;
}

