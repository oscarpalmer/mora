import {expect, test} from 'vitest';
import {array, effect} from '../src';

test('basic', () => {
	const a = array([1, 2, 3, 4, 5]);
	const b = array('blah' as never);

	let count = 0;

	effect(() => {
		a.get();

		count += 1;
	});

	expect(count).toBe(1);
	expect(a.length).toBe(5);

	expect(b.peek()).toEqual([]);

	expect(a.toString()).toBe('1,2,3,4,5');
	expect(a.toJSON()).toEqual([1, 2, 3, 4, 5]);
});

test('clear', () => {
	const a = array([1, 2, 3, 4, 5]);
	const b = a.map(item => item * 2);

	expect(b.peek()).toEqual([2, 4, 6, 8, 10]);

	a.clear();

	expect(a.peek()).toEqual([]);
	expect(b.peek()).toEqual([]);
});

test('emit', () => {
	const a = array(Array.from({length: 100}, (_, i) => i));
	const b = array(Array.from({length: 300}, (_, i) => i));

	const counts = {
		a: 0,
		b: 0,
	};

	effect(() => {
		a.get();

		counts.a += 1;
	});

	effect(() => {
		b.get();

		counts.b += 1;
	});

	expect(counts.a).toBe(1);
	expect(counts.b).toBe(1);

	a.set(Array.from({length: 100}, (_, i) => (i === 5 ? i + 1 : 1)));

	expect(counts.a).toBe(2);

	a.set(Array.from({length: 100}, (_, i) => (i === 95 ? i + 1 : 1)));

	expect(counts.a).toBe(3);

	a.set(Array.from({length: 100}, (_, i) => i));

	expect(counts.a).toBe(4);

	a.set(Array.from({length: 100}, (_, i) => i));

	expect(counts.a).toBe(4);

	b.set(Array.from({length: 300}, (_, i) => (i === 150 ? i + 1 : 1)));

	expect(counts.b).toBe(2);
});

test('filter', () => {
	const a = array([1, 2, 3, 4, 5]);
	const b = a.filter(item => item % 2 === 0);

	expect(b.peek()).toEqual([2, 4]);

	a.push(6, 7, 8);

	expect(b.peek()).toEqual([2, 4, 6, 8]);

	a.set([]);

	expect(b.peek()).toEqual([]);
});

test('length', () => {
	const a = array([1, 2, 3, 4, 5]);

	let count = 0;

	effect(() => {
		a.get('length');

		count += 1;
	});

	expect(a.length).toBe(5);
	expect(count).toBe(1);

	a.length = 10;

	expect(a.length).toBe(10);
	expect(count).toBe(2);

	a.length = -3;

	expect(a.length).toBe(10);
	expect(count).toBe(2);

	a.length = 'blah' as never;

	expect(a.length).toBe(10);
	expect(count).toBe(2);
});

test('map', () => {
	const a = array([1, 2, 3, 4, 5]);
	const b = a.map(item => item * 2);

	expect(b.peek()).toEqual([2, 4, 6, 8, 10]);

	a.push(6, 7, 8);

	expect(b.peek()).toEqual([2, 4, 6, 8, 10, 12, 14, 16]);

	a.set([]);

	expect(b.peek()).toEqual([]);
});

test('peek', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.peek()).toEqual([1, 2, 3, 4, 5]);
	expect(a.peek(true)).toBe(5);
	expect(a.peek('blah' as never)).toEqual([1, 2, 3, 4, 5]);
});

test('set', () => {
	const a = array([1, 2, 3, 4, 5]);

	let count = 0;

	effect(() => {
		a.get();

		count += 1;
	});

	expect(a.peek()).toEqual([1, 2, 3, 4, 5]);

	a.set([6, 7, 8]);

	expect(a.peek()).toEqual([6, 7, 8]);
	expect(count).toBe(2);

	a.set(1, 999);

	expect(a.peek()).toEqual([6, 999, 8]);
	expect(count).toBe(3);

	a.set(1, 999);

	expect(a.peek()).toEqual([6, 999, 8]);
	expect(count).toBe(3);

	a.set('length', 10);

	expect(a.length).toBe(10);
	expect(a.peek()).toEqual([
		6,
		999,
		8,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
		undefined,
	]);
	expect(count).toBe(4);

	a.set('blah' as never, 'Hello, world!' as never);

	expect(a.peek()['blah' as never]).toBeUndefined();

	a.get()['blah' as never] = 'Hello, world!' as never;

	expect(a.get()['blah' as never]).toBe('Hello, world!');
});

test('update: copyWith', () => {
	const a = array([1, 2, 3, 4, 5]);

	a.get().copyWithin(0, 2);

	expect(a.peek()).toEqual([3, 4, 5, 4, 5]);

	a.get().copyWithin(1, 3, 4);

	expect(a.peek()).toEqual([3, 4, 5, 4, 5]);
});

test('update: fill', () => {
	const a = array([1, 2, 3, 4, 5]);

	a.get().fill(99);

	expect(a.peek()).toEqual([99, 99, 99, 99, 99]);

	a.get().fill(100, 1);

	expect(a.peek()).toEqual([99, 100, 100, 100, 100]);

	a.get().fill(101, 1, 3);

	expect(a.peek()).toEqual([99, 101, 101, 100, 100]);
});

test('update: pop', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.pop()).toBe(5);
	expect(a.peek()).toEqual([1, 2, 3, 4]);
});

test('update: push', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.push(6)).toBe(6);
	expect(a.peek()).toEqual([1, 2, 3, 4, 5, 6]);
	expect(a.length).toBe(6);
});

test('update: reverse', () => {
	const a = array([1, 2, 3, 4, 5]);

	a.get().reverse();

	expect(a.peek()).toEqual([5, 4, 3, 2, 1]);
});

test('update: shift', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.shift()).toBe(1);
	expect(a.peek()).toEqual([2, 3, 4, 5]);
	expect(a.length).toBe(4);
});

test('update: sort', () => {
	const a = array([5, 4, 3, 2, 1]);

	a.get().sort();

	expect(a.peek()).toEqual([1, 2, 3, 4, 5]);
});

test('update: splice + (get)', () => {
	const a = array([1, 2, 3, 4, 5]);

	let first: unknown;
	let last: unknown;

	effect(() => {
		first = a.get(0);
		last = a.get(-1);
	});

	expect(a.splice(0, 2)).toEqual([1, 2]);
	expect(a.peek()).toEqual([3, 4, 5]);

	expect(first).toBe(3);
	expect(last).toBe(5);

	a.splice(1, 0, 6);

	expect(a.peek()).toEqual([3, 6, 4, 5]);

	expect(first).toBe(3);
	expect(last).toBe(5);

	a.splice(0);

	expect(a.peek()).toEqual([]);

	expect(first).toBe(undefined);
	expect(last).toBe(undefined);
});

test('update: unshift', () => {
	const a = array([1, 2, 3, 4, 5]);

	expect(a.unshift(0)).toBe(6);
	expect(a.peek()).toEqual([0, 1, 2, 3, 4, 5]);
	expect(a.length).toBe(6);
});
