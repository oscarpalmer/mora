import type {PlainObject} from '@oscarpalmer/atoms/models';
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
import {getJsonValue, getStringValue} from '../helpers/value';
import type {ReactiveOptions, ReactiveStore} from '../models';
import {getReadonlySignal} from './readonly';

// #region Instance

function ReactiveStore(this: any, value: never, options?: ReactiveOptions<unknown>) {
	this[SYMBOL_STATE] = {
		...getState(undefined, options),
		isArray: false,
	};

	this[SYMBOL_STATE].value = new Proxy(
		{},
		{
			set: (target, property, value) => setValueInProxy(this, target, property, value),
		},
	);

	setProxyValue.call(this, value);
}

ReactiveStore.prototype[NAME_MORA] = NAME_STORE;

ReactiveStore.prototype.asReadonly = getReadonlySignal;
ReactiveStore.prototype.get = getValueInProxy;
ReactiveStore.prototype.notify = emitProxyValues;
ReactiveStore.prototype.peek = peekValueInProxy;
ReactiveStore.prototype.set = setProxyValue;
ReactiveStore.prototype.subscribe = subscribeToProxy;
ReactiveStore.prototype.toJSON = getJsonValue;
ReactiveStore.prototype.toString = getStringValue;
ReactiveStore.prototype.update = updateProxyValue;

// #endregion

// #region Functions

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

export function store(value: unknown, options?: ReactiveOptions<unknown>): ReactiveStore<unknown> {
	// @ts-expect-error All good, no worries :-)
	return new ReactiveStore(value, options);
}

// #endregion
