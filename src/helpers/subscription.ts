import {isKey} from '@oscarpalmer/atoms/is';
import type {Key} from '@oscarpalmer/atoms/models';
import {subscriptions, type Subscription} from '@oscarpalmer/atoms/subscription';
import {
	SUBSCRIPTION_PROPERTY,
	SUBSCRIPTION_TYPE_COPY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPE_ORIGINAL,
	SUBSCRIPTION_TYPES,
	SUBSCRIPTION_TYPES_COPY,
} from '../constants';
import type {
	Computed,
	ComputedEffect,
	ReactiveArray,
	ReactiveState,
	ReactiveStore,
	SubscriptionType,
} from '../models';
import {getReactiveValueInProxy} from './proxy';
import {getFrozenValue, peekSimpleValue} from './value';

export function subscribeToProxy<Value, Item = Value>(
	isArray: boolean,
	instance: ReactiveArray<Value> | ReactiveStore<Value>,
	state: ReactiveState<Value, Item>,
	mapped: Map<Key, [Computed<unknown>, ComputedEffect]>,
	first: Key | ((value: unknown) => unknown),
	second?: ((value: unknown) => unknown) | boolean,
	third?: boolean,
): Subscription {
	if (isKey(first)) {
		return getReactiveValueInProxy(instance as never, mapped, first, isArray).subscribe(
			second as never,
			third as never,
		);
	}

	return subscribeToSignal(state, first, second === true);
}

export function subscribeToReactive<Value, Item = Value>(
	type: SubscriptionType,
	state: ReactiveState<Value, Item>,
	callback: (value: unknown) => unknown,
): Subscription {
	state.subscriptions ??= subscriptions({
		keys: SUBSCRIPTION_TYPES,
		property: SUBSCRIPTION_PROPERTY,
	});

	const [subscription, existing] = state.subscriptions.create({
		key: type,
		value: callback,
	});

	if (!existing) {
		callback(
			type === SUBSCRIPTION_TYPE_FROZEN
				? getFrozenValue(state.value)
				: peekSimpleValue(state.value, SUBSCRIPTION_TYPES_COPY.has(type)),
		);
	}

	return subscription;
}

export function subscribeToSignal<Value, Item = Value>(
	state: ReactiveState<Value, Item>,
	callback: (value: unknown) => unknown,
	copy: boolean,
): Subscription {
	return subscribeToReactive(
		copy ? SUBSCRIPTION_TYPE_COPY : SUBSCRIPTION_TYPE_ORIGINAL,
		state,
		callback,
	);
}
