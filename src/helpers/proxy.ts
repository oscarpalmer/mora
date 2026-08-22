import type {ArrayOrPlainObject, Key, PlainObject} from '@oscarpalmer/atoms/models';
import {PROPERTY_LENGTH} from '../constants';
import type {
	Computed,
	ComputedEffect,
	ReactiveArray,
	ReactiveState,
	ReactiveStore,
	SetValueInProxyParameters,
} from '../models';
import {internalComputed} from '../value/computed';
import {emitValue} from './value';

export function emityProxyValues<Value>(
	state: ReactiveState<Value, Value>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
): void;

export function emityProxyValues<Value>(
	state: ReactiveState<Value[], Value>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
): void;

export function emityProxyValues(
	state: ReactiveState<unknown, unknown>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
): void {
	const values = [...mapped.values()];
	const {length} = values;

	for (let index = 0; index < length; index += 1) {
		values[index][1].dirty = true;
	}

	emitValue(state);
}

export function getReactiveValueInProxy<Value, Result = Value>(
	array: ReactiveArray<Value>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
	index: number,
	isArray: true,
): Computed<Result>;

export function getReactiveValueInProxy<Value extends PlainObject>(
	store: ReactiveStore<Value>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
	key: Key,
	isArray: false,
): Computed<unknown>;

export function getReactiveValueInProxy(
	reactive: ReactiveArray<unknown> | ReactiveStore<PlainObject>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
	key: Key,
	isArray: boolean,
): Computed<unknown> {
	let item = mapped.get(key);

	if (item == null) {
		item = internalComputed(() =>
			isArray
				? (reactive.get() as unknown[]).at(key as number)
				: (reactive.get() as PlainObject)[key],
		);

		mapped.set(key, item);
	}

	return item[0];
}

export function setProxyValue<Value, Item = Value>(
	array: boolean,
	state: ReactiveState<Value, Item>,
	isObject: (value: unknown) => value is Value | undefined,
	isProperty: (value: unknown) => boolean,
	setObject: (state: ReactiveState<Value, Item>, value: Value | undefined) => void,
	setProperty: (state: ReactiveState<Value, Item>, property: unknown, value: Item) => void,
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

export function setValueInProxy<Value extends ArrayOrPlainObject, Equal>(
	parameters: SetValueInProxyParameters<Value, Equal>,
): boolean {
	const {isArray, length, property, state, target, value} = parameters;

	if (isArray) {
		const isIndex = !Number.isNaN(Number(property));
		const isLength = property === PROPERTY_LENGTH;

		if (!(isIndex || isLength)) {
			return Reflect.set(target, property, value);
		}
	}

	const previous = Reflect.get(target, property);

	if (!state.equal(previous as never, value as never)) {
		Reflect.set(target, property, value);

		emitValue(state);

		if (isArray) {
			length?.set((target as unknown[]).length);
		}
	}

	return true;
}
