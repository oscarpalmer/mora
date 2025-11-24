import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {
	METHODS_AFFECTING_LENGTH,
	METHODS_UPDATE,
	NAME_ARRAY,
	PROPERTY_LENGTH,
} from '../constants';
import {emityProxyValues, getReactiveValueInProxy, setValueInProxy} from '../helpers/proxy';
import {emitValue, equalArrays, getValue} from '../helpers/value';
import type {ReactiveOptions, ReactiveState, Unsubscribe} from '../models';
import {noop, subscribe} from '../subscription';
import {type Computed, computed} from './computed';
import {Reactive} from './reactive';
import {type Signal, signal} from './signal';

export class ReactiveArray<Item> extends Reactive<Item[], Item> {
	readonly #indiced = new Map<number, Computed<unknown>>();

	readonly #size = signal(0);

	/**
	 * The length of the array
	 */
	get length(): number {
		return this.#size.get();
	}

	/**
	 * Set the length of the array
	 */
	set length(value: number) {
		if (
			typeof value === 'number' &&
			value >= 0 &&
			value !== this.state.value.length
		) {
			this.get().length = value;
		}
	}

	constructor(value: Item[], options?: ReactiveOptions<Item>) {
		super(
			NAME_ARRAY,
			new Proxy(value, {
				get: (target: Item[], property: PropertyKey) =>
					METHODS_UPDATE.has(property as string)
						? updateArray(property as string, target, this.state, this.#size)
						: Reflect.get(target, property),
				set: (target: Item[], property: PropertyKey, value: Item) =>
					setValueInProxy({
						property,
						target,
						value,
						isArray: true,
						state: this.state,
						length: this.#size,
					}),
			}),
			options,
		);

		this.#size.set(value.length);
	}

	/**
	 * Clear the array
	 */
	clear(): void {
		this.length = 0;
	}

	/**
	 * Create a computed, filtered array
	 * @param callback Callback to evaluate each item
	 * @return Computed array of filtered items
	 */
	filter(
		callback: (item: Item, index: number, array: Item[]) => boolean,
	): Computed<Item[]> {
		return computed(() => this.get().filter(callback));
	}

	/**
	 * @inheritdoc
	 */
	get(): Item[];

	/**
	 * Get the value at an index
	 * @param index Index of item to get _(if negative, starts from the end)_
	 * @returns Item at index, or `undefined` if it doesn't exist
	 */
	get(index: number): Item | undefined;

	/**
	 * Get the length of the array
	 * @returns Length of the array
	 */
	get(property: 'length'): number;

	get(first?: unknown): unknown {
		if (typeof first === 'number') {
			return getReactiveValueInProxy(this, this.#indiced, first, true).get();
		}

		return first === PROPERTY_LENGTH ? this.length : getValue(this.state);
	}

	/**
	 * Create a computed, mapped array
	 * @param callback Callback to transform each item
	 * @return Computed array of mapped items
	 */
	map<Mapped>(
		callback: (item: Item, index: number, array: Item[]) => Mapped,
	): Computed<Mapped[]> {
		return computed(() => this.get().map(callback));
	}

	/**
	 * Notify dependents of changes
	 *
	 * _This bypasses equality checks and will immediately notify dependents.
	 * Use this only if you're modifying nested data that would be ignored by equality checks._
	 */
	notify(): void {
		emityProxyValues(this.state, this.#indiced);
	}

	/**
	 * @inheritdoc
	 */
	peek(): Item[];

	/**
	 * Get the value at an index _(without reactivity)_
	 * @param index Index of item to get _(if negative, starts from the end)_
	 * @returns Item at index, or `undefined` if it doesn't exist
	 */
	peek(index: number): Item | undefined;

	/**
	 * Get the length of the array _(without reactivity)_
	 * @returns Length of the array
	 */
	peek(property: 'length'): number;

	peek(value?: unknown): unknown {
		if (value === 'length') {
			return this.#size.peek();
		}

		return typeof value === 'number'
			? this.state.value.at(value)
			: [...this.state.value];
	}

	/**
	 * Remove and return the last item of the array
	 * @returns Removed item, or `undefined` if the array is empty
	 */
	pop(): Item | undefined {
		return this.state.value.pop();
	}

	/**
	 * Add items to the end of the array
	 * @param items Items to add
	 * @returns New array length
	 */
	push(...items: Item[]): number {
		return this.state.value.push(...items);
	}

	/**
	 * Set the value
	 * @param value New array of items _(defaults to an empty array)_
	 */
	set(value?: Item[]): void;

	/**
	 * Set the value at an index
	 * @param index Index of item to set __(if negative, starts from the end)_
	 * @param value New item
	 */
	set(index: number, value: Item): void;

	/**
	 * Set the length of the array
	 * @param value New array length
	 */
	set(property: 'length', value: number): void;

	set(first?: number | 'length' | Item[], second?: number | Item): void {
		if (first == null || Array.isArray(first)) {
			this.state.value.splice(0, this.state.value.length, ...(first ?? []));
		} else if (first === 'length') {
			this.length = second as number;
		} else if (typeof first === 'number' && !Number.isNaN(first)) {
			setAtIndex(this.state.value, first, second as Item);
		}
	}

	/**
	 * Remove and return the first item of the array
	 * @returns Removed item, or `undefined` if the array is empty
	 */
	shift(): Item | undefined {
		return this.state.value.shift();
	}

	/**
	 * Remove and return items from the array _(and optionally add new items)_
	 * @param from Index to start removing items from
	 * @param to Index to stop removing items at _(defaults to the end of the array)_
	 * @param items Optional items to add
	 * @returns Removed items
	 */
	splice(from: number, to?: number, ...items: Item[]): Item[] {
		return this.state.value.splice(
			from,
			to ?? this.state.value.length,
			...items,
		);
	}

	/**
	 * @inheritdoc
	 */
	subscribe(callback: (value: Item[]) => void): Unsubscribe;

	/**
	 * Subscribe to changes at a specific index
	 * @param index Index of item to subscribe to
	 * @param callback Callback for changes
	 * @returns Unsubscribe callback
	 */
	subscribe(
		index: number,
		callback: (value: Item | undefined) => void,
	): Unsubscribe;

	subscribe(
		first: number | GenericCallback,
		second?: GenericCallback,
	): Unsubscribe {
		if (typeof first === 'number' && typeof second === 'function') {
			return getReactiveValueInProxy(
				this,
				this.#indiced,
				first,
				true,
			).subscribe(second);
		}

		return typeof first === 'function' ? subscribe(this.state, first) : noop;
	}

	/**
	 * Add items to the beginning of the array
	 * @param items Items to add
	 * @returns New array length
	 */
	unshift(...items: Item[]): number {
		return this.state.value.unshift(...items);
	}

	/**
	 * Update the value _(based on the current value)_
	 * @param callback Callback to update the value
	 */
	update(callback: (value: Item[]) => Item[]): void {
		const updated = callback(this.state.value);

		if (updated == null || Array.isArray(updated)) {
			this.set(updated);
		}
	}
}

/**
 * Create a reactive array
 * @param value Initial array of items
 * @param options Optional reactivity options
 * @returns Reactive array
 */
export function array<Item>(
	value: Item[],
	options?: ReactiveOptions<Item>,
): ReactiveArray<Item> {
	return new ReactiveArray(Array.isArray(value) ? value : [], options);
}

function updateArray<Item>(
	type: string,
	array: Item[],
	state: ReactiveState<Item[], Item>,
	length: Signal<number>,
): unknown {
	const affectsLength = METHODS_AFFECTING_LENGTH.has(type);
	const previousArray = affectsLength ? [] : [...array];
	const previousLength = array.length;

	return (...args: unknown[]): unknown => {
		const result = (array[type as never] as (...args: unknown[]) => unknown)(
			...args,
		);

		if (
			affectsLength
				? array.length !== previousLength
				: !equalArrays(state, previousArray, array)
		) {
			emitValue(state);

			length.set(array.length);
		}

		return result;
	};
}

function setAtIndex<Item>(array: Item[], index: number, value: Item): void {
	const actual = index < 0 ? array.length + index : index;

	if (actual > -1) {
		array[actual] = value;
	}
}
