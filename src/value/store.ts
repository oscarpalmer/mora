import {isKey, isPlainObject} from '@oscarpalmer/atoms/is';
import type {
	GenericCallback,
	Key,
	PlainObject,
} from '@oscarpalmer/atoms/models';
import {NAME_STORE} from '../constants';
import {
	getReactiveValueInProxy,
	setProxyValue,
	setValueInProxy,
} from '../helpers/proxy';
import {getValue} from '../helpers/value';
import type {ReactiveOptions, Unsubscribe} from '../models';
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
	get(key: keyof Value): Value[keyof Value];

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
	 * Get the value _(without reactivity)_
	 * @returns The current value
	 */
	peek(): Value;

	/**
	 * Get a value by key _(without reactivity)_
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	peek(key: keyof Value): Value[keyof Value];

	/**
	 * Get a value by key _(without reactivity)_
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	peek(key: Key): unknown;

	peek(key?: unknown): unknown {
		return isKey(key) ? this.state.value[key] : {...this.state.value};
	}

	/**
	 * Set the value
	 * @param value New value _(defaults to an empty object)_
	 */
	set(value?: Value): void;

	/**
	 * Set a value by key
	 * @param key Key of the value to set
	 * @param value New value
	 */
	set(key: keyof Value, value: Value[keyof Value]): void;

	/**
	 * Set a value by key
	 * @param key Key of the value to set
	 * @param value New value
	 */
	set(key: Key, value: unknown): void;

	set(first?: unknown, second?: unknown): void {
		if (isKey(first)) {
			(this.state.value as PlainObject)[first] = second;
		} else if (first == null || isPlainObject(first)) {
			setProxyValue(this.state.value, first ?? {});
		}
	}

	/**
	 * @inheritdoc
	 */
	subscribe(callback: (value: Value) => void): Unsubscribe;

	/**
	 * Subscribe to changes for a specific key
	 * @param key Key of the value to subscribe to
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	subscribe<Key extends keyof Value>(
		key: Key,
		callback: (value: Value[Key] | undefined) => void,
	): Unsubscribe;

	/**
	 * Subscribe to changes for a specific key
	 * @param key Key of the value to subscribe to
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	subscribe(key: Key, callback: (value: unknown) => void): Unsubscribe;

	subscribe(
		first: Key | GenericCallback,
		second?: GenericCallback,
	): Unsubscribe {
		if (isKey(first) && typeof second === 'function') {
			return getReactiveValueInProxy(this, this.#keyed, first, false).subscribe(
				second,
			);
		}

		return typeof first === 'function' ? subscribe(this.state, first) : noop;
	}

	/**
	 * Update the value _(based on the current value)_
	 * @param callback Callback to update the value
	 */
	update(callback: (value: Value) => Value): void {
		const updated = callback({...this.state.value});

		if (updated == null || isPlainObject(updated)) {
			setProxyValue(this.state.value, updated ?? {});
		}
	}
}

/**
 * Create a reactive store
 * @param value Initial object value
 * @param options Optional reactivity options
 * @returns Reactive store
 */
export function store<Value extends PlainObject>(
	value: Value,
	options?: ReactiveOptions<Value>,
): Store<Value> {
	return new Store((isPlainObject(value) ? value : {}) as Value, options);
}
