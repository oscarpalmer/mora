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

	expect(a.peek()).toBe(101);
	expect(count).toBe(1);
});

test('function value', () =>
	new Promise<void>(done => {
		const sig = signal(() => 1);

		expect(sig.peek()).toBe(1);

		sig.set(() => 2);

		expect(sig.peek()).toBe(2);

		sig.set(() => {
			throw new Error('Should be a silent error');
		});

		expect(sig.peek()).toBe(2);

		sig.set(() => new Promise<number>(resolve => setTimeout(() => resolve(3), 25)));

		expect(sig.peek()).toBe(2);

		setTimeout(() => {
			expect(sig.peek()).toBe(3);

			done();
		}, 50);
	}));

test('promise value', () =>
	new Promise<void>(done => {
		const sig = signal(new Promise<number>(resolve => setTimeout(() => resolve(1), 25)));

		expect(sig.peek()).toBeUndefined();

		setTimeout(() => {
			expect(sig.peek()).toBe(1);

			sig.set(
				new Promise<number>((_, reject) =>
					setTimeout(() => reject(new Error('Should be a silent error')), 25),
				),
			);

			sig.set(
				new Promise<number>((_, reject) =>
					setTimeout(() => reject(new Error('Should be a silent error')), 25),
				),
			);
		}, 50);

		setTimeout(() => {
			expect(sig.peek()).toBe(1);

			sig.set(new Promise<number>(resolve => setTimeout(() => resolve(2), 25)));
			sig.set(new Promise<number>(resolve => setTimeout(() => resolve(3), 25)));
			sig.set(new Promise<number>(resolve => setTimeout(() => resolve(4), 25)));
			sig.set(new Promise<number>(resolve => setTimeout(() => resolve(5), 25)));
		}, 100);

		setTimeout(() => {
			expect(sig.peek()).toBe(5);

			done();
		}, 150);
	}));
