import {select} from '@oscarpalmer/atoms/array';
import {filter} from '@oscarpalmer/atoms/array/filter';
import {
	METHODS_AFFECTING_LENGTH,
	METHODS_UPDATE,
	NAME_ARRAY,
	NAME_MORA,
	PROPERTY_LENGTH,
	SYMBOL_STATE,
} from '../constants';
import {getState} from '../helpers/misc';
import {
	emitProxyValues,
	getValueInProxy,
	peekValueInProxy,
	setProxyValue,
	setValueInProxy,
	updateProxyValue,
} from '../helpers/proxy';
import {subscribeToProxy} from '../helpers/subscription';
import {emitValue, equalArrays, getStringValue} from '../helpers/value';
import type {ReactiveArray, ReactiveOptions, ReactiveProxyState, ReactiveState} from '../models';
import {computed} from './computed';
import {getReadonlyInstance} from './readonly';
import {signal} from './signal';

// #region Instance

function ReactiveArray<Item>(this: any, value: never, options?: ReactiveOptions<Item>) {
	this[SYMBOL_STATE] = {
		...getState<Item[], Item>([], options),
		isArray: true,
		length: signal(0),
	};

	this[SYMBOL_STATE].value = new Proxy([], {
		get: (target: Item[], property: PropertyKey) =>
			METHODS_UPDATE.has(property as string)
				? updateArray(this[SYMBOL_STATE], property as string, target)
				: Reflect.get(target, property),
		set: (target: Item[], property: PropertyKey, value: Item) =>
			setValueInProxy(this[SYMBOL_STATE], target, property, value),
	});

	Object.defineProperty(this, PROPERTY_LENGTH, {
		enumerable: true,
		get: () => this[SYMBOL_STATE].length.get(),
		set: (value: number) => setArrayLength(this[SYMBOL_STATE], value),
	});

	setProxyValue<Item[], Item>(this[SYMBOL_STATE], setArrayValue, setAtIndex, value);
}

ReactiveArray.prototype[NAME_MORA] = NAME_ARRAY;

ReactiveArray.prototype.asReadonly = function (frozen?: never) {
	return getReadonlyInstance(this[SYMBOL_STATE], frozen === true);
};

ReactiveArray.prototype.at = function (index: never) {
	return getArrayValues(this, this[SYMBOL_STATE], index);
};

ReactiveArray.prototype.clear = function () {
	this[SYMBOL_STATE].value.length = 0;
};

ReactiveArray.prototype.filter = function (callback: never) {
	return computed(() => filter(getArrayValues(this, this[SYMBOL_STATE]) as unknown[], callback));
};

ReactiveArray.prototype.get = function (value?: never) {
	return getArrayValues(this, this[SYMBOL_STATE], value);
};

ReactiveArray.prototype.map = function (callback: never) {
	return computed(() => (getArrayValues(this, this[SYMBOL_STATE]) as unknown[]).map(callback));
};

ReactiveArray.prototype.notify = function () {
	emitProxyValues(this[SYMBOL_STATE]);
};

ReactiveArray.prototype.peek = function (first?: never, second?: never) {
	return peekArrayValue(this[SYMBOL_STATE], first, second);
};

ReactiveArray.prototype.pop = function () {
	return this[SYMBOL_STATE].value.pop();
};

ReactiveArray.prototype.push = function (...items: unknown[]) {
	return this[SYMBOL_STATE].value.push(...items);
};

ReactiveArray.prototype.select = function (filter: never, map: never) {
	return computed(() => select(getArrayValues(this, this[SYMBOL_STATE]) as unknown[], filter, map));
};

ReactiveArray.prototype.set = function (first?: never, second?: never) {
	return setProxyValue(this[SYMBOL_STATE], setArrayValue, setAtIndex, first, second);
};

ReactiveArray.prototype.shift = function () {
	return this[SYMBOL_STATE].value.shift();
};

ReactiveArray.prototype.splice = function (from: never, to?: never, ...items: unknown[]) {
	return this[SYMBOL_STATE].value.splice(from, to ?? this[SYMBOL_STATE].value.length, ...items);
};

ReactiveArray.prototype.subscribe = function (first: never, second?: never, third?: never) {
	return subscribeToProxy(this as never, this[SYMBOL_STATE], first, second, third);
};

ReactiveArray.prototype.toJSON = function () {
	return this[SYMBOL_STATE].value;
};

ReactiveArray.prototype.toString = function (json?: boolean) {
	return getStringValue(this[SYMBOL_STATE], json);
};

ReactiveArray.prototype.unshift = function (...items: unknown[]) {
	return this[SYMBOL_STATE].value.unshift(...items);
};

ReactiveArray.prototype.update = function (callback: never) {
	updateProxyValue(this[SYMBOL_STATE], setArrayValue, setAtIndex, callback);
};

// #endregion

// #region Functions

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
	// @ts-expect-error All good, no worries :-)
	return new ReactiveArray(value, options);
}

function getArrayValues<Item>(
	instance: ReactiveArray<Item>,
	state: ReactiveProxyState<Item[], Item>,
	value?: unknown,
): unknown {
	return value === PROPERTY_LENGTH
		? state.length!.get()
		: getValueInProxy(instance as never, state, value);
}

function peekArrayValue<Item>(
	state: ReactiveProxyState<Item[], Item>,
	first?: unknown,
	second?: boolean,
): unknown {
	return first === PROPERTY_LENGTH ? state.length!.peek() : peekValueInProxy(state, first, second);
}

function setArrayLength<Item>(state: ReactiveState<Item[], Item>, value: number): void {
	if (
		typeof value === 'number' &&
		!Number.isNaN(value) &&
		value >= 0 &&
		value !== state.value.length
	) {
		state.value.length = value;
	}
}

function setArrayValue<Value, Item = Value>(state: ReactiveState<Value, Item>, value: Value): void {
	(state.value as unknown[]).splice(
		0,
		(state.value as unknown[]).length,
		...((value as unknown[]) ?? []),
	);
}

function setAtIndex<Value, Item = Value>(
	state: ReactiveState<Value, Item>,
	index: unknown,
	value: Item,
): void {
	const actual =
		(index as number) < 0
			? (state.value as unknown[]).length + (index as number)
			: (index as number);

	if (actual > -1) {
		(state.value as unknown[])[actual] = value;
	}
}

function updateArray<Item>(
	state: ReactiveProxyState<Item[], Item>,
	type: string,
	array: Item[],
): unknown {
	const affectsLength = METHODS_AFFECTING_LENGTH.has(type);
	const previousArray = affectsLength ? [] : array.slice();
	const previousLength = array.length;

	return (...args: unknown[]) => {
		const result = (array[type as never] as (...args: unknown[]) => unknown)(...args);

		if (
			affectsLength ? array.length !== previousLength : !equalArrays(state, previousArray, array)
		) {
			emitValue(state);

			state.length!.set(array.length);
		}

		return result;
	};
}

// #endregion
