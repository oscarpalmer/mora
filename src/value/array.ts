import {arrayName} from '../helpers/is';
import {setValueInProxy} from '../helpers/proxy';
import {emitValue, equalArrays, getValue} from '../helpers/value';
import {type Computed, computed} from './computed';
import {Reactive, type ReactiveOptions, type ReactiveState} from './reactive';
import {type Signal, signal} from './signal';

export class ReactiveArray<Item> extends Reactive<Item[], Item> {
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
	 * Get an indexed item
	 */
	at(index: number): Item | undefined {
		return this.get().at(index);
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
	get(): Item[] {
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

	/**
	 * Get the length of the array _(without reactivity)_
	 */
	peek(length: true): number;

	peek(length?: unknown): Item[] | number {
		return length === true ? this.#size.peek() : [...this.state.value];
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
	set(value: Item[]): void;

	/**
	 * Set the value at an index
	 */
	set(index: number, value: Item): void;

	/**
	 * Set the length of the array
	 */
	set(property: 'length', value: number): void;

	set(first: number | 'length' | Item[], second?: number | Item): void {
		if (Array.isArray(first)) {
			this.state.value.splice(0, this.state.value.length, ...first);
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
	 * Add items to the beginning of the array
	 */
	unshift(...items: Item[]): number {
		return this.state.value.unshift(...items);
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
