import {ACTIVE, BATCH, NAME_COMPUTED} from '../constants';
import {effect, runEffect} from '../effect';
import type {ComputedEffect, ReactiveOptions} from '../models';
import {Reactive} from './reactive';

export class Computed<Value> extends Reactive<Value> {
	private readonly effect: ComputedEffect = {
		dirty: true,
		instance: undefined as never,
	};

	constructor(callback: () => Value, options?: ReactiveOptions<Value>) {
		super(NAME_COMPUTED, undefined as never, options);

		this.effect.instance = effect(() => {
			if (!this.effect.dirty) {
				return;
			}

			const previousComputed = ACTIVE.computed;

			ACTIVE.computed = this as never;

			const value = callback();

			ACTIVE.computed = previousComputed;

			if (!this.state.equal(this.state.value, value)) {
				this.state.value = value;

				for (const computed of this.state.computeds) {
					computed.effect.dirty = true;
				}

				for (const effect of this.state.effects) {
					BATCH.handlers.add(effect);
				}

				for (const [, subscription] of this.state.subscriptions) {
					subscription.callback(value);
				}
			}

			this.effect.dirty = false;
		});
	}

	/**
	 * @inheritdoc
	 */
	get(): Value {
		if (ACTIVE.computed != null && this !== ACTIVE.computed) {
			this.state.computeds.add(ACTIVE.computed);
		}

		if (ACTIVE.effect != null && ACTIVE.effect !== this.effect.instance) {
			this.state.effects.add(ACTIVE.effect);
		}

		if (this.effect.dirty && BATCH.depth === 0) {
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
