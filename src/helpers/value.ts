import {isPlainObject} from '@oscarpalmer/atoms/is';
import {min, round} from '@oscarpalmer/atoms/math';
import {flushHandlers} from '../batch';
import {
	ACTIVE,
	ARRAY_OFFSET,
	ARRAY_PEEK,
	ARRAY_THRESHOLD,
	BATCH,
	MESSAGE_UPDATE_CALLBACK,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPES,
	SUBSCRIPTION_TYPES_COPY,
	SYMBOL_READONLY,
	SYMBOL_STATE,
} from '../constants';
import type {EffectState, InternalReadonly, InternalStateful, ReactiveState} from '../models';

// #region Types

type SetValue = (instance: InternalStateful, value: unknown, notify: boolean) => void;

// #endregion

// #region Functions

export function emitValue(instance: InternalStateful): void {
	const state = instance[SYMBOL_STATE];

	notifyObservers(state);

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

export function equalArrays(
	first: unknown[],
	second: unknown[],
	equal?: (first: unknown, second: unknown) => boolean,
): boolean {
	const {length} = first;

	if (length !== second.length) {
		return false;
	}

	const eq = equal ?? Object.is;

	let offset = 0;

	if (length >= ARRAY_THRESHOLD) {
		offset = round(length / ARRAY_PEEK);
		offset = min([offset, ARRAY_OFFSET]);

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

export function getJsonValue(this: InternalReadonly | InternalStateful): unknown {
	if (SYMBOL_READONLY in this && !this[SYMBOL_READONLY].active) {
		return this[SYMBOL_READONLY].value;
	}

	return this[SYMBOL_STATE].value;
}

export function getSignalValue(this: InternalStateful): unknown {
	const state = this[SYMBOL_STATE];

	if (state.active) {
		trackSignal(state);
	}

	return state.value;
}

export function getStringValue(this: InternalReadonly | InternalStateful, json?: boolean): string {
	let {value} = this[SYMBOL_STATE];

	if (SYMBOL_READONLY in this && !this[SYMBOL_READONLY].active) {
		value = this[SYMBOL_READONLY].value;
	}

	return json === true ? JSON.stringify(value) : String(value);
}

export function handleSignal(
	instance: InternalStateful,
	origin: unknown,
	setValue: SetValue,
	onAfter?: () => void,
	notify?: boolean,
): void {
	const state = instance[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	try {
		let actual = typeof origin === 'function' ? (origin as () => unknown)() : origin;

		if (actual instanceof Promise) {
			state.promise = actual;

			void actual
				.then(value => {
					if (actual === state.promise) {
						state.promise = undefined;

						setValue(instance, value, notify ?? false);
					}
				})
				.catch(() => {
					if (actual === state.promise) {
						state.promise = undefined;
					}
				});
		} else {
			setValue(instance, actual, notify ?? false);
		}
	} catch {
		// ?
	} finally {
		onAfter?.();
	}
}

export function notifyObservers(state: ReactiveState): void {
	if (state.observers == null) {
		return;
	}

	for (const observer of state.observers) {
		if (observer.computed != null) {
			observer.computed.dirty = true;
		}

		BATCH.handlers.set(observer, observer);
	}
}

export function peekSignalValue(
	this: InternalStateful | [InternalStateful, unknown],
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

export function trackSignal(state: ReactiveState, self?: EffectState): void {
	const observer = ACTIVE.effect;

	if (observer == null || !observer.active || observer === self) {
		return;
	}

	state.observers ??= new Set();

	state.observers.add(observer);

	observer.sources ??= new Set();

	observer.sources.add(state);
}

export function updateSignal(
	instance: InternalStateful,
	callback: (value: unknown) => unknown,
	setValue: (instance: InternalStateful, value: unknown) => void,
): void {
	if (typeof callback !== 'function') {
		throw new TypeError(MESSAGE_UPDATE_CALLBACK);
	}

	if (instance[SYMBOL_STATE].active) {
		handleSignal(instance, callback(instance[SYMBOL_STATE].value), setValue);
	}
}

// #endregion
