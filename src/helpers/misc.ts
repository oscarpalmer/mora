import {noop} from '@oscarpalmer/atoms/function';
import type {PlainObject} from '@oscarpalmer/atoms/models';
import {SYMBOL_EFFECT, SYMBOL_READONLY, SYMBOL_STATE} from '../constants';
import {deactivateEffect, disposeChildren} from '../effect';
import type {
	InternalArray,
	InternalComputed,
	InternalReactive,
	InternalReadonly,
	InternalStore,
	ReactiveOptions,
	SignalState,
} from '../models';
import {peekSignalValue} from './value';

// #region Functions

export function deactivateComputed(this: InternalComputed): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	const fx = this[SYMBOL_EFFECT];

	fx.instance.parent?.children?.delete(this);

	deactivateEffect(fx.instance);

	deactivateReactive.call(this);
}

export function deactivateProxy(this: InternalArray | InternalStore): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	disposeChildren(state);

	if (state.mapped != null) {
		state.mapped.clear();

		state.mapped = undefined;
	}

	deactivateReactive.call(this);
}

export function deactivateReactive(this: InternalReactive): void {
	const state = this[SYMBOL_STATE];

	if (!state.active) {
		return;
	}

	state.active = false;

	if (state.observers != null) {
		for (const observer of state.observers) {
			observer.sources?.delete(state);
		}

		state.observers.clear();
	}

	state.promises?.clear();
	state.readonlies?.frozen?.deactivate();
	state.readonlies?.original?.deactivate();
	state.subscriptions?.clear();

	state.equal = noop as never;
	state.promise = undefined;

	state.observers = undefined;
	state.promises = undefined;
	state.readonlies = undefined;
	state.subscriptions = undefined;
}

export function deactivateReadonly(this: InternalReadonly): void {
	const readonly = this[SYMBOL_READONLY];
	const signal = this[SYMBOL_STATE];

	if (!readonly.active) {
		return;
	}

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
		observers: undefined,
		promise: undefined,
		promises: undefined,
		readonlies: undefined,
		subscriptions: undefined,
	};
}

// #endregion
