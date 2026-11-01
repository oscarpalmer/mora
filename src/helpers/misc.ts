import {noop} from '@oscarpalmer/atoms/function';
import type {PlainObject} from '@oscarpalmer/atoms/models';
import {SYMBOL_READONLY, SYMBOL_STATE} from '../constants';
import {deactivateEffect, disposeChildren, removeChild} from '../effect';
import type {
	ComputedState,
	InternalArray,
	InternalComputed,
	InternalReactive,
	InternalReadonly,
	InternalStore,
	ReactiveOptions,
	SignalState,
} from '../models';
import {unlinkSource} from './graph';
import {peekSignalValue} from './value';

// #region Functions

export function deactivateComputed(this: InternalComputed): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	removeChild(state);
	deactivateComputedState(state);
}

export function deactivateComputedState(state: ComputedState): void {
	// Unlinks it from its sources (as an observer), and from its observers (as a source)
	deactivateEffect(state);
	deactivateState(state);
}

export function deactivateProxy(this: InternalArray | InternalStore): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	// Includes its keyed computeds, as well as top-level `filter`/`map`/`select` computeds
	disposeChildren(state);

	if (state.mapped != null) {
		state.mapped.clear();

		state.mapped = undefined;
	}

	deactivateState(state);
}

export function deactivateReactive(this: InternalReactive): void {
	const state = this[SYMBOL_STATE];

	if (state.active) {
		deactivateState(state);
	}
}

export function deactivateReadonly(this: InternalReadonly): void {
	const readonly = this[SYMBOL_READONLY];
	const signal = this[SYMBOL_STATE];

	if (!readonly.active) {
		return;
	}

	// Lets `asReadonly()` create a new readonly for the signal
	(signal.readonlies as PlainObject)![readonly.name] = undefined;

	if (readonly.subscriptions != null) {
		for (const subscription of readonly.subscriptions) {
			subscription.unsubscribe();
		}

		readonly.subscriptions.clear();

		readonly.subscriptions = undefined;
	}

	readonly.active = false;
	readonly.value = peekSignalValue.call(this, true);
}

function deactivateState(state: SignalState): void {
	state.active = false;

	let link = state.firstObserver;

	while (link != null) {
		unlinkSource(link);

		link = link.nextObserver;
	}

	state.promises?.clear();
	state.readonlies?.frozen?.deactivate();
	state.readonlies?.original?.deactivate();
	state.subscriptions?.clear();

	state.equal = noop as never;
	state.promise = undefined;

	state.firstObserver = undefined;
	state.lastObserver = undefined;
	state.promises = undefined;
	state.readonlies = undefined;
	state.subscriptions = undefined;
}

export function getReactiveActive(this: InternalReactive): boolean {
	return this[SYMBOL_STATE].active;
}

export function getReadonlyActive(this: InternalReadonly): boolean {
	return this[SYMBOL_READONLY].active;
}

export function getState(
	name: string,
	value: unknown,
	options?: ReactiveOptions<unknown>,
): SignalState {
	return {
		name,
		value,
		active: true,
		equal:
			typeof options === 'object' && typeof options?.equal === 'function'
				? options.equal
				: undefined,
		firstObserver: undefined,
		lastObserver: undefined,
		promise: undefined,
		promises: undefined,
		readonlies: undefined,
		subscriptions: undefined,
	};
}

// #endregion
