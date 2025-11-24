import type {Effect} from './effect';
import type {Active, Batch} from './models';
import type {Subscription} from './subscription';

export const ACTIVE: Active = {};

export const ARRAY_THRESHOLD = 100;

export const ARRAY_OFFSET = 25;

export const ARRAY_PEEK = 10;

export const BATCH: Batch = {
	depth: 0,
	handlers: new Set<Effect | Subscription>(),
};

export const METHODS_AFFECTING_LENGTH: Set<string> = new Set<string>([
	'pop',
	'push',
	'shift',
	'unshift',
]);

export const METHODS_UPDATE: Set<string> = new Set<string>([
	...METHODS_AFFECTING_LENGTH,
	'copyWithin',
	'fill',
	'reverse',
	'sort',
	'splice',
]);

export const NAME_ARRAY = 'array';

export const NAME_COMPUTED = 'computed';

export const NAME_EFFECT = 'effect';

export const NAME_MORA = '$mora';

export const NAME_SIGNAL = 'signal';

export const NAME_STORE = 'store';

export const NAMES: Set<string> = new Set([
	NAME_ARRAY,
	NAME_COMPUTED,
	NAME_SIGNAL,
	NAME_STORE,
]);

export const PROPERTY_LENGTH = 'length';
