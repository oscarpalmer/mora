import {isKey, isNumerical, isPlainObject} from '@oscarpalmer/atoms/is';
import type {
	ArrayOrPlainObject,
	GenericCallback,
	Key,
	PlainObject,
} from '@oscarpalmer/atoms/models';
import {getString} from '@oscarpalmer/atoms/string';
import {startBatch, stopBatch} from '../batch';
import {MESSAGE_UPDATE_CALLBACK, PROPERTY_LENGTH, SYMBOL_STATE} from '../constants';
import type {InternalArray, InternalComputed, InternalStore, ReactiveProxyState} from '../models';
import {getComputed} from '../value/computed';
import {copyValue, emitValue, equalArrays, getCopySource, getSignalValue, isPromise} from './value';

// #region Functions

export function deleteValueInProxy(
	instance: InternalStore,
	target: object,
	property: PropertyKey,
): boolean {
	if (instance[SYMBOL_STATE].active && Object.hasOwn(target, property)) {
		Reflect.deleteProperty(target, property);

		emitValue(instance);
	}

	return true;
}

export function emitProxyValue(instance: InternalArray | InternalStore): void {
	const state = instance[SYMBOL_STATE];

	if (state.length == null) {
		emitValue(instance);

		return;
	}

	startBatch();

	emitValue(instance);

	state.length.set((state.target as unknown[]).length);

	stopBatch();
}

export function getReactiveValueInProxy(
	instance: InternalArray | InternalStore,
	key: Key,
): InternalComputed {
	const state = instance[SYMBOL_STATE];

	state.mapped ??= new Map();

	const mapKey = getString(key);

	let item = state.mapped.get(mapKey);

	if (item == null) {
		// Owned by the array/store, as it's cached, and may be created inside a (re-running) effect
		item = getComputed(
			() => {
				// Tracks the whole array/store, but reads the key from its target
				getSignalValue.call(instance);

				return getTargetValue(state, key);
			},
			undefined,
			state,
		);

		state.mapped.set(mapKey, item);
	}

	return item;
}

function getTargetValue(state: ReactiveProxyState, key: Key): unknown {
	return state.isArray
		? (state.target as unknown[]).at(key as number)
		: (state.target as PlainObject)[key];
}

export function getValueInProxy(this: InternalArray | InternalStore, first?: unknown): unknown {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return peekValueInProxy.call(this, first);
	}

	if (state.isArray ? typeof first === 'number' : isKey(first)) {
		return getReactiveValueInProxy(this, first as Key).get();
	}

	return getSignalValue.call(this);
}

function isProxyKey(isArray: boolean, value: unknown): value is Key {
	return (isArray && typeof value === 'number') || isKey(value);
}

function isProxyObject(isArray: boolean, value: unknown): value is ArrayOrPlainObject {
	return value == null || (isArray ? Array.isArray(value) : isPlainObject(value));
}

export function notifyProxyValue(this: InternalArray | InternalStore): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	// Keyed computeds observe the array/store, so the emit marks them; `notify` makes them emit even if equal
	if (state.mapped != null) {
		for (const item of state.mapped.values()) {
			item[SYMBOL_STATE].notify = true;
		}
	}

	emitValue(this);
}

export function peekValueInProxy(
	this: InternalArray | InternalStore,
	first?: unknown,
	second?: boolean,
): unknown {
	const state = this[SYMBOL_STATE];
	const copy = first === true || second === true;

	let value: unknown;

	if (state.isArray ? typeof first === 'number' : isKey(first)) {
		value = getTargetValue(state, first as Key);
	} else {
		value = copy ? getCopySource(state) : state.value;
	}

	return copyValue(value, copy);
}

function setProxyItems(instance: InternalArray, items: unknown[]): void {
	const state = instance[SYMBOL_STATE];
	const target = state.target as unknown[];

	if (equalArrays(target, items, state.equal)) {
		return;
	}

	const {length} = items;

	// Copied item by item, as spreading a large array into `splice` overflows the call stack
	target.length = length;

	for (let index = 0; index < length; index += 1) {
		target[index] = items[index];
	}

	emitProxyValue(instance);
}

function setProxyObject(instance: InternalArray | InternalStore, value: unknown): void {
	const state = instance[SYMBOL_STATE];

	if (state.isArray) {
		setProxyItems(instance as InternalArray, (value ?? []) as unknown[]);

		return;
	}

	startBatch();

	// Written through the proxy, so each key is compared (and emitted) on its own
	const current = state.value as PlainObject;
	const next = (value as Record<string, unknown>) ?? {};

	const currentKeys = Object.keys(state.target);
	const nextKeys = Object.keys(next);

	let {length} = currentKeys;

	for (let index = 0; index < length; index += 1) {
		const key = currentKeys[index];

		if (!Object.hasOwn(next, key)) {
			delete current[key];
		}
	}

	length = nextKeys.length;

	for (let index = 0; index < length; index += 1) {
		const key = nextKeys[index];

		current[key] = next[key];
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

	if (!state.active) {
		return;
	}

	if (state.isArray && first === PROPERTY_LENGTH) {
		(state.value as unknown[]).length = second as number;

		return;
	}

	if (isProxyObject(state.isArray, first)) {
		setProxyObject(this, first);

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

	if (isPromise(actual)) {
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

					setProxyObject(this, value);
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
		setProxyObject(this, actual);
	}
}

export function setValueInProxy(
	instance: InternalArray | InternalStore,
	target: object,
	property: PropertyKey,
	value: unknown,
): boolean {
	const state = instance[SYMBOL_STATE];

	if (!state.active) {
		return true;
	}

	if (state.isArray) {
		const isIndex = isNumerical(property);
		const isLength = property === PROPERTY_LENGTH;

		if (!(isIndex || isLength)) {
			return Reflect.set(target, property, value);
		}
	}

	const previous = Reflect.get(target, property);

	if (!(state.equal ?? Object.is)(previous, value)) {
		Reflect.set(target, property, value);

		emitProxyValue(instance);
	}

	return true;
}

export function updateProxyValue(this: InternalArray | InternalStore, callback: unknown): void {
	if (typeof callback !== 'function') {
		throw new TypeError(MESSAGE_UPDATE_CALLBACK);
	}

	if (this[SYMBOL_STATE].active) {
		setProxyValue.call(this, callback(this[SYMBOL_STATE].value));
	}
}

// #endregion
