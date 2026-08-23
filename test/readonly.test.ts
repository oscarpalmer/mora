import {expect, test} from 'vitest';
import {array, effect, signal, store} from '../src';

test('reactiveArray', () => {
	const a = array([1, 2, 3]);
	const b = a.asReadonly();
	const c = a.asReadonly(true);

	const counts = [0, 0, 0];

	effect(() => {
		const value = a.get();

		expect(Object.isFrozen(value)).toBe(false);

		counts[0] += 1;
	});

	effect(() => {
		const value = b.get();

		expect(Object.isFrozen(value)).toBe(false);

		counts[1] += 1;
	});

	effect(() => {
		const value = c.get();

		expect(Object.isFrozen(value)).toBe(true);

		counts[2] += 1;
	});

	expect((a as any).frozen).toBe(undefined);
	expect(b.frozen).toBe(false);
	expect(c.frozen).toBe(true);

	expect(Object.is(a.peek(), b.peek())).toBe(true);
	expect(Object.is(b.peek(), c.peek())).toBe(false);
	expect(Object.is(a.peek(), c.peek())).toBe(false);

	expect(Object.isFrozen(a.peek())).toBe(false);
	expect(Object.isFrozen(b.peek())).toBe(false);
	expect(Object.isFrozen(c.peek())).toBe(true);

	expect(a.peek()).toEqual([1, 2, 3]);
	expect(b.peek()).toEqual([1, 2, 3]);
	expect(c.peek()).toEqual([1, 2, 3]);

	a.set([4, 5, 6]);

	expect(a.peek()).toEqual([4, 5, 6]);
	expect(b.peek()).toEqual([4, 5, 6]);
	expect(c.peek()).toEqual([4, 5, 6]);

	expect(() => {
		a.peek().push(7);
		b.peek().push(8);
	}).not.toThrow();

	expect(() => {
		(c.peek() as any).push(9);
	}).toThrow();

	expect(() => {
		(b as any).set([7, 8, 9]);
	}).toThrow();
});

test('reactiveStore', () => {
	const a = store({x: 1, y: 2});
	const b = a.asReadonly();
	const c = a.asReadonly(true);

	expect((a as any).frozen).toBe(undefined);
	expect(b.frozen).toBe(false);
	expect(c.frozen).toBe(true);

	expect(Object.isFrozen(a.peek())).toBe(false);
	expect(Object.isFrozen(b.peek())).toBe(false);
	expect(Object.isFrozen(c.peek())).toBe(true);

	expect(Object.is(a.peek(), b.peek())).toBe(true);
	expect(Object.is(b.peek(), c.peek())).toBe(false);
	expect(Object.is(a.peek(), c.peek())).toBe(false);

	expect(a.peek()).toEqual({x: 1, y: 2});
	expect(b.peek()).toEqual({x: 1, y: 2});
	expect(c.peek()).toEqual({x: 1, y: 2});

	a.set('z', 99);

	expect(a.peek()).toEqual({x: 1, y: 2, z: 99});
	expect(b.peek()).toEqual({x: 1, y: 2, z: 99});
	expect(c.peek()).toEqual({x: 1, y: 2, z: 99});

	expect(() => {
		a.peek().x = 100;
		b.peek().y = 200;
	}).not.toThrow();

	expect(() => {
		(c.peek() as any).z = 300;
	}).toThrow();

	expect(() => {
		(b as any).set('å', 100);
	}).toThrow();
});

test('signal', () => {
	const a = signal(0);
	const b = a.asReadonly();
	const c = a.asReadonly(true);

	expect((a as any).frozen).toBe(undefined);
	expect(b.frozen).toBe(false);
	expect(c.frozen).toBe(true);

	expect(a.peek()).toBe(0);
	expect(b.peek()).toBe(0);
	expect(c.peek()).toBe(0);

	a.set(1);

	expect(a.peek()).toBe(1);
	expect(b.peek()).toBe(1);
	expect(c.peek()).toBe(1);

	expect(() => {
		(b as any).set(2);
	}).toThrow();
});
