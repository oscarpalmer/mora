import type {GenericCallback} from '@oscarpalmer/atoms';
import {arrayName} from '../helpers/is';
import {getReactiveValueInProxy, setValueInProxy} from '../helpers/proxy';
import {emitValue, equalArrays, getValue} from '../helpers/value';
import {type Unsubscribe, noop, subscribe} from '../subscription';
import {type Computed, computed} from './computed';
import {Reactive, type ReactiveOptions, type ReactiveState} from './reactive';
import {type Signal, signal} from './signal';

export class ReactiveArray<Item> extends Reactive<Item[], Item> {
	#indiced = new Map<number, Computed<unknown>>();
	#size = signal(0);

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
			arrayName,
			new Proxy(value, {
				get: (target, property) =>
					updateMethods.has(property as string)
						? updateArray(property as string, target, this.state, this.#size)
						: Reflect.get(target, property),
				set: (target, property, value) =>
					setValueInProxy(
						target,
						property,
						value,
						this.state,
						true,
						this.#size,
					),
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
	 * @inheritdoc
	 */
	get(): Item[];

	/**
	 * Get the value at an index
	 */
	get(index: number): Item | undefined;

	/**
	 * Get the length of the array
	 */
	get(property: 'length'): number;

	get(first?: unknown): unknown {
		if (typeof first === 'number') {
			return getReactiveValueInProxy(this, this.#indiced, first, true).get();
		}

		if (first === 'length') {
			return this.length;
		}

		return getValue(this.state);
	}

	/**
	 * Create a computed, filtered array
	 */
	filter(
		callback: (item: Item, index: number, array: Item[]) => boolean,
	): Computed<Item[]> {
		return computed(() => this.get().filter(callback));
	}

	/**
	 * Create a computed, mapped array
	 */
	map<Mapped>(
		callback: (item: Item, index: number, array: Item[]) => Mapped,
	): Computed<Mapped[]> {
		return computed(() => this.get().map(callback));
	}

	/**
	 * @inheritdoc
	 */
	peek(): Item[];

	peek(index: number): Item | undefined;

	/**
	 * Get the length of the array _(without reactivity)_
	 */
	peek(length: true): number;

	peek(value?: unknown): unknown {
		if (value === true) {
			return this.#size.peek();
		}

		if (typeof value === 'number') {
			return this.state.value.at(value);
		}

		return [...this.state.value];
	}

	/**
	 * Remove and return the last item of the array
	 */
	pop(): Item | undefined {
		return this.state.value.pop();
	}

	/**
	 * Add items to the end of the array
	 */
	push(...items: Item[]): number {
		return this.state.value.push(...items);
	}

	/**
	 * Set the value
	 */
	set(value?: Item[]): void;

	/**
	 * Set the value at an index
	 */
	set(index: number, value: Item): void;

	/**
	 * Set the length of the array
	 */
	set(property: 'length', value: number): void;

	set(first?: number | 'length' | Item[], second?: number | Item): void {
		if (first == null || Array.isArray(first)) {
			this.state.value.splice(0, this.state.value.length, ...(first ?? []));
		} else if (first === 'length') {
			this.length = second as number;
		} else if (typeof first === 'number') {
			this.state.value[first] = second as Item;
		}
	}

	/**
	 * Remove and return the first item of the array
	 */
	shift(): Item | undefined {
		return this.state.value.shift();
	}

	/**
	 * Remove and return items from the array _(and optionally add new items)_
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
	 */
	unshift(...items: Item[]): number {
		return this.state.value.unshift(...items);
	}

	/**
	 * Update the value _(based on the current value)_
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
	const affectsLength = lengthAffectingMethods.has(type);
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

const lengthAffectingMethods = new Set<string>([
	'pop',
	'push',
	'shift',
	'unshift',
]);

const updateMethods = new Set<string>([
	...lengthAffectingMethods,
	'copyWithin',
	'fill',
	'reverse',
	'sort',
	'splice',
]);
