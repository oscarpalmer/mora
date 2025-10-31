import type {PlainObject} from '@oscarpalmer/atoms/models';
import {
	NAME_ARRAY,
	NAME_COMPUTED,
	NAME_EFFECT,
	NAME_SIGNAL,
	NAME_STORE,
	NAMES,
} from '../constants';
import type {Effect} from '../effect';
import type {ReactiveArray} from '../value/array';
import type {Computed} from '../value/computed';
import type {Reactive} from '../value/reactive';
import type {Signal} from '../value/signal';
import type {Store} from '../value/store';

/**
 * Is the value a reactive array?
 * @param value Value to check
 * @returns True if value is a {@link ReactiveArray}
 */
export function isArray<Item>(value: unknown): value is ReactiveArray<Item> {
	return isMora<ReactiveArray<Item>>(value, NAME_ARRAY);
}

/**
 * Is the value a computed signal?
 * @param value Value to check
 * @returns True if value is a {@link Computed}
 */
export function isComputed<Value>(value: unknown): value is Computed<Value> {
	return isMora<Computed<Value>>(value, NAME_COMPUTED);
}

/**
 * Is the value an effect?
 * @param value Value to check
 * @returns True if value is an {@link Effect}
 */
export function isEffect(value: unknown): value is Effect {
	return isMora<Effect>(value, NAME_EFFECT);
}

function isMora<T>(value: unknown, name: string | Set<string>): value is T {
	return (
		typeof value === 'object' &&
		value != null &&
		'$mora' in value &&
		(typeof name === 'string'
			? (value as PlainObject).$mora === name
			: name.has((value as PlainObject).$mora as never))
	);
}

/**
 * Is the value reactive?
 * @param value Value to check
 * @returns True if value is a {@link Reactive}
 */
export function isReactive<Value, Equal = Value>(
	value: unknown,
): value is Reactive<Value, Equal> {
	return isMora<Reactive<Value, Equal>>(value, NAMES);
}

/**
 * Is the value a signal?
 * @param value Value to check
 * @returns True if value is a {@link Signal}
 */
export function isSignal<Value>(value: unknown): value is Signal<Value> {
	return isMora<Signal<Value>>(value, NAME_SIGNAL);
}

/**
 * Is the value a reactive store?
 * @param value Value to check
 * @returns True if value is a {@link Store}
 */
export function isStore<Value extends PlainObject>(
	value: unknown,
): value is Store<Value> {
	return isMora<Store<Value>>(value, NAME_STORE);
}
