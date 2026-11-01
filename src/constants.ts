import type {SubscriptionProperty} from '@oscarpalmer/atoms/subscription';
import type {Active, Batch, SubscriptionType} from './models';

// #region Variables

export const ACTIVE: Active = {};

export const ARRAY_THRESHOLD = 100;

export const ARRAY_OFFSET = 25;

export const ARRAY_PEEK = 10;

export const BATCH: Batch = {
	depth: 0,
	flushing: false,
	queue: [],
	subscriptions: new Set(),
};

export const MESSAGE_COMPUTED_CALLBACK = 'Computed callback must be a function';

export const MESSAGE_DEACTIVATED_ARRAY_FILTER = 'Cannot filter an inactive reactive array';

export const MESSAGE_DEACTIVATED_ARRAY_MAP = 'Cannot map an inactive reactive array';

export const MESSAGE_DEACTIVATED_ARRAY_SELECT = 'Cannot select from an inactive reactive array';

export const MESSAGE_DEACTIVATED_READONLY = 'Cannot create readonly variant of inactive signal';

export const MESSAGE_DEACTIVATED_SUBSCRIPTION = 'Cannot subscribe to inactive signal';

export const MESSAGE_EFFECT_CALLBACK = 'Effect callback must be a function';

export const MESSAGE_SCOPE_CALLBACK = 'Scope callback must be a function';

export const MESSAGE_UPDATE_CALLBACK = 'Update callback must be a function';

export const METHODS_AFFECTING_LENGTH: Set<string | symbol> = new Set([
	'pop',
	'push',
	'shift',
	'unshift',
]);

export const METHODS_UPDATE: Set<string | symbol> = new Set([
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

export const NAME_READONLY = 'readonly';

export const NAME_SIGNAL = 'signal';

export const NAME_STORE = 'store';

export const NAME_SUBSCRIPTION = 'subscription';

export const NAME_ALL: Set<string> = new Set([NAME_ARRAY, NAME_COMPUTED, NAME_SIGNAL, NAME_STORE]);

export const PROPERTY_LENGTH = 'length';

export const STATUS_CHECK = 1;

export const STATUS_CLEAN = 0;

export const STATUS_DIRTY = 2;

export const STATUS_RUNNING = 3;

export const SYMBOL_READONLY: unique symbol = Symbol('readonly');

export const SYMBOL_STATE: unique symbol = Symbol('state');

export const SUBSCRIPTION_PROPERTY: SubscriptionProperty = {
	key: '$mora',
	value: NAME_SUBSCRIPTION,
};

export const SUBSCRIPTION_TYPE_COPY = 'copy' as const;

export const SUBSCRIPTION_TYPE_FROZEN = 'frozen' as const;

export const SUBSCRIPTION_TYPE_ORIGINAL = 'original' as const;

export const SUBSCRIPTION_TYPE_READONLY = 'readonly' as const;

export const SUBSCRIPTION_TYPES_COPY: Set<SubscriptionType> = new Set([
	SUBSCRIPTION_TYPE_COPY,
	SUBSCRIPTION_TYPE_READONLY,
]);

export const SUBSCRIPTION_TYPES: Set<SubscriptionType> = new Set([
	...SUBSCRIPTION_TYPES_COPY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_ORIGINAL,
]);

// #endregion
