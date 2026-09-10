import {isKey} from '@oscarpalmer/atoms/is';
import type {Key} from '@oscarpalmer/atoms/models';
import {subscriptions, type Subscription} from '@oscarpalmer/atoms/subscription';
import {
	SUBSCRIPTION_PROPERTY,
	SUBSCRIPTION_TYPE_COPY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_ORIGINAL,
	SUBSCRIPTION_TYPE_READONLY,
	SUBSCRIPTION_TYPES,
	SUBSCRIPTION_TYPES_COPY,
	SYMBOL_STATE,
} from '../constants';
import type {
	InternalProxy,
	InternalReadonly,
	InternalSignal,
	Subscriber,
	SubscriptionType,
} from '../models';
import {getReactiveValueInProxy} from './proxy';
import {getFrozenValue, peekSignalValue} from './value';

// #region Functions

export function subscribeToProxy(
	this: InternalProxy,
	first: Key | Subscriber<unknown>,
	second?: Subscriber<unknown> | boolean,
	third?: boolean,
): Subscription {
	if (isKey(first)) {
		return getReactiveValueInProxy(this as never, first).subscribe(second as never, third as never);
	}

	return subscribeToSignal.call(this, first, second);
}

function subscribeToReactive(
	this: InternalSignal,
	type: SubscriptionType,
	subscriber: Subscriber<unknown>,
): Subscription {
	this[SYMBOL_STATE].subscriptions ??= subscriptions({
		keys: SUBSCRIPTION_TYPES,
		property: SUBSCRIPTION_PROPERTY,
	});

	const [subscription, existing] = this[SYMBOL_STATE].subscriptions.create({
		key: type,
		value: subscriber,
	});

	if (!existing) {
		subscriber(
			type === SUBSCRIPTION_TYPE_FROZEN
				? getFrozenValue(this[SYMBOL_STATE].value)
				: peekSignalValue.call(this, SUBSCRIPTION_TYPES_COPY.has(type)),
			subscription,
		);
	}

	return subscription;
}

export function subscribeToReadonly(
	this: InternalReadonly,
	subscriber: Subscriber<unknown>,
): Subscription {
	return subscribeToReactive.call(
		this,
		this.frozen ? SUBSCRIPTION_TYPE_FROZEN : SUBSCRIPTION_TYPE_READONLY,
		subscriber,
	);
}

export function subscribeToSignal(
	this: InternalSignal,
	subscriber: Subscriber<unknown>,
	copy?: unknown,
): Subscription {
	return subscribeToReactive.call(
		this,
		copy === true ? SUBSCRIPTION_TYPE_COPY : SUBSCRIPTION_TYPE_ORIGINAL,
		subscriber,
	);
}

// #endregion
