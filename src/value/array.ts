import {select} from '@oscarpalmer/atoms/array';
import {filter} from '@oscarpalmer/atoms/array/filter';
import {noop} from '@oscarpalmer/atoms/function';
import {isPlainObject} from '@oscarpalmer/atoms/is';
import type {GenericCallback} from '@oscarpalmer/atoms/models';
import {
	METHODS_AFFECTING_LENGTH,
	METHODS_UPDATE,
	NAME_ARRAY,
	NAME_MORA,
	PROPERTY_LENGTH,
} from '../constants';
import {
	emityProxyValues,
	getReactiveValueInProxy,
	setProxyValue,
	setValueInProxy,
} from '../helpers/proxy';
import {emitValue, equalArrays, getSimpleValue} from '../helpers/value';
import type {
	Computed,
	ComputedEffect,
	ReactiveArray,
	ReactiveOptions,
	ReactiveState,
	ReadonlyInstances,
	Signal,
} from '../models';
import {subscribe, unsubscribe} from '../subscription';
import {computed} from './computed';
import {reactive} from './reactive';
import {getReadonlyInstance} from './readonly';
import {signal} from './signal';

/**
 * Create a reactive array from a function result
 *
 * @param value Initial array of items
 * @param options Reactivity options
 * @returns Reactive array
 */
export function array<Item>(
	value: () => Item[] | Promise<Item[]>,
	options?: ReactiveOptions<Item>,
): ReactiveArray<Item>;

/**
 * Create a reactive array from a promise
 *
 * @param value Initial array of items
 * @param options Reactivity options
 * @returns Reactive array
 */
export function array<Item>(
	value: Promise<Item[]>,
	options?: ReactiveOptions<Item>,
): ReactiveArray<Item>;

/**
 * Create a reactive array
 *
 * @param value Initial array of items
 * @param options Reactivity options
 * @returns Reactive array
 */
export function array<Item>(value: Item[], options?: ReactiveOptions<Item>): ReactiveArray<Item>;

export function array<Item>(
	value: Item[] | (() => Item[] | Promise<Item[]>) | Promise<Item[]>,
	options?: ReactiveOptions<Item>,
): ReactiveArray<Item> {
	const [rx, state] = reactive<Item[], Item>([], options);

	const indiced = new Map<number, [Computed<unknown>, ComputedEffect]>();
	const length = signal(0);
	const readonlies: ReadonlyInstances<Item[]> = {};

	let instance: Record<string, unknown> = {};

	state.value = new Proxy([], {
		get: (target: Item[], property: PropertyKey) =>
			METHODS_UPDATE.has(property as string)
				? updateArray(property as string, target, state, length)
				: Reflect.get(target, property),
		set: (target: Item[], property: PropertyKey, value: Item) =>
			setValueInProxy({
				length,
				property,
				state,
				target,
				value,
				isArray: true,
			}),
	});

	function get(): Item[];
	function get(index: number): Item | undefined;
	function get(property: typeof PROPERTY_LENGTH): number;
	function get(value?: unknown): number | Item | Item[] | undefined;

	function get(value?: unknown): number | Item | Item[] | undefined {
		return getArrayValue(instance as ReactiveArray<Item>, indiced, state, length, value);
	}

	function set(first?: unknown, second?: unknown): void {
		setProxyValue<Item[], Item>(
			true,
			state,
			isArrayValue,
			isArrayIndex,
			setArray,
			setAtIndex,
			first,
			second,
		);
	}

	const handlers = {
		...rx,
		get: (value?: number | typeof PROPERTY_LENGTH) => get(value),
		peek: (first?: unknown, second?: boolean) => peekArrayValue(state, length, first, second),
		subscribe: (first: number | GenericCallback, second?: GenericCallback) => {
			if (typeof first === 'number' && typeof second === 'function') {
				return getReactiveValueInProxy(
					instance as ReactiveArray<Item>,
					indiced,
					first,
					true,
				).subscribe(second);
			}

			return typeof first === 'function' ? subscribe(state, first) : noop;
		},
		unsubscribe: (first: number | GenericCallback, second?: GenericCallback) => {
			if (typeof first === 'number' && typeof second === 'function') {
				getReactiveValueInProxy(instance as ReactiveArray<Item>, indiced, first, true)?.unsubscribe(
					second,
				);
			} else if (typeof first === 'function') {
				unsubscribe(state, first);
			}
		},
	};

	instance = {
		...handlers,
		asReadonly: (frozen?: unknown) =>
			getReadonlyInstance(state, readonlies, handlers, frozen === true),
		at: (index: number): Item | undefined => get(index),
		clear: () => {
			state.value.length = 0;
		},
		filter: (callback: (item: Item, index: number, array: Item[]) => boolean) =>
			computed(() => filter(get(), callback)),
		map: <Mapped>(callback: (item: Item, index: number, array: Item[]) => Mapped) =>
			computed(() => get().map(callback)),
		notify: () => {
			emityProxyValues(state, indiced);
		},
		pop: () => state.value.pop(),
		push: (...items: Item[]) => state.value.push(...items),
		select: <Mapped>(
			filter: (item: Item, index: number, array: Item[]) => boolean,
			map: (item: Item, index: number, array: Item[]) => Mapped,
		) => computed(() => select(get() as Item[], filter, map)),
		set: (first?: unknown, second?: unknown) => {
			set(first, second);
		},
		shift: () => state.value.shift(),
		splice: (from: number, to?: number, ...items: Item[]) =>
			state.value.splice(from, to ?? state.value.length, ...items),
		unshift: (...items: Item[]) => state.value.unshift(...items),
		update: (callback: (value: Item[]) => Item[]) =>
			updateArrayValue(instance as ReactiveArray<Item>, state, callback),
	};

	Object.defineProperties(instance, {
		[NAME_MORA]: {
			enumerable: false,
			value: NAME_ARRAY,
		},
		length: {
			enumerable: true,
			get: () => length.get(),
			set: (value: number) => setArrayLength(state, value),
		},
	});

	set(value);

	return Object.freeze(instance) as ReactiveArray<Item>;
}

function getArrayValue<Item>(
	instance: ReactiveArray<Item>,
	indiced: Map<number, [Computed<unknown>, ComputedEffect]>,
	state: ReactiveState<Item[], Item>,
	length: Signal<number>,
	first?: unknown,
): number | Item | Item[] | undefined {
	if (typeof first === 'number') {
		return getReactiveValueInProxy(instance, indiced, first, true).get();
	}

	return first === PROPERTY_LENGTH ? length.get() : getSimpleValue(state);
}

function isArrayIndex(value: unknown): boolean {
	return typeof value === 'number';
}

function isArrayValue<Item>(value: unknown): value is Item[] | undefined {
	return value == null || Array.isArray(value);
}

function peekArrayValue<Item>(
	state: ReactiveState<Item[], Item>,
	length: Signal<number>,
	first?: unknown,
	second?: boolean,
): number | Item | Item[] | undefined {
	if (first === PROPERTY_LENGTH) {
		return length.peek();
	}

	let value: Item | Item[] | undefined;

	if (typeof first === 'number') {
		value = state.value.at(first);
	} else {
		value = state.value;
	}

	if (!(first === true || second === true)) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.slice();
	}

	if (isPlainObject(value)) {
		return {...value};
	}

	return value;
}

function setArray<Item>(state: ReactiveState<Item[], Item>, value: Item[] | undefined): void {
	state.value.splice(0, state.value.length, ...(value ?? []));
}

function setArrayLength<Item>(state: ReactiveState<Item[], Item>, value: number): void {
	if (typeof value === 'number' && value >= 0 && value !== state.value.length) {
		state.value.length = value;
	}
}

function setAtIndex<Item>(state: ReactiveState<Item[], Item>, index: unknown, value: Item): void {
	const actual = (index as number) < 0 ? state.value.length + (index as number) : (index as number);

	if (actual > -1) {
		state.value[actual] = value;
	}
}

function updateArray<Item>(
	type: string,
	array: Item[],
	state: ReactiveState<Item[], Item>,
	length: Signal<number>,
): unknown {
	const affectsLength = METHODS_AFFECTING_LENGTH.has(type);
	const previousArray = affectsLength ? [] : array.slice();
	const previousLength = array.length;

	return (...args: unknown[]): unknown => {
		const result = (array[type as never] as (...args: unknown[]) => unknown)(...args);

		if (
			affectsLength ? array.length !== previousLength : !equalArrays(state, previousArray, array)
		) {
			emitValue(state);

			length.set(array.length);
		}

		return result;
	};
}

function updateArrayValue<Item>(
	instance: ReactiveArray<Item>,
	state: ReactiveState<Item[], Item>,
	callback: (value: Item[]) => Item[],
): void {
	const updated = callback(state.value);

	if (updated == null || Array.isArray(updated)) {
		instance.set(updated);
	}
}
