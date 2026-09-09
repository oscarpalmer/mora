import {isKey, isPlainObject} from '@oscarpalmer/atoms/is';
import type {GenericCallback, Key, PlainObject} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import {NAME_MORA, NAME_STORE} from '../constants';
import {
	emitProxyValues,
	getReactiveValueInProxy,
	setProxyValue,
	setValueInProxy,
	updateProxyValue,
} from '../helpers/proxy';
import {getSimpleValue} from '../helpers/value';
import type {
	Computed,
	ComputedEffect,
	ReactiveOptions,
	ReactiveState,
	ReactiveStore,
	ReadonlyInstances,
} from '../models';
import {noop, subscribe, unsubscribe} from '../subscription';
import {reactive} from './reactive';
import {getReadonlyInstance} from './readonly';

// #region Functions

function isStoreObject<Value extends PlainObject>(value: unknown): value is Value {
	return value == null || isPlainObject(value);
}

function peekStoreValue<Value extends PlainObject, Item = Value>(
	state: ReactiveState<Value, Item>,
	first?: unknown,
	second?: boolean,
): unknown {
	let value: unknown;

	if (isKey(first)) {
		value = state.value[first];
	} else {
		value = state.value;
	}

	if (!(first === true || second === true)) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.slice();
	}

	if (isPlainObject(value)) {
		return {...value};
	}

	return value;
}

function setPropertyValue<Value extends PlainObject, Item = Value>(
	state: ReactiveState<Value, Item>,
	key: unknown,
	value: unknown,
): void {
	(state.value as PlainObject)[key as Key] = value;
}

function setStoreValue<Value extends PlainObject, Item = Value>(
	state: ReactiveState<Value, Item>,
	value: PlainObject | undefined,
): void {
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

	const isArray = false;
	const keyed = new Map<Key, [Computed<unknown>, ComputedEffect]>();
	const readonlies: ReadonlyInstances<Value> = {};

	let instance: Record<string, GenericCallback> = {};

	state.value = new Proxy({} as Value, {
		set: (target, property, value) => setValueInProxy(isArray, state, target, property, value),
	});

	const handlers = {
		...rx,
		get: (value?: never) =>
			isKey(value)
				? getReactiveValueInProxy(instance as never, keyed, value, isArray).get()
				: getSimpleValue(state),
		peek: (first?: never, second?: never) => peekStoreValue(state, first, second),
		subscribe: (first: never, second?: never) => {
			if (isKey(first) && typeof second === 'function') {
				return getReactiveValueInProxy(instance as never, keyed, first, isArray).subscribe(second);
			}

			return typeof first === 'function' ? subscribe(state, first) : noop;
		},
		unsubscribe: (first: never, second?: never) => {
			if (isKey(first) && typeof second === 'function') {
				getReactiveValueInProxy(instance as never, keyed, first, isArray)?.unsubscribe(second);
			} else if (typeof first === 'function') {
				unsubscribe(state, first);
			}
		},
	};

	instance = {
		...handlers,
		asReadonly: (frozen?: never) =>
			getReadonlyInstance(state, readonlies, handlers, frozen === true),
		notify: () => emitProxyValues(state, keyed),
		set: (first?: never, second?: never) =>
			setProxyValue<Value>(
				isArray,
				state,
				isStoreObject,
				isKey,
				setStoreValue,
				setPropertyValue,
				first,
				second,
			),
		update: (callback: never) =>
			updateProxyValue(
				isArray,
				state,
				isStoreObject,
				isKey,
				setStoreValue,
				setPropertyValue,
				callback,
			),
	};

	Object.defineProperty(instance, NAME_MORA, {
		value: NAME_STORE,
	});

	instance.set(value);

	return Object.freeze(instance) as ReactiveStore<Value>;
}

// #endregion
