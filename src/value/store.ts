import {isKey, isPlainObject} from '@oscarpalmer/atoms/is';
import type {Key, PlainObject} from '@oscarpalmer/atoms/models';
import {storeName} from '../helpers/is';
import {
	getReactiveValueInProxy,
	setProxyValue,
	setValueInProxy,
} from '../helpers/proxy';
import {getValue} from '../helpers/value';
import type {Computed} from './computed';
import {Reactive, type ReactiveOptions} from './reactive';

export class Store<Value extends PlainObject> extends Reactive<Value, Value> {
	#keyed = new Map<Key, Computed<unknown>>();

	constructor(value: Value, options?: ReactiveOptions<Value>) {
		super(
			storeName,
			new Proxy(value, {
				set: (target, property, value) =>
					setValueInProxy(target, property, value, this.state, false),
			}),
			options,
		);
	}

	/**
	 * @inheritdoc
	 */
	get(): Value;

	/**
	 * Get a value by key _(without reactivity)_
	 */
	get(key: keyof Value): Value[keyof Value];

	/**
	 * Get a value by key _(without reactivity)_
	 */
	get(key: Key): unknown;

	get(key?: unknown): unknown {
		return isKey(key)
			? getReactiveValueInProxy(this, this.#keyed, key, false)
			: getValue(this.state);
	}

	/**
	 * Get the value _(without reactivity)_
	 */
	peek(): Value;

	/**
	 * Get a value by key _(without reactivity)_
	 */
	peek(key: keyof Value): Value[keyof Value];

	/**
	 * Get a value by key _(without reactivity)_
	 */
	peek(key: Key): unknown;

	peek(key?: unknown): unknown {
		return isKey(key) ? this.state.value[key] : {...this.state.value};
	}

	/**
	 * Set the value
	 */
	set(value?: Value): void;

	/**
	 * Set a value by key
	 */
	set(key: keyof Value, value: Value[keyof Value]): void;

	/**
	 * Set a value by key
	 */
	set(key: Key, value: unknown): void;

	set(first?: unknown, second?: unknown): void {
		if (isKey(first)) {
			(this.state.value as PlainObject)[first] = second;
		} else if (first == null || isPlainObject(first)) {
			setProxyValue(this.state.value, first ?? {});
		}
	}
}

/**
 * Create a reactive store
 */
export function store<Value extends PlainObject>(
	value: Value,
	options?: ReactiveOptions<Value>,
): Store<Value> {
	return new Store((isPlainObject(value) ? value : {}) as Value, options);
}
