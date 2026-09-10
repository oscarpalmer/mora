import type {Key, PlainObject} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import {NAME_MORA, NAME_STORE} from '../constants';
import {
	emitProxyValues,
	getValueInProxy,
	peekValueInProxy,
	setProxyValue,
	setValueInProxy,
	updateProxyValue,
} from '../helpers/proxy';
import {subscribeToProxy} from '../helpers/subscription';
import type {
	Computed,
	ComputedEffect,
	ReactiveOptions,
	ReactiveState,
	ReactiveStore,
	ReadonlyInstances,
} from '../models';
import {reactive} from './reactive';
import {getReadonlyInstance} from './readonly';

// #region Functions

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

	state.value = new Proxy({} as Value, {
		set: (target, property, value) => setValueInProxy(isArray, state, target, property, value),
	});

	const instance = {
		...rx,
		asReadonly: (frozen?: never) => getReadonlyInstance(state, readonlies, frozen === true),
		get: (value?: never) => getValueInProxy(isArray, instance as never, state, keyed, value),
		notify: () => emitProxyValues(state, keyed),
		peek: (first?: never, second?: never) => peekValueInProxy(isArray, state, first, second),
		set: (first?: never, second?: never) =>
			setProxyValue<Value>(isArray, state, setStoreValue, setPropertyValue, first, second),
		subscribe: (first: never, second?: never, third?: never) =>
			subscribeToProxy(isArray, instance as never, state, keyed, first, second, third),
		update: (callback: never) =>
			updateProxyValue(isArray, state, setStoreValue, setPropertyValue, callback),
	};

	Object.defineProperty(instance, NAME_MORA, {
		value: NAME_STORE,
	});

	instance.set(value as never);

	return Object.freeze(instance) as never;
}

// #endregion
