import {batchDepth, batchedHandlers} from './batch';
import {type Effect, activeEffect, effect, runEffect} from './effect';
import {Reactive, type ReactiveState} from './reactive';

type ComputedEffect = {
	dirty: boolean;
	instance: Effect;
};

export type InternalComputed = {
	readonly effect: ComputedEffect;
	readonly state: ReactiveState<unknown>;
};

export let activeComputed: Computed<unknown> | undefined;

export class Computed<Value> extends Reactive<Value> {
	private readonly effect: ComputedEffect = {
		dirty: true,
		instance: undefined as never,
	};

	constructor(callback: () => Value) {
		super('computed', undefined as never);

		this.effect.instance = effect(() => {
			if (this.effect.dirty) {
				const previousComputed = activeComputed;

				activeComputed = this as never;

				const value = callback();

				activeComputed = previousComputed;

				if (!Object.is(this.state.value, value)) {
					this.state.value = value;

					for (const computed of this.state.computeds) {
						computed.effect.dirty = true;
					}

					for (const effect of this.state.effects) {
						batchedHandlers.add(effect);
					}

					for (const [, subscription] of this.state.subscriptions) {
						subscription.callback(value);
					}
				}

				this.effect.dirty = false;
			}
		});
	}

	/**
	 * @inheritdoc
	 */
	get(): Value {
		if (activeComputed != null && activeComputed !== this) {
			this.state.computeds.add(activeComputed);
		}

		if (activeEffect != null && activeEffect !== this.effect.instance) {
			this.state.effects.add(activeEffect);
		}

		if (this.effect.dirty && batchDepth === 0) {
			runEffect(this.effect.instance);
		}

		return this.state.value;
	}
}

/**
 * Create a computed value
 */
export function computed<Value>(callback: () => Value): Computed<Value> {
	return new Computed(callback);
}
