import {expect, test} from 'vite-plus/test';
import {array, effect, signal, store} from '../src';

test('array', () => {
	const a = array([1, 2, 3]);
	const b = a.asReadonly();
	const c = a.asReadonly(true);

	let count = 0;

	effect(() => {
		expect(Object.isFrozen(a.get())).toBe(false);
		expect(Object.isFrozen(b.get())).toBe(false);
		expect(Object.isFrozen(c.get())).toBe(true);

		count += 1;
	});

	expect(b.frozen).toBe(false);
	expect(c.frozen).toBe(true);

	expect(b.peek()).toBe(a.peek());
	expect(b.peek(true)).toEqual(a.peek());
	expect(b.peek(true)).not.toBe(a.peek());
	expect(c.peek()).not.toBe(a.peek());
	expect(Object.isFrozen(c.peek())).toBe(true);

	a.set([4, 5, 6]);

	expect(count).toBe(2);
	expect(b.peek()).toEqual([4, 5, 6]);
	expect(c.peek()).toEqual([4, 5, 6]);

	expect(() => (c.peek() as any).push(7)).toThrow();
	expect(() => (b as any).set([7, 8, 9])).toThrow();
});

test('signal', () => {
	const a = signal(0);
	const b = a.asReadonly();
	const c = a.asReadonly(true);

	expect((a as any).frozen).toBeUndefined();
	expect(b.frozen).toBe(false);
	expect(c.frozen).toBe(true);

	expect(b.active).toBe(true);
	expect(c.active).toBe(true);

	a.set(1);

	expect(b.peek()).toBe(1);
	expect(c.peek()).toBe(1);

	b.deactivate();
	b.deactivate();

	expect(b.active).toBe(false);
	expect(c.active).toBe(true);

	a.set(2);

	expect(b.get()).toBe(1);
	expect(b.peek()).toBe(1);
	expect(b.toJSON()).toBe(1);
	expect(b.toString()).toBe('1');

	expect(c.get()).toBe(2);
	expect(c.toJSON()).toBe(2);
	expect(c.toString()).toBe('2');

	a.deactivate();

	expect(c.active).toBe(false);

	a.set(3);

	expect(a.peek()).toBe(2);
	expect(c.peek()).toBe(2);

	expect(() => a.asReadonly()).toThrow();
	expect(() => (b as any).set(2)).toThrow();
});

test('store', () => {
	const a = store({x: 1, y: 2});
	const b = a.asReadonly();
	const c = a.asReadonly(true);

	expect(b.frozen).toBe(false);
	expect(c.frozen).toBe(true);

	expect(b.peek()).toBe(a.peek());
	expect(c.peek()).not.toBe(a.peek());
	expect(Object.isFrozen(c.peek())).toBe(true);

	a.set('z', 99);

	expect(b.peek()).toEqual({x: 1, y: 2, z: 99});
	expect(c.peek()).toEqual({x: 1, y: 2, z: 99});

	expect(() => {
		(c.peek() as any).z = 300;
	}).toThrow();

	expect(() => (b as any).set('å', 100)).toThrow();
});

test('subscriptions', () => {
	function onFirst() {
		counts[0] += 1;
	}

	function onSecond() {
		counts[1] += 1;
	}

	const value = signal(1);
	const readonly = value.asReadonly();
	const frozen = value.asReadonly(true);

	const counts = [0, 0];

	const valueSubscription = value.subscribe(onFirst);
	const readonlySubscription = readonly.subscribe(onFirst);
	const frozenSubscription = frozen.subscribe(onFirst);

	readonly.subscribe(() => {}).unsubscribe();

	readonly.subscribe(onSecond);

	expect(counts).toEqual([3, 1]);

	value.set(2);

	expect(counts).toEqual([6, 2]);

	valueSubscription.unsubscribe();
	readonlySubscription.unsubscribe();
	frozenSubscription.unsubscribe();

	value.set(3);

	expect(counts).toEqual([6, 3]);

	readonly.deactivate();

	value.set(4);

	expect(counts).toEqual([6, 3]);

	expect(() => readonly.subscribe(() => {})).toThrow();
});
