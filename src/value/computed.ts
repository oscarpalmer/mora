import {batchDepth, batchedHandlers} from '../batch';
import {type Effect, activeEffect, effect, runEffect} from '../effect';
import {computedName} from '../helpers/is';
import {Reactive, type ReactiveOptions, type ReactiveState} from './reactive';

export type ComputedEffect = {
	dirty: boolean;
	instance: Effect;
};

export type InternalComputed = {
	readonly effect: ComputedEffect;
	readonly state: ReactiveState<unknown, unknown>;
};

export let activeComputed: Computed<unknown> | undefined;

export class Computed<Value> extends Reactive<Value> {
	private readonly effect: ComputedEffect = {
		dirty: true,
		instance: undefined as never,
	};

	constructor(callback: () => Value, options?: ReactiveOptions<Value>) {
		super(computedName, undefined as never, options);

		this.effect.instance = effect(() => {
			if (this.effect.dirty) {
				const previousComputed = activeComputed;

				activeComputed = this as never;

				const value = callback();

				activeComputed = previousComputed;

				if (!this.state.equal(this.state.value, value)) {
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
		if (activeComputed != null && this !== activeComputed) {
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
export function computed<Value>(
	callback: () => Value,
	options?: ReactiveOptions<Value>,
): Computed<Value> {
	return new Computed(callback, options);
}
