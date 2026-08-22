import type {GenericCallback, Key} from '@oscarpalmer/atoms/models';
import type {PROPERTY_LENGTH} from './constants';

export type Active = {
	computed?: ComputedEffect;
	effect?: EffectState;
};

export type Batch = {
	depth: number;
	flushing: boolean;
	handlers: Set<EffectState | Subscription>;
};

export type Computed<Value> = Reactive<Value> & SimpleReactive<Value>;

export type ComputedEffect = {
	dirty: boolean;
	instance: EffectState;
};

export type Effect = {};

export type EffectState = {
	callback: GenericCallback;
};

export type Reactive<Value> = {
	/**
	 * JSON representation of the value
	 *
	 * @returns JSON value
	 */
	toJSON(): Value;

	/**
	 * String representation of the value
	 *
	 * @returns Value as string
	 */
	toString(): string;
};

export type ReactiveArray<Item> = {
	/**
	 * The length of the array
	 */
	get length(): number;

	/**
	 * Set the length of the array
	 */
	set length(value: number);

	/**
	 * Get the value at an index
	 *
	 * @param index Index of item to get _(if negative, starts from the end)_
	 * @returns Item at index, or `undefined` if it doesn't exist
	 */
	at(index: number): Item | undefined;

	/**
	 * Clear the array
	 */
	clear(): void;

	/**
	 * Create a computed, filtered array
	 *
	 * @param callback Callback to evaluate each item
	 * @returns Computed array of filtered items
	 */
	filter(callback: (item: Item, index: number, array: Item[]) => boolean): Computed<Item[]>;

	/**
	 * Get the array
	 *
	 * @returns Array of items
	 */
	get(): Item[];

	/**
	 * Get the value at an index
	 *
	 * @param index Index of item to get _(if negative, starts from the end)_
	 * @returns Item at index, or `undefined` if it doesn't exist
	 */
	get(index: number): Item | undefined;

	/**
	 * Get the length of the array
	 *
	 * @returns Length of the array
	 */
	get(property: typeof PROPERTY_LENGTH): number;

	/**
	 * Create a computed, mapped array
	 *
	 * @param callback Callback to transform each item
	 * @returns Computed array of mapped items
	 */
	map<Mapped>(callback: (item: Item, index: number, array: Item[]) => Mapped): Computed<Mapped[]>;

	/**
	 * Notify dependents of changes
	 *
	 * _This bypasses equality checks and will immediately notify dependents.
	 * Use this only if you're modifying nested data that would be ignored by equality checks._
	 */
	notify(): void;

	/**
	 * Get the array _(without reactivity)_
	 *
	 * @returns Array of items
	 */
	peek(): Item[];

	/**
	 * Get the value at an index _(without reactivity)_
	 *
	 * @param index Index of item to get _(if negative, starts from the end)_
	 * @returns Item at index, or `undefined` if it doesn't exist
	 */
	peek(index: number): Item | undefined;

	/**
	 * Get the length of the array _(without reactivity)_
	 *
	 * @returns Length of the array
	 */
	peek(property: typeof PROPERTY_LENGTH): number;

	/**
	 * Remove and return the last item of the array
	 *
	 * @returns Removed item, or `undefined` if the array is empty
	 */
	pop(): Item | undefined;

	/**
	 * Add items to the end of the array
	 *
	 * @param items Items to add
	 * @returns New array length
	 */
	push(...items: Item[]): number;

	/**
	 * Create a computed, filtered, and mapped array
	 *
	 * @param filter Callback to evaluate each item
	 * @param map Callback to transform each item
	 * @returns Computed array of mapped items
	 */
	select<Mapped>(
		filter: (item: Item, index: number, array: Item[]) => boolean,
		map: (item: Item, index: number, array: Item[]) => Mapped,
	): Computed<Mapped[]>;

	/**
	 * Set the value
	 *
	 * @param value New array of items _(defaults to an empty array)_
	 */
	set(
		value?:
			| Item[]
			| (() => null | undefined | Item[] | Promise<null | undefined | Item[]>)
			| Promise<null | undefined | Item[]>,
	): void;

	/**
	 * Set the value at an index
	 *
	 * @param index Index of item to set _(if negative, starts from the end)_
	 * @param value New item
	 */
	set(index: number, value: Item | (() => Item | Promise<Item>) | Promise<Item>): void;

	/**
	 * Set the length of the array
	 *
	 * @param value New array length
	 */
	set(property: typeof PROPERTY_LENGTH, value: number): void;

	/**
	 * Remove and return the first item of the array
	 *
	 * @returns Removed item, or `undefined` if the array is empty
	 */
	shift(): Item | undefined;

	/**
	 * Remove and return items from the array _(and optionally add new items)_
	 *
	 * @param from Index to start removing items from
	 * @param to Index to stop removing items at _(defaults to the end of the array)_
	 * @param items Optional items to add
	 * @returns Removed items
	 */
	splice(from: number, to?: number, ...items: Item[]): Item[];

	/**
	 * Subscribe to changes
	 *
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	subscribe(callback: (value: Item[]) => void): Unsubscribe;

	/**
	 * Subscribe to changes at a specific index
	 *
	 * @param index Index of item to subscribe to
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	subscribe(index: number, callback: (value: Item | undefined) => void): Unsubscribe;

	/**
	 * Add items to the beginning of the array
	 * @param items Items to add
	 * @returns New array length
	 */
	unshift(...items: Item[]): number;

	/**
	 * Unsubscribe from changes for a specific index
	 *
	 * @param index Index of the value to unsubscribe from
	 * @param callback Callback to unsubscribe
	 */
	unsubscribe(index: number, callback: (item: Item | undefined) => void): void;

	/**
	 * Unsubscribe from changes
	 *
	 * @param callback Callback to unsubscribe
	 */
	unsubscribe(callback: (array: Item[]) => void): void;

	/**
	 * Update the value _(based on the current value)_
	 *
	 * @param callback Callback to update the value
	 */
	update(callback: (value: Item[]) => Item[]): void;
} & Reactive<Item[]>;

export type ReactiveOptions<Value> = {
	/**
	 * Method for comparing values for equality
	 * @param first First value
	 * @param second Second value
	 * @returns Are the values equal?
	 * @default Object.is
	 */
	equal?: (first: Value, second: Value) => boolean;
};

export type ReactiveState<Value, Equal> = {
	computeds: Set<ComputedEffect>;
	effects: Set<EffectState>;
	equal: (first: Equal, second: Equal) => boolean;
	promise?: Promise<Value>;
	promises?: Map<Key, Promise<never>>;
	subscriptions: Map<GenericCallback, Subscription>;
	value: Value;
};

export type ReactiveStore<Value> = {
	/**
	 * Get the value
	 *
	 * @returns Current value
	 */
	get(): Value;

	/**
	 * Get a value by key
	 *
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	get<Key extends keyof Value>(key: Key): Value[Key];

	/**
	 * Get a value by key
	 *
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	get(key: Key): unknown;

	/**
	 * Notify dependents of changes
	 *
	 * _This bypasses equality checks and will immediately notify dependents.
	 * Use this only if you're modifying nested data that would be ignored by equality checks._
	 */
	notify(): void;

	/**
	 * Get the value _(without reactivity)_
	 *
	 * @returns Current value
	 */
	peek(): Value;

	/**
	 * Get a value by key _(without reactivity)_
	 *
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	peek<Key extends keyof Value>(key: Key): Value[Key];

	/**
	 * Get a value by key _(without reactivity)_
	 *
	 * @param key Key of the value to get
	 * @returns Value for the specified key, or `undefined` if it doesn't exist
	 */
	peek(key: Key): unknown;

	/**
	 * Set the value
	 *
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
	 *
	 * @param key Key of the value to set
	 * @param value New value
	 */
	set<Key extends keyof Value>(
		key: Key,
		value: Value[Key] | (() => Value[Key] | Promise<Value[Key]>) | Promise<Value[Key]>,
	): void;

	/**
	 * Set a value by key
	 *
	 * @param key Key of the value to set
	 * @param value New value
	 */
	set(key: Key, value: unknown): void;

	/**
	 * Subscribe to changes
	 *
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	subscribe(callback: (value: Value) => void): Unsubscribe;

	/**
	 * Subscribe to changes for a specific key
	 *
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
	 *
	 * @param key Key of the value to subscribe to
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	subscribe(key: Key, callback: (value: unknown) => void): Unsubscribe;

	/**
	 * Unsubscribe from changes for a specific key
	 *
	 * @param key Key of the value to unsubscribe from
	 * @param callback Callback to unsubscribe
	 */
	unsubscribe<Key extends keyof Value>(
		key: Key,
		callback: (value: Value[Key] | undefined) => void,
	): void;

	/**
	 * Unsubscribe from changes
	 *
	 * @param callback Callback to unsubscribe
	 */
	unsubscribe(callback: (value: Value) => void): void;

	/**
	 * Update the value _(based on the current value)_
	 *
	 * @param callback Callback to update the value
	 */
	update(callback: (value: Value) => Value): void;
} & Reactive<Value>;

export type SetValueInProxyParameters<Value, Equal> = {
	target: Value;
	property: PropertyKey;
	value: unknown;
	state: ReactiveState<Value, Equal>;
	isArray: boolean;
	length?: Signal<number>;
};

export type Signal<Value> = {
	/**
	 * Set the value
	 *
	 * @param value New value
	 */
	set(value: Value | (() => Value | Promise<Value>) | Promise<Value>): void;

	/**
	 * Update the value _(based on the current value)_
	 *
	 * @param callback Callback to update the value
	 */
	update(callback: (value: Value) => Value): void;
} & Reactive<Value> &
	SimpleReactive<Value>;

type SimpleReactive<Value> = {
	/**
	 * Get the value
	 *
	 * @returns Current value
	 */
	get(): Value;

	/**
	 * Get the value _(without reactivity)_
	 *
	 * @returns Current value
	 */
	peek(): Value;

	/**
	 * Subscribe to changes
	 *
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	subscribe(callback: (value: Value) => void): Unsubscribe;

	/**
	 * Unsubscribe from changes
	 *
	 * @param callback Callback to unsubscribe
	 */
	unsubscribe(callback: (value: Value) => void): void;
};

export type Subscription = {
	callback: GenericCallback;
	state: ReactiveState<unknown, never>;

	destroy(): void;
};

/**
 * Unsubscribe from changes
 */
export type Unsubscribe = () => void;
