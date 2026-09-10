import type {ReactiveOptions, ReactiveState} from '../models';

// #region Functions

export function getState(value: unknown, options?: ReactiveOptions<unknown>): ReactiveState {
	return {
		value,
		equal:
			typeof options === 'object' && typeof options?.equal === 'function'
				? options.equal
				: undefined,
	};
}

// #endregion
