import {expect, test} from 'vitest';
import {signal} from '../src';

test('signal', () => {
	const value = signal(1);

	expect(value.get()).toBe(1);

	value.set(2);

	expect(value.get()).toBe(2);

	value.update(current => current + 1);

	expect(value.get()).toBe(3);

	value.set(3);

	expect(value.get()).toBe(3);
});
