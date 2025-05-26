import {batchDepth} from './batch';
import {
	type Effect,
	activeEffect,
	dirtyEffects,
	effect,
	runEffect,
} from './effect';

type ComputedState<Value> = {
	computeds: Set<Computed<unknown>>;
	dirty: boolean;
	effect: Effect;
	effects: Set<Effect>;
	value: Value;
};

export type InternalComputed = {
	readonly state: ComputedState<unknown>;
};

export let activeComputed: Computed<unknown> | undefined;

export class Computed<Value> {
	private readonly state: ComputedState<Value>;

	constructor(callback: () => Value) {
		this.state = {
			computeds: new Set(),
			dirty: true,
			effect: undefined as never,
			effects: new Set(),
			value: undefined as never,
		};

		this.state.effect = effect(() => {
			if (this.state.dirty) {
				const previousComputed = activeComputed;

				activeComputed = this;

				const value = callback();

				activeComputed = previousComputed;

				if (!Object.is(this.state.value, value)) {
					this.state.value = value;

					for (const computed of this.state.computeds) {
						computed.state.dirty = true;
					}

					for (const effect of this.state.effects) {
						dirtyEffects.add(effect);
					}
				}

				this.state.dirty = false;
			}
		});
	}

	/**
	 * Get the value
	 */
	get(): Value {
		if (activeComputed != null && activeComputed !== this) {
			this.state.computeds.add(activeComputed);
		}

		if (activeEffect != null && activeEffect !== this.state.effect) {
			this.state.effects.add(activeEffect);
		}

		if (this.state.dirty && batchDepth === 0) {
			runEffect(this.state.effect);
		}

		return this.state.value;
	}

	/**
	 * Get the value _(without reactivity)_
	 */
	peek(): Value {
		return this.state.value;
	}
}

/**
 * Create a computed value
 */
export function computed<Value>(callback: () => Value): Computed<Value> {
	return new Computed(callback);
}
