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
	SYMBOL_STATE,
} from '../constants';
import type {ReactiveState, InternalSignal} from '../models';

// #region Functions

export function emitValue(instance: InternalSignal): void {
	const state = instance[SYMBOL_STATE];

	if (state.computeds != null && state.computeds.size > 0) {
		for (const computed of state.computeds) {
			computed.dirty = true;
		}
	}

	if (state.effects != null && state.effects.size > 0) {
		for (const effect of state.effects) {
			BATCH.handlers.set(effect, effect);
		}
	}

	for (const type of SUBSCRIPTION_TYPES) {
		const subscriptions = state.subscriptions?.values.to.keyed?.get(type);

		if (subscriptions != null && subscriptions.size > 0) {
			for (const [subscription, callback] of subscriptions) {
				BATCH.handlers.set(subscription, {
					callback,
					instance,
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

export function equalArrays(state: ReactiveState, first: unknown[], second: unknown[]): boolean {
	const {length} = first;

	if (length !== second.length) {
		return false;
	}

	const eq = state.equal ?? Object.is;

	let offset = 0;

	if (length >= ARRAY_THRESHOLD) {
		offset = Math.round(length / ARRAY_PEEK);
		offset = offset > ARRAY_OFFSET ? ARRAY_OFFSET : offset;

		for (let index = 0; index < offset; index += 1) {
			if (
				!(
					eq(first[index], second[index]) &&
					eq(first[length - index - 1], second[length - index - 1])
				)
			) {
				return false;
			}
		}
	}

	const end = length - offset;

	for (let index = offset; index < end; index += 1) {
		if (!eq(first[index], second[index])) {
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

export function getSignalValue(this: InternalSignal): unknown {
	if (ACTIVE.computed != null) {
		this[SYMBOL_STATE].computeds ??= new Set();

		this[SYMBOL_STATE].computeds.add(ACTIVE.computed);
	}

	if (ACTIVE.effect != null) {
		this[SYMBOL_STATE].effects ??= new Set();

		this[SYMBOL_STATE].effects.add(ACTIVE.effect);
	}

	return this[SYMBOL_STATE].value;
}

export function getStringValue(this: InternalSignal, json?: boolean): string {
	return json === true
		? JSON.stringify(this[SYMBOL_STATE].value)
		: String(this[SYMBOL_STATE].value);
}

export function handleSignalValue(
	instance: InternalSignal,
	origin: unknown,
	setValue: (instance: InternalSignal, value: unknown) => void,
	onAfter?: () => void,
): void {
	const state = instance[SYMBOL_STATE];

	try {
		let actual = typeof origin === 'function' ? (origin as () => unknown)() : origin;

		if (actual instanceof Promise) {
			state.promise = actual;

			void actual
				.then(value => {
					if (actual === state.promise) {
						state.promise = undefined;

						setValue(instance, value);
					}
				})
				.catch(() => {
					if (actual === state.promise) {
						state.promise = undefined;
					}
				});
		} else {
			setValue(instance, actual);
		}
	} catch {
		// ?
	} finally {
		onAfter?.();
	}
}

export function peekSignalValue(
	this: InternalSignal | [InternalSignal, unknown],
	copy?: boolean,
): unknown {
	let peeked: unknown = Array.isArray(this) ? this[1] : this[SYMBOL_STATE].value;

	if (copy !== true) {
		return peeked;
	}

	if (Array.isArray(peeked)) {
		peeked = peeked.slice();
	} else if (isPlainObject(peeked)) {
		peeked = {...peeked};
	}

	return peeked;
}

export function updateSignalValue(
	instance: InternalSignal,
	callback: (value: unknown) => unknown,
	setValue: (instance: InternalSignal, value: unknown) => void,
): void {
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}

	handleSignalValue(instance, callback(instance[SYMBOL_STATE].value), setValue);
}

// #endregion
