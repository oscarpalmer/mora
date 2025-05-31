import {Reactive, type ReactiveState} from './reactive';
import {type Signal, signal} from './signal';
import {emitValue, getValue} from './value';

export class ReactiveArray<Item> extends Reactive<Item[]> {
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

	constructor(value: Item[]) {
		super(
			'array',
			new Proxy(value, {
				get: (target, property) =>
					updateMethods.has(property as string)
						? updateArray(property as string, target, this.state, this.#size)
						: Reflect.get(target, property),
				set: (target, property, value) =>
					setValue(target, property, value, this.state, this.#size),
			}),
		);

		this.#size.set(value.length);
	}

	/**
	 * @inheritdoc
	 */
	get(): Item[] {
		return getValue(this.state);
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
}

/**
 * Create a reactive array
 */
export function array<Item>(value: Item[]): ReactiveArray<Item> {
	return new ReactiveArray(Array.isArray(value) ? value : []);
}

function emit(first: unknown[], second: unknown[]): boolean {
	let {length} = first;

	if (length !== second.length) {
		return true;
	}

	let offset = 0;

	if (length >= 100) {
		offset = Math.round(length / 10);
		offset = offset > 25 ? 25 : offset;

		for (let index = 0; index < offset; index += 1) {
			if (!Object.is(first[index], second[index])) {
				return true;
			}
		}
	}

	length -= offset;

	for (let index = offset; index < length; index += 1) {
		if (!Object.is(first[index], second[index])) {
			return true;
		}
	}

	return false;
}

function setValue<Item>(
	target: Item[],
	property: PropertyKey,
	value: unknown,
	state: ReactiveState<Item[]>,
	length: Signal<number>,
): boolean {
	const isIndex = !Number.isNaN(Number(property));
	const isLength = property === 'length';

	if (!isIndex && !isLength) {
		return Reflect.set(target, property, value);
	}

	const previous = Reflect.get(target, property);

	if (Object.is(previous, value)) {
		return true;
	}

	Reflect.set(target, property, value);

	emitValue(state);

	length.set(target.length);

	return true;
}

function updateArray<Item>(
	type: string,
	array: Item[],
	state: ReactiveState<Item[]>,
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
				: emit(previousArray, array)
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
