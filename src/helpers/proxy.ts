import type {Key, PlainObject} from '@oscarpalmer/atoms/models';
import {PROPERTY_LENGTH} from '../constants';
import type {
	Computed,
	ComputedEffect,
	ReactiveArray,
	ReactiveState,
	ReactiveStore,
	Signal,
} from '../models';
import {internalComputed} from '../value/computed';
import {emitValue} from './value';

// #region Types

type IsObjectCallback<Value> = (value: unknown) => value is Value;

type IsPropertyCallback = (value: unknown) => value is Key;

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

export function emitProxyValues<Value, Item = Value>(
	state: ReactiveState<Value, Item>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
): void {
	const values = [...mapped.values()];
	const {length} = values;

	for (let index = 0; index < length; index += 1) {
		values[index][1].dirty = true;
	}

	emitValue(state);
}

export function getReactiveValueInProxy<Value>(
	reactive: ReactiveArray<Value> | ReactiveStore<Value>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
	key: Key,
	isArray: boolean,
): Computed<unknown> {
	const mapKey = String(key);

	let item = mapped.get(mapKey);

	if (item == null) {
		item = internalComputed(() =>
			isArray
				? (reactive.get() as unknown[]).at(key as number)
				: (reactive.get() as PlainObject)[key],
		);

		mapped.set(mapKey, item);
	}

	return item[0];
}

export function setProxyValue<Value, Item = Value>(
	array: boolean,
	state: ReactiveState<Value, Item>,
	isObject: IsObjectCallback<Value>,
	isProperty: IsPropertyCallback,
	setObject: SetObjectCallback<Value, Item>,
	setProperty: SetPropertyCallback<Value, Item>,
	first?: unknown,
	second?: unknown,
): void {
	if (array && first === PROPERTY_LENGTH) {
		(state.value as unknown[]).length = second as number;

		return;
	}

	if (isObject(first)) {
		setObject(state, first);

		return;
	}

	const property = isProperty(first);

	if (array && property && Number.isNaN(first)) {
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

				if (!property && isObject(value) && state.promise === actual) {
					state.promise = undefined;

					setObject(state, value);
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
	} else if (isObject(actual)) {
		setObject(state, actual);
	}
}

export function setValueInProxy<Value, Item = Value>(
	isArray: boolean,
	state: ReactiveState<Value, Item>,
	target: object,
	property: PropertyKey,
	value: unknown,
	length?: Signal<number>,
): boolean {
	if (isArray) {
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

		if (isArray) {
			length?.set((target as unknown[]).length);
		}
	}

	return true;
}

export function updateProxyValue<Value, Item = Value>(
	array: boolean,
	state: ReactiveState<Value, Item>,
	isObject: IsObjectCallback<Value>,
	isProperty: IsPropertyCallback,
	setObject: SetObjectCallback<Value, Item>,
	setProperty: SetPropertyCallback<Value, Item>,
	callback: unknown,
): void {
	if (typeof callback !== 'function') {
		throw new TypeError('Callback must be a function');
	}

	setProxyValue(array, state, isObject, isProperty, setObject, setProperty, callback(state.value));
}

// #endregion
