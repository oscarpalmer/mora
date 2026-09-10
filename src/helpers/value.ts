import {isPlainObject} from '@oscarpalmer/atoms/is';
import {flushHandlers} from '../batch';
import {
	ACTIVE,
	ARRAY_OFFSET,
	ARRAY_PEEK,
	ARRAY_THRESHOLD,
	BATCH,
	SUBSCRIPTION_TYPES_COPY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPES,
} from '../constants';
import type {ReactiveState} from '../models';

// #region Functions

export function emitValue<Value>(state: ReactiveState<Value, never>): void {
	for (const computed of state.computeds) {
		computed.dirty = true;
	}

	for (const effect of state.effects) {
		BATCH.handlers.set(effect, effect);
	}

	for (const type of SUBSCRIPTION_TYPES) {
		const subscriptions = state.subscriptions?.values.to.keyed?.get(type);

		if (subscriptions != null) {
			for (const [subscription, callback] of subscriptions) {
				BATCH.handlers.set(subscription, {
					callback,
					state,
					frozen: type === SUBSCRIPTION_TYPE_FROZEN,
					copy: SUBSCRIPTION_TYPES_COPY.has(type),
				});
			}
		}
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

export function getFrozenValue(value: unknown): unknown {
	let frozen = value;

	if (Array.isArray(frozen)) {
		frozen = Object.freeze(frozen.slice());
	} else if (isPlainObject(frozen)) {
		frozen = Object.freeze({...frozen});
	}

	return frozen;
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

export function peekSimpleValue(value: unknown, copy: boolean): unknown {
	let peeked: unknown = value;

	if (!copy) {
		return peeked;
	}

	if (Array.isArray(peeked)) {
		peeked = peeked.slice();
	} else if (isPlainObject(peeked)) {
		peeked = {...peeked};
	}

	return peeked;
}

export function updateSimpleValue<Value>(
	state: ReactiveState<Value, Value>,
	callback: (value: Value) => Value,
	setValue: (state: ReactiveState<Value, Value>, value: Value) => void,
): void {
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}

	handleSimpleValue(state, callback(state.value), setValue);
}

// #endregion
