import {isPlainObject} from '@oscarpalmer/atoms/is';
import {min, round} from '@oscarpalmer/atoms/math';
import type {GenericCallback} from '@oscarpalmer/atoms/models';
import type {Subscriptions} from '@oscarpalmer/atoms/subscription';
import {flushHandlers, queueObserver} from '../batch';
import {
	ACTIVE,
	ARRAY_OFFSET,
	ARRAY_PEEK,
	ARRAY_THRESHOLD,
	BATCH,
	MESSAGE_UPDATE_CALLBACK,
	NAME_COMPUTED,
	STATUS_CHECK,
	STATUS_CLEAN,
	STATUS_DIRTY,
	SUBSCRIPTION_TYPE_FROZEN,
	SUBSCRIPTION_TYPES,
	SUBSCRIPTION_TYPES_COPY,
	SYMBOL_READONLY,
	SYMBOL_STATE,
} from '../constants';
import type {
	ComputedState,
	InternalReadonly,
	InternalStateful,
	ObserverState,
	ReactiveProxyState,
	ReactiveState,
	SignalState,
	SubscriptionType,
} from '../models';
import {linkSource} from './graph';

// #region Types

type SetValue = (instance: InternalStateful, value: unknown, notify: boolean) => void;

// #endregion

// #region Functions

export function copyValue(value: unknown, copy?: boolean): unknown {
	if (copy !== true) {
		return value;
	}

	if (Array.isArray(value)) {
		return value.slice();
	}

	return isPlainObject(value) ? {...value} : value;
}

export function emitValue(instance: InternalStateful, flush?: boolean): void {
	const state = instance[SYMBOL_STATE];

	notifyObservers(state);

	if (state.subscriptions != null) {
		queueSubscriptions(state, state.subscriptions);
	}

	if ((flush ?? true) && BATCH.depth === 0) {
		flushHandlers();
	}
}

export function equalArrays(
	first: unknown[],
	second: unknown[],
	equal?: (first: unknown, second: unknown) => boolean,
): boolean {
	const {length} = first;

	if (length !== second.length) {
		return false;
	}

	const eq = equal ?? Object.is;

	let offset = 0;

	if (length >= ARRAY_THRESHOLD) {
		offset = round(length / ARRAY_PEEK);
		offset = min([offset, ARRAY_OFFSET]);

		for (let index = 0; index < offset; index += 1) {
			if (
				!(
					eq(first[index], second[index]) &&
					eq(first[length - index - 1], second[length - index - 1])
				)
			) {
				return false;
			}
		}
	}

	const end = length - offset;

	for (let index = offset; index < end; index += 1) {
		if (!eq(first[index], second[index])) {
			return false;
		}
	}

	return true;
}

/**
 * Gets the value to copy or freeze for a signal: an array's or store's target, as reads through its proxy are slow
 *
 * _(The target must never be handed out as-is)_
 */
export function getCopySource(state: SignalState): unknown {
	return (state as Partial<ReactiveProxyState>).target ?? state.value;
}

export function getFrozenValue(value: unknown): unknown {
	let frozen = value;

	if (Array.isArray(frozen)) {
		frozen = Object.freeze(frozen.slice());
	} else if (isPlainObject(frozen)) {
		frozen = Object.freeze({...frozen});
	}

	return frozen;
}

export function getJsonValue(this: InternalReadonly | InternalStateful): unknown {
	if (SYMBOL_READONLY in this && !this[SYMBOL_READONLY].active) {
		return this[SYMBOL_READONLY].value;
	}

	return this[SYMBOL_STATE].value;
}

export function getSignalValue(this: InternalStateful): unknown {
	const state = this[SYMBOL_STATE];

	if (state.active) {
		trackSignal(state);
	}

	return state.value;
}

export function getStringValue(this: InternalReadonly | InternalStateful, json?: boolean): string {
	const value = getJsonValue.call(this);

	return json === true ? JSON.stringify(value) : String(value);
}

export function getSubscriptionValue(state: SignalState, type: SubscriptionType): unknown {
	if (type === SUBSCRIPTION_TYPE_FROZEN) {
		return getFrozenValue(getCopySource(state));
	}

	return SUBSCRIPTION_TYPES_COPY.has(type) ? copyValue(getCopySource(state), true) : state.value;
}

export function handleSignal(
	instance: InternalStateful,
	origin: unknown,
	setValue: SetValue,
	notify?: boolean,
): void {
	const state = instance[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	try {
		const actual = typeof origin === 'function' ? (origin as () => unknown)() : origin;

		if (isPromise(actual)) {
			state.promise = actual;

			void actual
				.then(value => {
					if (actual === state.promise) {
						state.promise = undefined;

						setValue(instance, value, notify ?? false);
					}
				})
				.catch(() => {
					if (actual === state.promise) {
						state.promise = undefined;
					}
				});
		} else {
			setValue(instance, actual, notify ?? false);
		}
	} catch {
		// ?
	}
}

export function isPromise(value: unknown): value is Promise<unknown> {
	// Checking the type first lets primitives skip the (slower) prototype check
	return typeof value === 'object' && value instanceof Promise;
}

function markObserver(node: ObserverState, status: number): void {
	// Push: only marks observers, nothing is (re-)computed here

	if (node.status >= status) {
		return;
	}

	const clean = node.status === STATUS_CLEAN;

	node.status = status;

	// Already queued or propagated when it was first marked
	if (!clean) {
		return;
	}

	if (node.name !== NAME_COMPUTED) {
		queueObserver(node);

		return;
	}

	const computed = node as ComputedState;

	// Subscribers need values pushed to them, so subscribed computeds are refreshed eagerly
	if (computed.subscriptions != null) {
		queueObserver(node);
	}

	// The computed's value may not actually change, so its observers only need to check
	let link = computed.firstObserver;

	while (link != null) {
		markObserver(link.observer, STATUS_CHECK);

		link = link.nextObserver;
	}
}

export function notifyObservers(state: ReactiveState): void {
	let link = state.firstObserver;

	while (link != null) {
		markObserver(link.observer, STATUS_DIRTY);

		link = link.nextObserver;
	}
}

export function peekSignalValue(this: InternalStateful, copy?: boolean): unknown {
	return copyValue(this[SYMBOL_STATE].value, copy);
}

function queueSubscriptions(
	state: SignalState,
	subscriptions: Subscriptions<GenericCallback>,
): void {
	for (const type of SUBSCRIPTION_TYPES) {
		const callbacks = subscriptions.values.to.keyed?.get(type);

		if (callbacks == null || callbacks.size === 0) {
			continue;
		}

		for (const [subscription, callback] of callbacks) {
			// Already queued subscribers keep their place, and read the latest value when called
			if (!BATCH.subscriptions.has(subscription)) {
				BATCH.subscriptions.add(subscription);

				BATCH.queue.push({
					callback,
					state,
					subscription,
					type,
				});
			}
		}
	}
}

export function trackSignal(state: ReactiveState, self?: ObserverState): void {
	const observer = ACTIVE.effect;

	if (observer == null || !observer.active || observer === self) {
		return;
	}

	const previous = observer.cursor;

	// Same source as the previous read
	if (previous?.source === state) {
		return;
	}

	const next = previous == null ? observer.firstSource : previous.nextSource;

	// Same source as in this position last run (the common case: no allocation or lookup)
	if (next?.source === state) {
		next.version = observer.version;

		observer.cursor = next;

		return;
	}

	const last = state.lastObserver;

	// Already read earlier in this run
	if (last?.observer === observer && last.version === observer.version) {
		return;
	}

	observer.cursor = linkSource(observer, state, previous, next);
}

export function updateSignal(
	instance: InternalStateful,
	callback: (value: unknown) => unknown,
	setValue: (instance: InternalStateful, value: unknown) => void,
): void {
	if (typeof callback !== 'function') {
		throw new TypeError(MESSAGE_UPDATE_CALLBACK);
	}

	if (instance[SYMBOL_STATE].active) {
		handleSignal(instance, callback(instance[SYMBOL_STATE].value), setValue);
	}
}

// #endregion
