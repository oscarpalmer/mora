import {filter} from '@oscarpalmer/atoms/array/filter';
import {select} from '@oscarpalmer/atoms/array/select';
import {
	ACTIVE,
	MESSAGE_DEACTIVATED_ARRAY_FILTER,
	MESSAGE_DEACTIVATED_ARRAY_MAP,
	MESSAGE_DEACTIVATED_ARRAY_SELECT,
	METHODS_AFFECTING_LENGTH,
	METHODS_UPDATE,
	NAME_ARRAY,
	PROPERTY_LENGTH,
	SYMBOL_STATE,
} from '../constants';
import {deactivateProxy, getReactiveActive, getState} from '../helpers/misc';
import {
	emitProxyValue,
	getValueInProxy,
	notifyProxyValue,
	peekValueInProxy,
	setProxyValue,
	setValueInProxy,
	updateProxyValue,
} from '../helpers/proxy';
import {subscribeToProxy} from '../helpers/subscription';
import {equalArrays, getJsonValue, getStringValue} from '../helpers/value';
import type {Computed, InternalArray, ReactiveArray, ReactiveOptions} from '../models';
import {getComputed} from './computed';
import {getReadonlySignal} from './readonly';
import {signal} from './signal';

// #region Types

type Callback<Value> = (item: unknown, index: number, array: unknown[]) => Value;

// #endregion

// #region Instance

function ReactiveArray(this: any, value: unknown, options?: ReactiveOptions<unknown>): void {
	const target: unknown[] = [];

	this[SYMBOL_STATE] = {
		...getState(NAME_ARRAY, undefined, options),
		target,
		firstChild: undefined,
		isArray: true,
		lastChild: undefined,
		length: signal(0),
	};

	this[SYMBOL_STATE].value = new Proxy(target, {
		get: (target, property) =>
			METHODS_UPDATE.has(property)
				? updateArray(this, property, target)
				: Reflect.get(target, property),
		set: (target, property, value) => setValueInProxy(this, target, property, value),
	});

	setProxyValue.call(this, value);
}

ReactiveArray.prototype.asReadonly = getReadonlySignal;
ReactiveArray.prototype.at = getArrayValues;
ReactiveArray.prototype.clear = clearArrayValues;
ReactiveArray.prototype.deactivate = deactivateArray;
ReactiveArray.prototype.filter = filterArrayValues;
ReactiveArray.prototype.get = getArrayValues;
ReactiveArray.prototype.map = mapArrayValues;
ReactiveArray.prototype.notify = notifyProxyValue;
ReactiveArray.prototype.peek = peekArrayValue;
ReactiveArray.prototype.pop = popArrayValue;
ReactiveArray.prototype.push = pushArrayValues;
ReactiveArray.prototype.select = selectArrayValues;
ReactiveArray.prototype.shift = shiftArrayValue;
ReactiveArray.prototype.set = setProxyValue;
ReactiveArray.prototype.splice = spliceArrayValues;
ReactiveArray.prototype.subscribe = subscribeToProxy;
ReactiveArray.prototype.toString = getStringValue;
ReactiveArray.prototype.toJSON = getJsonValue;
ReactiveArray.prototype.unshift = unshiftArrayValues;
ReactiveArray.prototype.update = updateProxyValue;

Object.defineProperties(ReactiveArray.prototype, {
	[PROPERTY_LENGTH]: {
		enumerable: true,
		get: getArrayLength,
		set: setArrayLength,
	},
	active: {
		enumerable: true,
		get: getReactiveActive,
	},
});

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

export function array(value: unknown, options?: ReactiveOptions<unknown>): ReactiveArray<unknown> {
	// @ts-expect-error All good, no worries :-)
	return new ReactiveArray(value, options);
}

function clearArrayValues(this: InternalArray): void {
	const state = this[SYMBOL_STATE];

	if (state.active) {
		(state.value as unknown[]).length = 0;
	}
}

function deactivateArray(this: InternalArray): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	state.length?.deactivate();

	deactivateProxy.call(this);
}

function filterArrayValues(this: InternalArray, callback: Callback<boolean>): Computed<unknown[]> {
	if (!this[SYMBOL_STATE].active) {
		throw new Error(MESSAGE_DEACTIVATED_ARRAY_FILTER);
	}

	return getArrayDerivation(this, (items, array) =>
		filter(items, (item, index) => callback(item, index, array)),
	);
}

/**
 * Creates a computed derived from the array's items
 *
 * _(Tracked through the proxy, but derived from the target, as reads through the proxy are slow; user callbacks get `array`, the proxy, so they can't change the target unnoticed)_
 */
function getArrayDerivation(
	instance: InternalArray,
	derive: (items: unknown[], array: unknown[]) => unknown[],
): Computed<unknown[]> {
	const state = instance[SYMBOL_STATE];

	// Owned by the running effect or computed (so it's disposed when that re-runs), otherwise by the array
	return getComputed(
		() => derive(state.target as unknown[], getArrayValues.call(instance) as unknown[]),
		undefined,
		ACTIVE.parent ?? state,
	) as never;
}

function getArrayLength(this: InternalArray): number {
	return this[SYMBOL_STATE].length!.get();
}

function getArrayValues(this: InternalArray, value?: unknown): unknown {
	return value === PROPERTY_LENGTH
		? this[SYMBOL_STATE].length!.get()
		: getValueInProxy.call(this, value);
}

function mapArrayValues(this: InternalArray, callback: Callback<unknown>): Computed<unknown[]> {
	if (!this[SYMBOL_STATE].active) {
		throw new Error(MESSAGE_DEACTIVATED_ARRAY_MAP);
	}

	return getArrayDerivation(this, (items, array) =>
		items.map((item, index) => callback(item, index, array)),
	);
}

function peekArrayValue(this: InternalArray, first?: unknown, second?: boolean): unknown {
	return first === PROPERTY_LENGTH
		? this[SYMBOL_STATE].length!.peek()
		: peekValueInProxy.call(this, first, second);
}

function popArrayValue(this: InternalArray): unknown {
	const state = this[SYMBOL_STATE];

	return state.active ? (state.value as unknown[]).pop() : undefined;
}

function pushArrayValues(this: InternalArray, ...items: unknown[]): number {
	const state = this[SYMBOL_STATE];

	return state.active
		? (state.value as unknown[]).push(...items)
		: (state.value as unknown[]).length;
}

function selectArrayValues(
	this: InternalArray,
	filter: Callback<boolean>,
	map: Callback<unknown>,
): Computed<unknown[]> {
	if (!this[SYMBOL_STATE].active) {
		throw new Error(MESSAGE_DEACTIVATED_ARRAY_SELECT);
	}

	return getArrayDerivation(this, (items, array) =>
		select(
			items,
			(item, index) => filter(item, index, array),
			(item, index) => map(item, index, array),
		),
	);
}

function setArrayLength(this: InternalArray, value: number): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	const values = state.value as unknown[];

	if (typeof value === 'number' && !Number.isNaN(value) && value >= 0 && value !== values.length) {
		values.length = value;
	}
}

function shiftArrayValue(this: InternalArray): unknown {
	const state = this[SYMBOL_STATE];

	return state.active ? (state.value as unknown[]).shift() : undefined;
}

function spliceArrayValues(
	this: InternalArray,
	start: never,
	deleteCount?: never,
	...items: unknown[]
): unknown[] {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return [];
	}

	const values = state.value as unknown[];

	return values.splice(start, deleteCount ?? values.length, ...items);
}

function unshiftArrayValues(this: InternalArray, ...items: unknown[]): number {
	const state = this[SYMBOL_STATE];

	return state.active
		? (state.value as unknown[]).unshift(...items)
		: (state.value as unknown[]).length;
}

function updateArray(instance: InternalArray, type: string | symbol, array: unknown[]): unknown {
	const state = instance[SYMBOL_STATE];

	if (!state.active) {
		return () => undefined;
	}

	const affectsLength = METHODS_AFFECTING_LENGTH.has(type);
	const previousArray = affectsLength ? [] : array.slice();
	const previousLength = array.length;

	return (...args: unknown[]) => {
		const result = (array[type as never] as (...args: unknown[]) => unknown)(...args);

		if (
			affectsLength
				? array.length !== previousLength
				: !equalArrays(previousArray, array, state.equal)
		) {
			emitProxyValue(instance);
		}

		// Methods returning the array itself (e.g., `sort`) return the proxy instead, so chained calls are noticed
		return result === array ? state.value : result;
	};
}

// #endregion
