import {isKey, isPlainObject} from '@oscarpalmer/atoms/is';
import type {
	ArrayOrPlainObject,
	GenericCallback,
	Key,
	PlainObject,
} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import {PROPERTY_LENGTH, SYMBOL_EFFECT, SYMBOL_STATE} from '../constants';
import type {InternalArray, InternalComputed, InternalStore, ReactiveProxyState} from '../models';
import {internalComputed} from '../value/computed';
import {emitValue, getSignalValue, peekSignalValue} from './value';

// #region Functions

export function getReactiveValueInProxy(
	instance: InternalArray | InternalStore,
	key: Key,
): InternalComputed {
	const state = instance[SYMBOL_STATE];

	state.mapped ??= new Map();

	const mapKey = String(key);

	let item = state.mapped.get(mapKey);

	if (item == null) {
		item = internalComputed(() =>
			state.isArray
				? (instance.get() as unknown[]).at(key as number)
				: (instance.get() as PlainObject)[key],
		);

		state.mapped.set(mapKey, item);
	}

	return item;
}

export function getValueInProxy(this: InternalArray | InternalStore, first?: unknown): unknown {
	let signal: InternalComputed | undefined;

	if (this[SYMBOL_STATE].isArray ? typeof first === 'number' : isKey(first)) {
		signal = getReactiveValueInProxy(this, first as Key);
	}

	return getSignalValue.call(signal ?? this);
}

function isProxyKey(isArray: boolean, value: unknown): value is Key {
	return isArray ? typeof value === 'number' : isKey(value);
}

function isProxyObject(isArray: boolean, value: unknown): value is ArrayOrPlainObject {
	return value == null || (isArray ? Array.isArray(value) : isPlainObject(value));
}

export function notifyProxyValue(this: InternalArray | InternalStore): void {
	const state = this[SYMBOL_STATE];

	state.mapped ??= new Map();

	const values = [...state.mapped.values()];
	const {length} = values;

	for (let index = 0; index < length; index += 1) {
		values[index][SYMBOL_EFFECT].dirty = true;
		values[index][SYMBOL_EFFECT].notify = true;
	}

	emitValue(this, true);
}

export function peekValueInProxy(
	this: InternalArray | InternalStore,
	first?: unknown,
	second?: boolean,
): unknown {
	const state = this[SYMBOL_STATE];

	let value: unknown;

	if (state.isArray ? typeof first === 'number' : isKey(first)) {
		value = state.isArray
			? (state.value as unknown[]).at(first as number)
			: (state.value as PlainObject)[first as Key];
	} else {
		value = state.value;
	}

	return peekSignalValue.call([this, value], first === true || second === true);
}

function setProxyObject(state: ReactiveProxyState, value: unknown): void {
	if (state.isArray) {
		const values = state.value as unknown[];

		values.splice(0, values.length, ...((value ?? []) as unknown[]));

		return;
	}

	startBatch();

	const current = state.value as PlainObject;
	const next = (value as Record<string, unknown>) ?? {};

	const currentKeys = Object.keys(current);
	const nextKeys = Object.keys(next);

	let {length} = currentKeys;

	for (let index = 0; index < length; index += 1) {
		const key = currentKeys[index];

		current[key] = nextKeys.includes(key) ? next[key] : undefined;
	}

	length = nextKeys.length;

	for (let index = 0; index < length; index += 1) {
		const key = nextKeys[index];

		if (!currentKeys.includes(key)) {
			const keyedValue = next[key];

			current[key] = keyedValue;
		}
	}

	stopBatch();
}

function setProxyProperty(state: ReactiveProxyState, property: unknown, value: unknown): void {
	if (!state.isArray) {
		(state.value as PlainObject)[property as Key] = value;

		return;
	}

	const array = state.value as unknown[];
	const index = property as number;

	const actual = index < 0 ? array.length + index : index;

	if (actual > -1) {
		array[actual] = value;
	}
}

export function setProxyValue(
	this: InternalArray | InternalStore,
	first?: unknown,
	second?: unknown,
): void {
	const state = this[SYMBOL_STATE];

	if (state.isArray && first === PROPERTY_LENGTH) {
		(state.value as unknown[]).length = second as number;

		return;
	}

	if (isProxyObject(state.isArray, first)) {
		setProxyObject(state, first);

		return;
	}

	const keyed = isProxyKey(state.isArray, first);

	if (state.isArray && keyed && Number.isNaN(first)) {
		return;
	}

	let actual = keyed ? second : first;

	if (typeof actual === 'function') {
		try {
			actual = (actual as GenericCallback)();
		} catch {
			return;
		}
	}

	if (actual instanceof Promise) {
		if (keyed) {
			state.promises ??= new Map();

			state.promises.set(first, actual as Promise<never>);
		} else {
			state.promise = actual as Promise<never>;
		}

		void actual
			.then(value => {
				if (keyed && state.promises?.get(first) === actual) {
					state.promises?.delete(first);

					setProxyProperty(state, first, value);

					return;
				}

				if (!keyed && isProxyObject(state.isArray, value) && state.promise === actual) {
					state.promise = undefined;

					setProxyObject(state, value);
				}
			})
			.catch(() => {
				if (keyed && state.promises?.get(first) === actual) {
					state.promises?.delete(first);
				} else if (!keyed && state.promise === actual) {
					state.promise = undefined;
				}
			});
	} else if (keyed) {
		setProxyProperty(state, first, actual);
	} else if (isProxyObject(state.isArray, actual)) {
		setProxyObject(state, actual);
	}
}

export function setValueInProxy(
	instance: InternalArray | InternalStore,
	target: object,
	property: PropertyKey,
	value: unknown,
): boolean {
	const state = instance[SYMBOL_STATE];

	if (state.isArray) {
		const isIndex = !Number.isNaN(Number(property));
		const isLength = property === PROPERTY_LENGTH;

		if (!(isIndex || isLength)) {
			return Reflect.set(target, property, value);
		}
	}

	const previous = Reflect.get(target, property);

	if (!(state.equal ?? Object.is)(previous, value)) {
		Reflect.set(target, property, value);

		emitValue(instance);

		if (state.isArray) {
			state.length?.set((target as unknown[]).length);
		}
	}

	return true;
}

export function updateProxyValue(this: InternalArray | InternalStore, callback: unknown): void {
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}

	setProxyValue.call(this, callback(this[SYMBOL_STATE].value));
}

// #endregion
