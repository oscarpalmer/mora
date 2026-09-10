import type {ReactiveOptions, ReactiveState} from '../models';

// #region Functions

export function getState<Value, Item = Value>(
	value: Value,
	options?: ReactiveOptions<Item>,
): ReactiveState<Value, Item> {
	return {
		equal:
			typeof options === 'object' && typeof options?.equal === 'function'
				? options.equal
				: Object.is,
		value: value as Value,
	};
}

// #endregion
