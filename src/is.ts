import type {PlainObject} from '@oscarpalmer/atoms/models';
import type {Computed} from './computed';
import type {Effect} from './effect';
import type {Signal} from './signal';

/**
 * Is the value a computed signal?
 */
export function isComputed(value: unknown): value is Computed<unknown> {
	return isMora<Computed<unknown>>(value, 'computed');
}

/**
 * Is the value an effect?
 */
export function isEffect(value: unknown): value is Effect {
	return isMora<Effect>(value, 'effect');
}

function isMora<T>(value: unknown, name: string): value is T {
	return (
		typeof value === 'object' &&
		value != null &&
		'$mora' in value &&
		(value as PlainObject).$mora === name
	);
}

/**
 * Is the value a signal?
 */
export function isSignal(value: unknown): value is Signal<unknown> {
	return isMora<Signal<unknown>>(value, 'signal');
}
