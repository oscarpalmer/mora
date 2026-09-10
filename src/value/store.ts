import type {Key, PlainObject} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import {NAME_MORA, NAME_STORE, SYMBOL_STATE} from '../constants';
import {getState} from '../helpers/misc';
import {
	emitProxyValues,
	getValueInProxy,
	peekValueInProxy,
	setProxyValue,
	setValueInProxy,
	updateProxyValue,
} from '../helpers/proxy';
import {subscribeToProxy} from '../helpers/subscription';
import {getStringValue} from '../helpers/value';
import type {ReactiveOptions, ReactiveState, ReactiveStore} from '../models';
import {getReadonlyInstance} from './readonly';

// #region Instance

function ReactiveStore<Value extends PlainObject>(
	this: any,
	value: never,
	options?: ReactiveOptions<Value>,
) {
	this[SYMBOL_STATE] = {
		...getState<Value, Value>(undefined as never, options),
		isArray: false,
	};

	this[SYMBOL_STATE].value = new Proxy({} as Value, {
		set: (target, property, value) => setValueInProxy(this[SYMBOL_STATE], target, property, value),
	});

	setProxyValue<Value>(this[SYMBOL_STATE], setStoreValue, setPropertyValue, value);
}

ReactiveStore.prototype[NAME_MORA] = NAME_STORE;

ReactiveStore.prototype.asReadonly = function (frozen?: never) {
	return getReadonlyInstance(this[SYMBOL_STATE], frozen === true);
};

ReactiveStore.prototype.get = function (value?: never) {
	return getValueInProxy(this, this[SYMBOL_STATE], value);
};

ReactiveStore.prototype.notify = function () {
	emitProxyValues(this[SYMBOL_STATE]);
};

ReactiveStore.prototype.peek = function (first?: never, second?: never) {
	return peekValueInProxy(this[SYMBOL_STATE], first, second);
};

ReactiveStore.prototype.set = function (first?: never, second?: never) {
	return setProxyValue(this[SYMBOL_STATE], setStoreValue, setPropertyValue, first, second);
};

ReactiveStore.prototype.subscribe = function (first: never, second?: never, third?: never) {
	return subscribeToProxy(this, this[SYMBOL_STATE], first, second, third);
};

ReactiveStore.prototype.toJSON = function () {
	return this[SYMBOL_STATE].value;
};

ReactiveStore.prototype.toString = function (json?: never) {
	return getStringValue(this[SYMBOL_STATE], json);
};

ReactiveStore.prototype.update = function (callback: never) {
	updateProxyValue(this[SYMBOL_STATE], setStoreValue, setPropertyValue, callback);
};

// #endregion

// #region Functions

function setPropertyValue<Value extends PlainObject, Item = Value>(
	state: ReactiveState<Value, Item>,
	key: unknown,
	value: unknown,
): void {
	(state.value as PlainObject)[key as Key] = value;
}

function setStoreValue<Value, Item = Value>(
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
	// @ts-expect-error All good, no worries :-)
	return new ReactiveStore(value, options);
}

// #endregion
