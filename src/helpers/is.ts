import type {PlainObject} from '@oscarpalmer/atoms/models';
import type {Effect} from '../effect';
import type {ReactiveArray} from '../value/array';
import type {Computed} from '../value/computed';
import type {Reactive} from '../value/reactive';
import type {Signal} from '../value/signal';
import type {Store} from '../value/store';

/**
 * Is the value a reactive array?
 */
export function isArray(value: unknown): value is ReactiveArray<unknown> {
	return isMora<ReactiveArray<unknown>>(value, arrayName);
}

/**
 * Is the value a computed signal?
 */
export function isComputed(value: unknown): value is Computed<unknown> {
	return isMora<Computed<unknown>>(value, computedName);
}

/**
 * Is the value an effect?
 */
export function isEffect(value: unknown): value is Effect {
	return isMora<Effect>(value, effectName);
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

export function isReactive(value: unknown): value is Reactive<unknown> {
	return isMora<Reactive<unknown>>(value, reactiveNames);
}

/**
 * Is the value a signal?
 */
export function isSignal(value: unknown): value is Signal<unknown> {
	return isMora<Signal<unknown>>(value, signalName);
}

export function isStore(value: unknown): value is Store<PlainObject> {
	return isMora<Reactive<unknown>>(value, storeName);
}

export const arrayName = 'array';
export const computedName = 'computed';
export const effectName = 'effect';
export const signalName = 'signal';
export const storeName = 'store';

const reactiveNames = new Set([arrayName, computedName, signalName, storeName]);
