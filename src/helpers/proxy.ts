import {isKey, isPlainObject} from '@oscarpalmer/atoms/is';
import type {ArrayOrPlainObject, Key, PlainObject} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import {PROPERTY_LENGTH, SYMBOL_STATE} from '../constants';
import type {
	Computed,
	ReactiveArray,
	ReactiveProxyState,
	ReactiveStore,
	InternalProxy,
} from '../models';
import {internalComputed} from '../value/computed';
import {emitValue, getSignalValue, peekSignalValue} from './value';

// #region Functions

export function emitProxyValues(this: InternalProxy): void {
	const state = this[SYMBOL_STATE];

	state.mapped ??= new Map();

	const values = [...state.mapped.values()];
	const {length} = values;

	for (let index = 0; index < length; index += 1) {
		values[index][1].dirty = true;
	}

	emitValue(this);
}

export function getReactiveValueInProxy(
	instance: ReactiveArray<unknown> | ReactiveStore<unknown>,
	key: Key,
): Computed<unknown> {
	const state = (instance as unknown as InternalProxy)[SYMBOL_STATE];

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

	return item[0];
}

export function getValueInProxy(this: InternalProxy, first?: unknown): unknown {
	if (this[SYMBOL_STATE].isArray ? typeof first === 'number' : isKey(first)) {
		return getReactiveValueInProxy(this as never, first as Key).get();
	}

	return getSignalValue.call(this);
}

function isProxyObject(isArray: boolean, value: unknown): value is ArrayOrPlainObject {
	return value == null || (isArray ? Array.isArray(value) : isPlainObject(value));
}

export function peekValueInProxy(this: InternalProxy, first?: unknown, second?: boolean): unknown {
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
		(state.value as unknown[]).splice(
			0,
			(state.value as unknown[]).length,
			...((value ?? []) as unknown[]),
		);

		return;
	}

	startBatch();

	const actual = (value as Record<string, unknown>) ?? {};
	const proxy = state.value as PlainObject;

	const proxyKeys = Object.keys(proxy);
	const actualKeys = Object.keys(actual);

	let {length} = proxyKeys;

	for (let index = 0; index < length; index += 1) {
		const key = proxyKeys[index];

		proxy[key] = actualKeys.includes(key) ? actual[key] : undefined;
	}

	length = actualKeys.length;

	for (let index = 0; index < length; index += 1) {
		const key = actualKeys[index];

		if (!proxyKeys.includes(key)) {
			const keyedValue = actual[key];

			proxy[key] = keyedValue;
		}
	}

	stopBatch();
}

function setProxyProperty(state: ReactiveProxyState, property: unknown, value: unknown): void {
	if (!state.isArray) {
		(state.value as PlainObject)[property as Key] = value;

		return;
	}

	const actual =
		(property as number) < 0
			? (state.value as unknown[]).length + (property as number)
			: (property as number);

	if (actual > -1) {
		(state.value as unknown[])[actual] = value;
	}
}

export function setProxyValue(this: InternalProxy, first?: unknown, second?: unknown): void {
	const state = this[SYMBOL_STATE] as ReactiveProxyState;

	if (state.isArray && first === PROPERTY_LENGTH) {
		(state.value as unknown[]).length = second as number;

		return;
	}

	if (isProxyObject(state.isArray, first)) {
		setProxyObject(state, first);

		return;
	}

	const property = state.isArray ? typeof first === 'number' : isKey(first);

	if (state.isArray && property && Number.isNaN(first)) {
		return;
	}

	let actual = property ? second : first;

	if (typeof actual === 'function') {
		try {
			actual = (actual as Function)();
		} catch {
			return;
		}
	}

	if (actual instanceof Promise) {
		if (property) {
			state.promises ??= new Map();

			state.promises.set(first as Key, actual as Promise<never>);
		} else {
			state.promise = actual as Promise<never>;
		}

		void actual
			.then(value => {
				if (property && state.promises!.get(first as Key) === actual) {
					state.promises!.delete(first as Key);

					setProxyProperty(state, first, value);

					return;
				}

				if (!property && isProxyObject(state.isArray, value) && state.promise === actual) {
					state.promise = undefined;

					setProxyObject(state, value);
				}
			})
			.catch(() => {
				if (property && state.promises!.get(first as Key) === actual) {
					state.promises!.delete(first as Key);
				} else if (!property && state.promise === actual) {
					state.promise = undefined;
				}
			});
	} else if (property) {
		setProxyProperty(state, first, actual);
	} else if (isProxyObject(state.isArray, actual)) {
		setProxyObject(state, actual);
	}
}

export function setValueInProxy(
	instance: InternalProxy,
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

	const previous = Reflect.get(target as object, property);

	if (!(state.equal ?? Object.is)(previous as never, value as never)) {
		Reflect.set(target, property, value);

		emitValue(instance);

		if (state.isArray) {
			state.length?.set((target as unknown[]).length);
		}
	}

	return true;
}

export function updateProxyValue(this: InternalProxy, callback: unknown): void {
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}

	setProxyValue.call(this, callback(this[SYMBOL_STATE].value));
}

// #endregion
