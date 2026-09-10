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
import type {InternalProxy, ReactiveArray, ReactiveOptions, ReactiveState} from '../models';
import {computed} from './computed';
import {getReadonlyInstance} from './readonly';
import {signal} from './signal';

// #region Instance

function ReactiveArray(this: any, value: unknown, options?: ReactiveOptions<unknown>) {
	this[SYMBOL_STATE] = {
		...getState(undefined, options),
		isArray: true,
		length: signal(0),
	};

	this[SYMBOL_STATE].value = new Proxy([], {
		get: (target, property) =>
			METHODS_UPDATE.has(property as string)
				? updateArray(this, property as string, target)
				: Reflect.get(target, property),
		set: (target, property, value) => setValueInProxy(this, target, property, value),
	});

	Object.defineProperty(this, PROPERTY_LENGTH, {
		enumerable: true,
		get: () => this[SYMBOL_STATE].length.get(),
		set: (value: number) => setArrayLength(this[SYMBOL_STATE], value),
	});

	setProxyValue.call(this, value);
}

ReactiveArray.prototype[NAME_MORA] = NAME_ARRAY;

ReactiveArray.prototype.asReadonly = getReadonlyInstance;
ReactiveArray.prototype.at = getArrayValues;
ReactiveArray.prototype.get = getArrayValues;
ReactiveArray.prototype.notify = emitProxyValues;
ReactiveArray.prototype.peek = peekArrayValue;
ReactiveArray.prototype.set = setProxyValue;
ReactiveArray.prototype.subscribe = subscribeToProxy;
ReactiveArray.prototype.toString = getStringValue;
ReactiveArray.prototype.update = updateProxyValue;

ReactiveArray.prototype.clear = function () {
	this[SYMBOL_STATE].value.length = 0;
};

ReactiveArray.prototype.filter = function (callback: never) {
	return computed(() => filter(getArrayValues.call(this) as never, callback) as never);
};

ReactiveArray.prototype.map = function (callback: never) {
	return computed(() => (getArrayValues.call(this) as unknown[]).map(callback));
};

ReactiveArray.prototype.pop = function () {
	return this[SYMBOL_STATE].value.pop();
};

ReactiveArray.prototype.push = function (...items: unknown[]) {
	return this[SYMBOL_STATE].value.push(...items);
};

ReactiveArray.prototype.select = function (filter: never, map: never) {
	return computed(() => select(getArrayValues.call(this) as unknown[], filter, map));
};

ReactiveArray.prototype.shift = function () {
	return this[SYMBOL_STATE].value.shift();
};

ReactiveArray.prototype.splice = function (from: never, to?: never, ...items: unknown[]) {
	return this[SYMBOL_STATE].value.splice(from, to ?? this[SYMBOL_STATE].value.length, ...items);
};

ReactiveArray.prototype.toJSON = function () {
	return this[SYMBOL_STATE].value;
};

ReactiveArray.prototype.unshift = function (...items: unknown[]) {
	return this[SYMBOL_STATE].value.unshift(...items);
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

export function array(value: unknown, options?: ReactiveOptions<unknown>): ReactiveArray<unknown> {
	// @ts-expect-error All good, no worries :-)
	return new ReactiveArray(value, options);
}

function getArrayValues(this: InternalProxy, value?: unknown): unknown {
	return value === PROPERTY_LENGTH
		? this[SYMBOL_STATE].length!.get()
		: getValueInProxy.call(this, value);
}

function peekArrayValue(this: InternalProxy, first?: unknown, second?: boolean): unknown {
	return first === PROPERTY_LENGTH
		? this[SYMBOL_STATE].length!.peek()
		: peekValueInProxy.call(this, first, second);
}

function setArrayLength(state: ReactiveState, value: number): void {
	if (
		typeof value === 'number' &&
		!Number.isNaN(value) &&
		value >= 0 &&
		value !== (state.value as unknown[]).length
	) {
		(state.value as unknown[]).length = value;
	}
}

function updateArray(instance: InternalProxy, type: string, array: unknown[]): unknown {
	const state = instance[SYMBOL_STATE];

	const affectsLength = METHODS_AFFECTING_LENGTH.has(type);
	const previousArray = affectsLength ? [] : array.slice();
	const previousLength = array.length;

	return (...args: unknown[]) => {
		const result = (array[type as never] as (...args: unknown[]) => unknown)(...args);

		if (
			affectsLength ? array.length !== previousLength : !equalArrays(state, previousArray, array)
		) {
			emitValue(instance);

			state.length!.set(array.length);
		}

		return result;
	};
}

// #endregion
