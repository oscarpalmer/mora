import type {Reactive, ReactiveOptions, ReactiveState} from '../models';

export function reactive<Value, Equal = Value>(
	value: Value,
	options?: ReactiveOptions<Equal>,
): [Reactive<Value>, ReactiveState<Value, Equal>] {
	const state: ReactiveState<Value, Equal> = {
		computeds: new Set(),
		effects: new Set(),
		equal:
			typeof options === 'object' && typeof options?.equal === 'function'
				? options.equal
				: Object.is,
		subscriptions: new Map(),
		value: value as Value,
	};

	const instance = {
		toJSON: () => state.value,
		toString: () => String(state.value),
	};

	return [instance, state];
}
