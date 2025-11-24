import type {
	ArrayOrPlainObject,
	Key,
	PlainObject,
} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import {PROPERTY_LENGTH} from '../constants';
import type {
	InternalComputed,
	ReactiveState,
	SetValueInProxyParameters,
} from '../models';
import type {ReactiveArray} from '../value/array';
import {type Computed, computed} from '../value/computed';
import type {Store} from '../value/store';
import {emitValue} from './value';

export function emityProxyValues<Value>(
	state: ReactiveState<Value, Value>,
	mapped: Map<Key, Computed<unknown>>,
): void;

export function emityProxyValues<Value>(
	state: ReactiveState<Value[], Value>,
	mapped: Map<Key, Computed<unknown>>,
): void;

export function emityProxyValues(
	state: ReactiveState<unknown, unknown>,
	mapped: Map<Key, Computed<unknown>>,
): void {
	const values = [...mapped.values()];
	const {length} = values;

	for (let index = 0; index < length; index += 1) {
		(values[index] as unknown as InternalComputed).effect.dirty = true;
	}

	emitValue(state);
}

export function getReactiveValueInProxy<Value>(
	array: ReactiveArray<Value>,
	mapped: Map<Key, Computed<unknown>>,
	index: number,
	isArray: true,
): Computed<unknown>;

export function getReactiveValueInProxy<Value extends PlainObject>(
	store: Store<Value>,
	mapped: Map<Key, Computed<unknown>>,
	key: Key,
	isArray: false,
): Computed<unknown>;

export function getReactiveValueInProxy(
	reactive: ReactiveArray<unknown> | Store<PlainObject>,
	mapped: Map<Key, Computed<unknown>>,
	key: Key,
	isArray: boolean,
): Computed<unknown> {
	let item = mapped.get(key);

	if (item == null) {
		item = computed(() =>
			isArray
				? (reactive.get() as unknown[]).at(key as number)
				: (reactive.get() as PlainObject)[key],
		) as Computed<unknown>;

		mapped.set(key, item);
	}

	return item;
}

export function setProxyValue(
	proxy: ArrayOrPlainObject,
	value: ArrayOrPlainObject,
): void {
	startBatch();

	const proxyKeys = Object.keys(proxy);
	const valueKeys = Object.keys(value);

	let {length} = proxyKeys;

	for (let index = 0; index < length; index += 1) {
		const key = proxyKeys[index];

		(proxy as PlainObject)[key] = valueKeys.includes(key)
			? (value as PlainObject)[key]
			: undefined;
	}

	length = valueKeys.length;

	for (let index = 0; index < length; index += 1) {
		const key = valueKeys[index];

		if (!proxyKeys.includes(key)) {
			const keyedValue = (value as PlainObject)[key];

			(proxy as PlainObject)[key] = keyedValue;
		}
	}

	stopBatch();
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
