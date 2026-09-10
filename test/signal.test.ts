import {expect, test} from 'vitest';
import {effect, signal} from '../src';

test('basic', () => {
	let count = 0;

	const value = signal(1);

	value.subscribe(() => {
		count += 1;
	});

	expect(value.peek()).toBe(1);
	expect(count).toBe(1);

	value.set(2);

	expect(value.peek()).toBe(2);
	expect(count).toBe(2);

	value.update(current => current + 1);

	expect(value.peek()).toBe(3);
	expect(count).toBe(3);

	value.set(3);

	expect(value.peek()).toBe(3);
	expect(count).toBe(3);

	expect(value.toJSON()).toEqual(3);
	expect(value.toString()).toBe('3');

	expect(() => value.update(undefined as never)).toThrow();
});

test('peek', () => {
	const value = signal(1);

	let count = 0;

	effect(() => {
		value.peek();

		count += 1;
	});

	for (let index = 0; index < 100; index += 1) {
		value.update(current => current + 1);
	}

	expect(value.peek()).toBe(101);
	expect(count).toBe(1);
});

test('peek, copy', () => {
	const obj = signal({a: 1, b: 2, c: 3});

	const peeked = obj.peek();
	const copied = obj.peek(true);

	expect(peeked).toEqual({a: 1, b: 2, c: 3});
	expect(copied).toEqual({a: 1, b: 2, c: 3});
	expect(copied).not.toBe(peeked);
	expect(peeked).toBe(obj.peek());
	expect(copied).not.toBe(obj.peek());
	expect(copied).not.toBe(obj.peek(true));

	const num = signal(1);

	expect(num.peek()).toBe(num.peek(true));
});

test('function value', () =>
	new Promise<void>(done => {
		const value = signal(() => 1);

		expect(value.peek()).toBe(1);

		value.set(() => 2);

		expect(value.peek()).toBe(2);

		value.set(() => {
			throw new Error('Should be a silent error');
		});

		expect(value.peek()).toBe(2);

		value.set(() => new Promise<number>(resolve => setTimeout(() => resolve(3), 25)));

		expect(value.peek()).toBe(2);

		setTimeout(() => {
			expect(value.peek()).toBe(3);

			done();
		}, 50);
	}));

test('promise value', () =>
	new Promise<void>(done => {
		const value = signal(new Promise<number>(resolve => setTimeout(() => resolve(1), 25)));

		expect(value.peek()).toBeUndefined();

		setTimeout(() => {
			expect(value.peek()).toBe(1);

			value.set(
				new Promise<number>((_, reject) =>
					setTimeout(() => reject(new Error('Should be a silent error')), 25),
				),
			);

			value.set(
				new Promise<number>((_, reject) =>
					setTimeout(() => reject(new Error('Should be a silent error')), 25),
				),
			);
		}, 50);

		setTimeout(() => {
			expect(value.peek()).toBe(1);

			value.set(new Promise<number>(resolve => setTimeout(() => resolve(2), 25)));
			value.set(new Promise<number>(resolve => setTimeout(() => resolve(3), 25)));
			value.set(new Promise<number>(resolve => setTimeout(() => resolve(4), 25)));
			value.set(new Promise<number>(resolve => setTimeout(() => resolve(5), 25)));
		}, 100);

		setTimeout(() => {
			expect(value.peek()).toBe(5);

			done();
		}, 150);
	}));
