import {expect, test} from 'vitest';
import {effect, signal} from '../src';

test('basic', () => {
	const value = signal(1);

	expect(value.peek()).toBe(1);

	value.set(2);

	expect(value.peek()).toBe(2);

	value.update(current => current + 1);

	expect(value.peek()).toBe(3);

	value.set(3);

	expect(value.peek()).toBe(3);

	expect(value.toJSON()).toEqual(3);
	expect(value.toString()).toBe('3');
});

test('peek', () => {
	const a = signal(1);

	let count = 0;

	effect(() => {
		a.peek();

		count += 1;
	});

	for (let index = 0; index < 100; index += 1) {
		a.update(current => current + 1);
	}

	expect(count).toBe(1);
	expect(a.peek()).toBe(101);
});
