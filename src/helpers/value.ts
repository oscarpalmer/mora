import {flushHandlers} from '../batch';
import {ACTIVE, ARRAY_OFFSET, ARRAY_PEEK, ARRAY_THRESHOLD, BATCH} from '../constants';
import type {ReactiveState} from '../models';

export function emitValue<Value>(state: ReactiveState<Value, never>): void {
	for (const computed of state.computeds) {
		computed.dirty = true;
	}

	for (const effect of state.effects) {
		BATCH.handlers.add(effect);
	}

	for (const [, subscription] of state.subscriptions) {
		BATCH.handlers.add(subscription);
	}

	if (BATCH.depth === 0) {
		flushHandlers();
	}
}

export function equalArrays<Value>(
	state: ReactiveState<Value[], Value>,
	first: Value[],
	second: Value[],
): boolean {
	let {length} = first;

	if (length !== second.length) {
		return false;
	}

	let offset = 0;

	if (length >= ARRAY_THRESHOLD) {
		offset = Math.round(length / ARRAY_PEEK);
		offset = offset > ARRAY_OFFSET ? ARRAY_OFFSET : offset;

		for (let index = 0; index < offset; index += 1) {
			if (!state.equal(first[index], second[index])) {
				return false;
			}
		}
	}

	length -= offset;

	for (let index = offset; index < length; index += 1) {
		if (!state.equal(first[index], second[index])) {
			return false;
		}
	}

	return true;
}

export function getSimpleValue<Value>(state: ReactiveState<Value, never>): Value {
	if (ACTIVE.computed != null) {
		state.computeds.add(ACTIVE.computed);
	}

	if (ACTIVE.effect != null) {
		state.effects.add(ACTIVE.effect);
	}

	return state.value;
}

export function handleSimpleValue<Value>(
	state: ReactiveState<Value, Value>,
	origin: Value | (() => Value | Promise<Value>) | Promise<Value>,
	setValue: (state: ReactiveState<Value, Value>, value: Value) => void,
	onAfter?: () => void,
): void {
	try {
		let actual = typeof origin === 'function' ? (origin as () => unknown)() : origin;

		if (actual instanceof Promise) {
			state.promise = actual;

			void actual
				.then(value => {
					if (actual === state.promise) {
						state.promise = undefined;

						setValue(state, value);
					}
				})
				.catch(() => {
					if (actual === state.promise) {
						state.promise = undefined;
					}
				});
		} else {
			setValue(state, actual as Value);
		}
	} catch {
		// ?
	} finally {
		onAfter?.();
	}
}
