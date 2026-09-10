import {isKey, isPlainObject} from '@oscarpalmer/atoms/is';
import type {ArrayOrPlainObject, Key, PlainObject} from '@oscarpalmer/atoms/models';
import {PROPERTY_LENGTH} from '../constants';
import type {
	Computed,
	ReactiveArray,
	ReactiveProxyState,
	ReactiveState,
	ReactiveStore,
} from '../models';
import {internalComputed} from '../value/computed';
import {emitValue, getSimpleValue, peekSimpleValue} from './value';

// #region Types

type SetObjectCallback<Value, Item> = (
	state: ReactiveState<Value, Item>,
	value: Value | undefined,
) => void;

type SetPropertyCallback<Value, Item> = (
	state: ReactiveState<Value, Item>,
	property: unknown,
	value: Item,
) => void;

// #endregion

// #region Functions

export function emitProxyValues<Value, Item = Value>(state: ReactiveProxyState<Value, Item>): void {
	state.mapped ??= new Map();

	const values = [...state.mapped.values()];
	const {length} = values;

	for (let index = 0; index < length; index += 1) {
		values[index][1].dirty = true;
	}

	emitValue(state);
}

export function getReactiveValueInProxy<Value, Item = Value>(
	reactive: ReactiveArray<Value> | ReactiveStore<Value>,
	state: ReactiveProxyState<Value, Item>,
	key: Key,
): Computed<unknown> {
	state.mapped ??= new Map();

	const mapKey = String(key);

	let item = state.mapped.get(mapKey);

	if (item == null) {
		item = internalComputed(() =>
			state.isArray
				? (reactive.get() as unknown[]).at(key as number)
				: (reactive.get() as PlainObject)[key],
		);

		state.mapped.set(mapKey, item);
	}

	return item[0];
}

export function getValueInProxy<Value, Item = Value>(
	instance: ReactiveArray<Value> | ReactiveStore<Value>,
	state: ReactiveProxyState<Value, Item>,
	first?: unknown,
): unknown {
	if (state.isArray ? typeof first === 'number' : isKey(first)) {
		return getReactiveValueInProxy(instance, state, first as Key).get();
	}

	return getSimpleValue(state);
}

function isProxyObject(isArray: boolean, value: unknown): value is ArrayOrPlainObject {
	return value == null || (isArray ? Array.isArray(value) : isPlainObject(value));
}

export function peekValueInProxy<Value, Item = Value>(
	state: ReactiveProxyState<Value, Item>,
	first?: unknown,
	second?: boolean,
): unknown {
	let value: unknown;

	if (state.isArray ? typeof first === 'number' : isKey(first)) {
		value = state.isArray
			? (state.value as unknown[]).at(first as number)
			: (state.value as PlainObject)[first as Key];
	} else {
		value = state.value;
	}

	return peekSimpleValue(value, first === true || second === true);
}

export function setProxyValue<Value, Item = Value>(
	state: ReactiveProxyState<Value, Item>,
	setObject: SetObjectCallback<Value, Item>,
	setProperty: SetPropertyCallback<Value, Item>,
	first?: unknown,
	second?: unknown,
): void {
	if (state.isArray && first === PROPERTY_LENGTH) {
		(state.value as unknown[]).length = second as number;

		return;
	}

	if (isProxyObject(state.isArray, first)) {
		setObject(state, first as Value);

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

					setProperty(state, first, value);

					return;
				}

				if (!property && isProxyObject(state.isArray, value) && state.promise === actual) {
					state.promise = undefined;

					setObject(state, value as Value);
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
		setProperty(state, first, actual as Item);
	} else if (isProxyObject(state.isArray, actual)) {
		setObject(state, actual as Value);
	}
}

export function setValueInProxy<Value, Item = Value>(
	state: ReactiveProxyState<Value, Item>,
	target: object,
	property: PropertyKey,
	value: unknown,
): boolean {
	if (state.isArray) {
		const isIndex = !Number.isNaN(Number(property));
		const isLength = property === PROPERTY_LENGTH;

		if (!(isIndex || isLength)) {
			return Reflect.set(target, property, value);
		}
	}

	const previous = Reflect.get(target as object, property);

	if (!state.equal(previous as never, value as never)) {
		Reflect.set(target, property, value);

		emitValue(state);

		if (state.isArray) {
			state.length?.set((target as unknown[]).length);
		}
	}

	return true;
}

export function updateProxyValue<Value, Item = Value>(
	state: ReactiveProxyState<Value, Item>,
	setObject: SetObjectCallback<Value, Item>,
	setProperty: SetPropertyCallback<Value, Item>,
	callback: unknown,
): void {
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}

	setProxyValue(state, setObject, setProperty, callback(state.value));
}

// #endregion
