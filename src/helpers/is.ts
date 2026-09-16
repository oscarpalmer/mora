import type {PlainObject} from '@oscarpalmer/atoms/models';
import {
	NAME_ALL,
	NAME_ARRAY,
	NAME_COMPUTED,
	NAME_EFFECT,
	NAME_MORA,
	NAME_READONLY,
	NAME_SIGNAL,
	NAME_STORE,
} from '../constants';
import type {
	Computed,
	Effect,
	Reactive,
	ReactiveArray,
	ReactiveStore,
	ReadonlySignal,
	Signal,
} from '../models';

// #region Functions

/**
 * Is the value a computed signal?
 *
 * @param value Value to check
 * @returns True if value is a {@link Computed}
 */
export function isComputed<Value = unknown>(value: unknown): value is Computed<Value> {
	return isMora<Computed<Value>>(value, NAME_COMPUTED);
}

/**
 * Is the value an effect?
 *
 * @param value Value to check
 * @returns True if value is an {@link Effect}
 */
export function isEffect(value: unknown): value is Effect {
	return isMora<Effect>(value, NAME_EFFECT);
}

function isMora<Instance>(value: unknown, name: string | Set<string>): value is Instance {
	return (
		typeof value === 'object' &&
		value != null &&
		NAME_MORA in value &&
		(typeof name === 'string' ? value[NAME_MORA] === name : name.has(value[NAME_MORA] as never))
	);
}

/**
 * Is the value reactive?
 *
 * @param value Value to check
 * @returns True if value is a {@link Reactive}
 */
export function isReactive<Value = unknown>(value: unknown): value is Reactive<Value> {
	return isMora<Reactive<Value>>(value, NAME_ALL);
}

/**
 * Is the value a signal?
 *
 * @param value Value to check
 * @returns True if value is a {@link Signal}
 */
export function isSignal<Value = unknown>(value: unknown): value is Signal<Value> {
	return isMora<Signal<Value>>(value, NAME_SIGNAL);
}

/**
 * Is the value a reactive array?
 *
 * @param value Value to check
 * @returns True if value is a {@link ReactiveArray}
 */
export function isReactiveArray<Item = unknown>(value: unknown): value is ReactiveArray<Item> {
	return isMora<ReactiveArray<Item>>(value, NAME_ARRAY);
}

/**
 * Is the value a reactive store?
 *
 * @param value Value to check
 * @returns True if value is a {@link Store}
 */
export function isReactiveStore<Value extends PlainObject = PlainObject>(
	value: unknown,
): value is ReactiveStore<Value> {
	return isMora<ReactiveStore<Value>>(value, NAME_STORE);
}

/**
 * Is the value a readonly signal?
 *
 * @param value Value to check
 * @returns True if value is a {@link ReadonlySignal}
 */
export function isReadonlySignal<Value = unknown>(value: unknown): value is ReadonlySignal<Value> {
	return isMora<ReadonlySignal<Value>>(value, NAME_READONLY);
}

// #endregion
