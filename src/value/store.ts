import {isKey, isPlainObject} from '@oscarpalmer/atoms/is';
import type {GenericCallback, Key, PlainObject} from '@oscarpalmer/atoms/models';
import {startBatch, stopBatch} from '../batch';
import {NAME_STORE} from '../constants';
import {
	emityProxyValues,
	getReactiveValueInProxy,
	setProxyValue,
	setValueInProxy,
} from '../helpers/proxy';
import {getValue} from '../helpers/value';
import type {ReactiveOptions, ReactiveState, Unsubscribe} from '../models';
import {noop, subscribe} from '../subscription';
import type {Computed} from './computed';
import {Reactive} from './reactive';

export class Store<Value extends PlainObject> extends Reactive<Value, Value> {
	readonly #keyed = new Map<Key, Computed<unknown>>();

	constructor(value: Value, options?: ReactiveOptions<Value>) {
		super(
			NAME_STORE,
			new Proxy(value, {
				set: (target: Value, property: PropertyKey, value: unknown) =>
					setValueInProxy({
						target,
						property,
						value,
						isArray: false,
						state: this.state,
					}),
			}),
			options,
		);
	}

	/**
	 * @inheritdoc
	 */
	get(): Value;

	/**
	 * Get a value by key
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	get<Key extends keyof Value>(key: Key): Value[Key];

	/**
	 * Get a value by key
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	get(key: Key): unknown;

	get(key?: unknown): unknown {
		return isKey(key)
			? getReactiveValueInProxy(this, this.#keyed, key, false).get()
			: getValue(this.state);
	}

	/**
	 * Notify dependents of changes
	 *
	 * _This bypasses equality checks and will immediately notify dependents.
	 * Use this only if you're modifying nested data that would be ignored by equality checks._
	 */
	notify(): void {
		emityProxyValues(this.state, this.#keyed);
	}

	/**
	 * Get the value _(without reactivity)_
	 * @returns The current value
	 */
	override peek(): Value;

	/**
	 * Get a value by key _(without reactivity)_
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	override peek<Key extends keyof Value>(key: Key): Value[Key];

	/**
	 * Get a value by key _(without reactivity)_
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	override peek(key: Key): unknown;

	override peek(key?: unknown): unknown {
		return isKey(key) ? this.state.value[key] : {...this.state.value};
	}

	/**
	 * Set the value
	 * @param value New value _(defaults to an empty object)_
	 */
	set(
		value?:
			| Value
			| (() => null | undefined | Value | Promise<null | undefined | Value>)
			| Promise<null | undefined | Value>,
	): void;

	/**
	 * Set a value by key
	 * @param key Key of the value to set
	 * @param value New value
	 */
	set<Key extends keyof Value>(
		key: Key,
		value: Value[Key] | (() => Value[Key] | Promise<Value[Key]>) | Promise<Value[Key]>,
	): void;

	/**
	 * Set a value by key
	 * @param key Key of the value to set
	 * @param value New value
	 */
	set(key: Key, value: unknown): void;

	set(first?: unknown, second?: unknown): void {
		setProxyValue<Value>(
			false,
			this.state,
			isStoreObject,
			isKey,
			setObject,
			setProperty,
			first,
			second,
		);
	}

	/**
	 * @inheritdoc
	 */
	override subscribe(callback: (value: Value) => void): Unsubscribe;

	/**
	 * Subscribe to changes for a specific key
	 * @param key Key of the value to subscribe to
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	override subscribe<Key extends keyof Value>(
		key: Key,
		callback: (value: Value[Key] | undefined) => void,
	): Unsubscribe;

	/**
	 * Subscribe to changes for a specific key
	 * @param key Key of the value to subscribe to
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	override subscribe(key: Key, callback: (value: unknown) => void): Unsubscribe;

	override subscribe(first: Key | GenericCallback, second?: GenericCallback): Unsubscribe {
		if (isKey(first) && typeof second === 'function') {
			return getReactiveValueInProxy(this, this.#keyed, first, false).subscribe(second);
		}

		return typeof first === 'function' ? subscribe(this.state, first) : noop;
	}

	/**
	 * Update the value _(based on the current value)_
	 * @param callback Callback to update the value
	 */
	update(callback: (value: Value) => Value): void {
		const updated = callback(this.state.value);

		if (updated == null || isPlainObject(updated)) {
			setObject(this.state, updated);
		}
	}
}

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
 * @param value Initial object value
 * @param options Reactivity options
 * @returns Reactive store
 */
export function store<Value extends PlainObject>(
	value: () => Value | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Store<Value>;

/**
 * Create a reactive store from a promise
 * @param value Initial object value
 * @param options Reactivity options
 * @returns Reactive store
 */
export function store<Value extends PlainObject>(
	value: Promise<Value>,
	options?: ReactiveOptions<Value>,
): Store<Value>;

/**
 * Create a reactive store
 * @param value Initial object value
 * @param options Reactivity options
 * @returns Reactive store
 */
export function store<Value extends PlainObject>(
	value: Value,
	options?: ReactiveOptions<Value>,
): Store<Value>;

export function store<Value extends PlainObject>(
	value: Value | (() => Value | Promise<Value>) | Promise<Value>,
	options?: ReactiveOptions<Value>,
): Store<Value> {
	const instance = new Store({} as unknown as Value, options);

	instance.set(value);

	return instance;
}
