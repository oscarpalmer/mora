import type {
	ArrayOrPlainObject,
	Key,
	PlainObject,
} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import type {ReactiveArray} from '../value/array';
import {type Computed, computed} from '../value/computed';
import type {ReactiveState} from '../value/reactive';
import type {Signal} from '../value/signal';
import type {Store} from '../value/store';
import {emitValue} from './value';

export function getReactiveValueInProxy<Value>(
	array: ReactiveArray<Value>,
	mapped: Map<Key, Computed<unknown>>,
	index: number,
	isArray: true,
): unknown;

export function getReactiveValueInProxy<Value extends PlainObject>(
	store: Store<Value>,
	mapped: Map<Key, Computed<unknown>>,
	key: Key,
	isArray: false,
): unknown;

export function getReactiveValueInProxy(
	reactive: ReactiveArray<unknown> | Store<PlainObject>,
	mapped: Map<Key, Computed<unknown>>,
	key: Key,
	isArray: boolean,
): unknown {
	let item = mapped.get(key);

	if (item == null) {
		item = computed(() => {
			const value = reactive.get();

			return isArray
				? (value as unknown[]).at(key as number)
				: (value as PlainObject)[key];
		}) as Computed<unknown>;

		mapped.set(key, item);
	}

	return item.get();
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
	target: Value,
	property: PropertyKey,
	value: unknown,
	state: ReactiveState<Value, Equal>,
	isArray: boolean,
	length?: Signal<number>,
): boolean {
	if (isArray) {
		const isIndex = !Number.isNaN(Number(property));
		const isLength = property === 'length';

		if (!isIndex && !isLength) {
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
