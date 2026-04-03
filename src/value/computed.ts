import {flushHandlers} from '../batch';
import {ACTIVE, BATCH, NAME_COMPUTED} from '../constants';
import {effect, runEffect} from '../effect';
import type {ComputedEffect, InternalComputed, ReactiveOptions, ReactiveState} from '../models';
import {Reactive} from './reactive';

export class Computed<Value> extends Reactive<Value> {
	private readonly effect: ComputedEffect = {
		dirty: true,
		instance: undefined as never,
	};

	constructor(callback: () => Value | Promise<Value>, options?: ReactiveOptions<Value>) {
		super(NAME_COMPUTED, undefined as never, options);

		this.effect.instance = effect(() => {
			if (this.effect.dirty) {
				setValue(this, this.state, callback);

				this.effect.dirty = false;
			}
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
 * @param callback Callback to compute the value
 * @param options Reactivity options
 * @returns Computed value
 */
export function computed<Value>(
	callback: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Computed<Value> {
	return new Computed(callback, options);
}

function setAndEmit<Value>(state: ReactiveState<Value, Value>, value: Value): void {
	if (state.equal(state.value, value)) {
		return;
	}

	state.value = value;

	for (const computed of state.computeds) {
		(computed as unknown as InternalComputed).effect.dirty = true;
	}

	for (const effect of state.effects) {
		BATCH.handlers.add(effect);
	}

	for (const [, subscription] of state.subscriptions) {
		subscription.callback(value);
	}

	flushHandlers();
}

function setValue<Value>(
	instance: Computed<Value>,
	state: ReactiveState<Value, Value>,
	callback: () => Value | Promise<Value>,
): void {
	const previousComputed = ACTIVE.computed;

	ACTIVE.computed = instance as never;

	try {
		const value = callback();

		if (value instanceof Promise) {
			state.promise = value;

			value
				.then(resolvedValue => {
					if (state.promise === value) {
						state.promise = undefined;

						setAndEmit(state, resolvedValue);
					}
				})
				.catch(() => {
					if (state.promise === value) {
						state.promise = undefined;
					}
				});
		} else {
			setAndEmit(state, value);
		}
	} finally {
		ACTIVE.computed = previousComputed;
	}
}
