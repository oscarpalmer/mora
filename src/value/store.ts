import type {PlainObject} from '@oscarpalmer/atoms/models';
import {NAME_STORE, SYMBOL_STATE} from '../constants';
import {deactivateProxy, getReactiveActive, getState} from '../helpers/misc';
import {
	deleteValueInProxy,
	getValueInProxy,
	notifyProxyValue,
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

function ReactiveStore(this: any, value: never, options?: ReactiveOptions<unknown>): void {
	this[SYMBOL_STATE] = {
		...getState(NAME_STORE, undefined, options),
		firstChild: undefined,
		isArray: false,
		lastChild: undefined,
	};

	this[SYMBOL_STATE].value = new Proxy(
		{},
		{
			deleteProperty: (target, property) => deleteValueInProxy(this, target, property),
			set: (target, property, value) => setValueInProxy(this, target, property, value),
		},
	);

	setProxyValue.call(this, value);
}

ReactiveStore.prototype.asReadonly = getReadonlySignal;
ReactiveStore.prototype.deactivate = deactivateProxy;
ReactiveStore.prototype.get = getValueInProxy;
ReactiveStore.prototype.notify = notifyProxyValue;
ReactiveStore.prototype.peek = peekValueInProxy;
ReactiveStore.prototype.set = setProxyValue;
ReactiveStore.prototype.subscribe = subscribeToProxy;
ReactiveStore.prototype.toJSON = getJsonValue;
ReactiveStore.prototype.toString = getStringValue;
ReactiveStore.prototype.update = updateProxyValue;

Object.defineProperties(ReactiveStore.prototype, {
	active: {
		enumerable: true,
		get: getReactiveActive,
	},
});

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
