import {isKey, isPlainObject} from '@oscarpalmer/atoms/is';
import type {GenericCallback, Key, PlainObject} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import {NAME_MORA, NAME_STORE} from '../constants';
import {
	emityProxyValues,
	getReactiveValueInProxy,
	setProxyValue,
	setValueInProxy,
} from '../helpers/proxy';
import {getSimpleValue} from '../helpers/value';
import type {
	Computed,
	ComputedEffect,
	ReactiveOptions,
	ReactiveState,
	ReactiveStore,
	Unsubscribe,
} from '../models';
import {noop, subscribe, unsubscribe} from '../subscription';
import {reactive} from './reactive';

function isStoreObject<Value extends PlainObject>(value: unknown): value is Value | undefined {
	return value == null || isPlainObject(value);
}

function setObject(state: ReactiveState<PlainObject, never>, value: PlainObject | undefined): void {
	startBatch();

	const actual = value ?? {};
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

function setProperty<Value extends PlainObject>(
	state: ReactiveState<Value, Value>,
	key: unknown,
	value: unknown,
): void {
	(state.value as PlainObject)[key as Key] = value;
}

/**
 * Create a reactive store from a function result
 *
 * @param value Initial object value
 * @param options Reactivity options
 * @returns Reactive store
 */
export function store<Value extends PlainObject>(
	value: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): ReactiveStore<Value>;

/**
 * Create a reactive store from a promise
 *
 * @param value Initial object value
 * @param options Reactivity options
 * @returns Reactive store
 */
export function store<Value extends PlainObject>(
	value: Promise<Value>,
	options?: ReactiveOptions<Value>,
): ReactiveStore<Value>;

/**
 * Create a reactive store
 *
 * @param value Initial object value
 * @param options Reactivity options
 * @returns Reactive store
 */
export function store<Value extends PlainObject>(
	value: Value,
	options?: ReactiveOptions<Value>,
): ReactiveStore<Value>;

export function store<Value extends PlainObject>(
	value: Value | (() => Value | Promise<Value>) | Promise<Value>,
	options?: ReactiveOptions<Value>,
): ReactiveStore<Value> {
	const [rx, state] = reactive<Value>(undefined as never, options);

	const keyed = new Map<Key, [Computed<unknown>, ComputedEffect]>();

	state.value = new Proxy({} as Value, {
		set: (target: Value, property: PropertyKey, value: unknown) =>
			setValueInProxy({
				target,
				property,
				state,
				value,
				isArray: false,
			}),
	});

	const instance = {
		...rx,
		get: (value?: unknown): unknown =>
			isKey(value)
				? getReactiveValueInProxy(instance, keyed, value, false).get()
				: getSimpleValue(state),
		notify(): void {
			emityProxyValues(state, keyed);
		},
		peek: (value?: unknown): unknown => (isKey(value) ? state.value[value] : {...state.value}),
		set: (first?: unknown, second?: unknown) => {
			setProxyValue<Value>(
				false,
				state,
				isStoreObject,
				isKey,
				setObject,
				setProperty,
				first,
				second,
			);
		},
		subscribe: (first: Key | GenericCallback, second?: GenericCallback): Unsubscribe => {
			if (isKey(first) && typeof second === 'function') {
				return getReactiveValueInProxy(instance, keyed, first, false).subscribe(second);
			}

			return typeof first === 'function' ? subscribe(state, first) : noop;
		},
		unsubscribe: (first: Key | GenericCallback, second?: GenericCallback) => {
			if (isKey(first) && typeof second === 'function') {
				getReactiveValueInProxy(instance, keyed, first, false)?.unsubscribe(second);
			} else if (typeof first === 'function') {
				unsubscribe(state, first);
			}
		},
		update: (callback: (value: Value) => Value) => {
			const updated = callback(state.value);

			if (updated == null || isPlainObject(updated)) {
				setObject(state, updated);
			}
		},
	};

	Object.defineProperty(instance, NAME_MORA, {
		enumerable: false,
		value: NAME_STORE,
	});

	instance.set(value);

	return Object.freeze(instance) as ReactiveStore<Value>;
}
