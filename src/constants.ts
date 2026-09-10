import type {Active, Batch, SubscriptionType} from './models';

// #region Variables

export const ACTIVE: Active = {};

export const ARRAY_THRESHOLD = 100;

export const ARRAY_OFFSET = 25;

export const ARRAY_PEEK = 10;

export const BATCH: Batch = {
	depth: 0,
	flushing: false,
	handlers: new Map(),
};

export const METHODS_AFFECTING_LENGTH = new Set<string>(['pop', 'push', 'shift', 'unshift']);

export const METHODS_UPDATE = new Set<string>([
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

export const NAME_READONLY = 'readonly';

export const NAME_SIGNAL = 'signal';

export const NAME_STORE = 'store';

export const NAME_SUBSCRIPTION = 'subscription';

export const NAME_ALL = new Set([
	NAME_ARRAY,
	NAME_COMPUTED,
	NAME_READONLY,
	NAME_SIGNAL,
	NAME_STORE,
]);

export const PROPERTY_LENGTH = 'length';

export const SUBSCRIPTION_PROPERTY = {
	key: NAME_MORA,
	value: NAME_SUBSCRIPTION,
};

export const SUBSCRIPTION_TYPE_COPY: SubscriptionType = 'copy';

export const SUBSCRIPTION_TYPE_FROZEN: SubscriptionType = 'frozen';

export const SUBSCRIPTION_TYPE_ORIGINAL: SubscriptionType = 'original';

export const SUBSCRIPTION_TYPE_READONLY: SubscriptionType = 'readonly';

export const SUBSCRIPTION_TYPES_COPY = new Set<SubscriptionType>([
	SUBSCRIPTION_TYPE_COPY,
	SUBSCRIPTION_TYPE_READONLY,
]);

export const SUBSCRIPTION_TYPES: Set<SubscriptionType> = new Set([
	...SUBSCRIPTION_TYPES_COPY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_ORIGINAL,
]);

// #endregion
