import {flushHandlers} from '../batch';
import {ACTIVE, BATCH, NAME_COMPUTED, NAME_MORA} from '../constants';
import {internalEffect, runEffect} from '../effect';
import {handleSimpleValue} from '../helpers/value';
import type {Computed, ComputedEffect, ReactiveOptions, ReactiveState} from '../models';
import {subscribe} from '../subscription';
import {reactive} from './reactive';

/**
 * Create a computed value
 *
 * @param callback Callback to compute the value
 * @param options Reactivity options
 * @returns Computed value
 */
export function computed<Value>(
	callback: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Computed<Value> {
	return getComputed(callback, options)[0];
}

function getComputed<Value>(
	callback: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): [Computed<Value>, ComputedEffect] {
	const [rx, state] = reactive<Value>(undefined as never, options);

	let fx: ComputedEffect;

	const instance = {
		...rx,
		get: () => getValue(state, fx),
		peek: () => state.value,
		subscribe: (callback: (value: Value) => void) => subscribe(state, callback),
		unsubscribe: (callback: (value: Value) => void) => {
			state.subscriptions.delete(callback);
		},
	};

	Object.defineProperty(instance, NAME_MORA, {
		enumerable: false,
		value: NAME_COMPUTED,
	});

	fx = getComputedEffect(state, callback);

	return [Object.freeze(instance), fx];
}

function getComputedEffect<Value>(
	state: ReactiveState<Value, Value>,
	callback: () => Value | Promise<Value>,
): ComputedEffect {
	const fx: ComputedEffect = {
		dirty: true,
		instance: undefined as never,
	};

	fx.instance = internalEffect(() => {
		if (fx.dirty) {
			const previousComputed = ACTIVE.computed;

			ACTIVE.computed = fx;

			handleSimpleValue(state, callback, setAndEmit, () => {
				ACTIVE.computed = previousComputed;
			});

			fx.dirty = false;
		}
	});

	return fx;
}

function getValue<Value>(state: ReactiveState<Value, Value>, fx: ComputedEffect): Value {
	if (ACTIVE.computed != null && fx !== ACTIVE.computed) {
		state.computeds.add(ACTIVE.computed);
	}

	if (ACTIVE.effect != null && ACTIVE.effect !== fx.instance) {
		state.effects.add(ACTIVE.effect);
	}

	if (fx.dirty && BATCH.depth === 0) {
		runEffect(fx.instance);
	}

	return state.value;
}

export function internalComputed<Value>(
	callback: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): [Computed<Value>, ComputedEffect] {
	return getComputed(callback, options);
}

function setAndEmit<Value>(state: ReactiveState<Value, Value>, value: Value): void {
	if (state.equal(state.value, value)) {
		return;
	}

	state.value = value;

	for (const computed of state.computeds) {
		computed.dirty = true;
	}

	for (const effect of state.effects) {
		BATCH.handlers.add(effect);
	}

	for (const [, subscription] of state.subscriptions) {
		subscription.callback(value);
	}

	flushHandlers();
}
