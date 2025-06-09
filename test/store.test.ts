import {expect, test} from 'vitest';
import {effect, store} from '../src';

test('basic', () => {
	const a = store({a: 1, b: 2, c: 3});

	const counts = {
		obj: 0,
		a: 0,
	};

	effect(() => {
		a.get();

		counts.obj += 1;
	});

	effect(() => {
		a.get('a');

		counts.a += 1;
	});

	expect(counts.obj).toBe(1);
	expect(counts.a).toBe(1);
	expect(a.peek()).toEqual({a: 1, b: 2, c: 3});
	expect(a.peek('a')).toBe(1);

	a.set({a: 1, b: 2, c: 4});

	expect(counts.obj).toBe(2);
	expect(counts.a).toBe(1);
	expect(a.peek()).toEqual({a: 1, b: 2, c: 4});
	expect(a.peek('a')).toBe(1);

	a.set({a: 1, b: 2, d: 99} as never);

	expect(counts.obj).toBe(3);
	expect(counts.a).toBe(1);
	expect(a.peek()).toEqual({a: 1, b: 2, d: 99});
	expect(a.peek('a')).toBe(1);

	a.set('a', 123);

	expect(counts.obj).toBe(4);
	expect(counts.a).toBe(2);
	expect(a.peek()).toEqual({a: 123, b: 2, d: 99});
	expect(a.peek('a')).toBe(123);

	a.set('a', 123);

	expect(counts.obj).toBe(4);
	expect(counts.a).toBe(2);
	expect(a.peek()).toEqual({a: 123, b: 2, d: 99});
	expect(a.peek('a')).toBe(123);

	a.set();

	expect(counts.obj).toBe(5);
	expect(counts.a).toBe(3);
	expect(a.peek()).toEqual({});
	expect(a.peek('a')).toBeUndefined();

	a.set([] as never);

	expect(counts.obj).toBe(5);
	expect(counts.a).toBe(3);
	expect(a.peek()).toEqual({});
	expect(a.peek('a')).toBeUndefined();

	expect(store('blah' as never).peek()).toEqual({});
});
