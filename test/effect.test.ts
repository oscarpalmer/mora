import {expect, test} from 'vitest';
import {effect, signal} from '../src';

test('effect', () => {
	const value = signal(0);

	let count = 0;
	let total = 0;

	effect(() => {
		count += 1;
		total = value.get();
	});

	for (let index = 0; index < 100; index += 1) {
		value.update(current => current + index);
	}

	expect(count).toBe(100);
	expect(total).toBe(4950);
});
