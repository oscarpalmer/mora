import type {Reactive, ReactiveOptions, ReactiveState} from '../models';

// #region Functions

export function reactive<Value, Item = Value>(
	value: Value,
	options?: ReactiveOptions<Item>,
): [Reactive<Value>, ReactiveState<Value, Item>] {
	const state: ReactiveState<Value, Item> = {
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

// #endregion
