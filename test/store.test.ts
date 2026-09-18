import {expect, test} from 'vitest';
import {effect, store} from '../src';

test('basic', () => {
	const stored = store({a: 1, b: 2, c: 3});

	const counts = {
		obj: 0,
		a: 0,
	};

	effect(() => {
		stored.get();

		counts.obj += 1;
	});

	effect(() => {
		stored.get('a');

		counts.a += 1;
	});

	expect(counts.obj).toBe(1);
	expect(counts.a).toBe(1);
	expect(stored.peek()).toEqual({a: 1, b: 2, c: 3});
	expect(stored.peek('a')).toBe(1);

	expect(stored.toJSON()).toEqual({a: 1, b: 2, c: 3});
	expect(stored.toString()).toBe('[object Object]');
	expect(stored.toString(true)).toBe('{"a":1,"b":2,"c":3}');

	stored.set({a: 1, b: 2, c: 4});

	expect(counts.obj).toBe(2);
	expect(counts.a).toBe(1);
	expect(stored.peek()).toEqual({a: 1, b: 2, c: 4});
	expect(stored.peek('a')).toBe(1);

	stored.set({a: 1, b: 2, d: 99} as never);

	expect(counts.obj).toBe(3);
	expect(counts.a).toBe(1);
	expect(stored.peek()).toEqual({a: 1, b: 2, d: 99});
	expect(stored.peek('a')).toBe(1);

	stored.set('a', 123);

	expect(counts.obj).toBe(4);
	expect(counts.a).toBe(2);
	expect(stored.peek()).toEqual({a: 123, b: 2, d: 99});
	expect(stored.peek('a')).toBe(123);

	stored.set('a', 123);

	expect(counts.obj).toBe(4);
	expect(counts.a).toBe(2);
	expect(stored.peek()).toEqual({a: 123, b: 2, d: 99});
	expect(stored.peek('a')).toBe(123);

	stored.set();

	expect(counts.obj).toBe(5);
	expect(counts.a).toBe(3);
	expect(stored.peek()).toEqual({});
	expect(stored.peek('a')).toBeUndefined();

	stored.set([] as never);

	expect(counts.obj).toBe(5);
	expect(counts.a).toBe(3);
	expect(stored.peek()).toEqual({});
	expect(stored.peek('a')).toBeUndefined();

	expect(store('blah' as never).peek()).toEqual({});
});

test('function', () => {
	const count = {
		obj: 0,
		key: 0,
	};

	const stored = store({
		a: 1,
		b: 2,
		c: 3,
	});

	stored.subscribe(() => {
		count.obj += 1;
	});

	stored.subscribe('a', () => {
		count.key += 1;
	});

	expect(stored.peek()).toEqual({a: 1, b: 2, c: 3});
	expect(stored.peek('a')).toBe(1);

	expect(count.obj).toBe(1);
	expect(count.key).toBe(1);

	stored.set('a', () => 123);

	expect(stored.peek()).toEqual({a: 123, b: 2, c: 3});
	expect(stored.peek('a')).toBe(123);

	expect(count.obj).toBe(2);
	expect(count.key).toBe(2);

	stored.set('a', () => {
		throw new Error('Should be a silent error');
	});

	expect(stored.peek()).toEqual({a: 123, b: 2, c: 3});
	expect(stored.peek('a')).toBe(123);

	expect(count.obj).toBe(2);
	expect(count.key).toBe(2);

	stored.set(() => ({
		a: 9,
		b: 8,
		c: 7,
	}));

	expect(count.obj).toBe(3);
	expect(count.key).toBe(3);

	expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
	expect(stored.peek('a')).toBe(9);

	stored.set(() => {
		throw new Error('Should be a silent error');
	});

	expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
	expect(stored.peek('a')).toBe(9);

	expect(count.obj).toBe(3);
	expect(count.key).toBe(3);

	stored.set(() => 'blah' as never);

	expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
	expect(stored.peek('a')).toBe(9);

	expect(count.obj).toBe(3);
	expect(count.key).toBe(3);

	stored.set(() => undefined);

	expect(stored.peek()).toEqual({});
	expect(stored.peek('a')).toBeUndefined();

	expect(count.obj).toBe(4);
	expect(count.key).toBe(4);
});

test('notify', () => {
	const stored = store({
		nested: {
			value: 123,
		},
	});

	let count = 0;
	let value = 0;

	effect(() => {
		value = stored.get('nested').value;
		count += 1;
	});

	expect(count).toBe(1);
	expect(value).toBe(123);

	const nested = stored.peek('nested');

	nested.value = 456;

	expect(count).toBe(1);
	expect(value).toBe(123);

	stored.set('nested', nested);

	expect(count).toBe(1);
	expect(value).toBe(123);

	stored.notify();

	expect(count).toBe(2);
	expect(value).toBe(456);
});

test('peek', () => {
	const stored = store({
		a: 1,
		b: [2],
		c: {
			d: 3,
		},
	});

	const counts = [0, 0];

	effect(() => {
		stored.peek();

		counts[0] += 1;
	});

	effect(() => {
		stored.peek('a');

		counts[1] += 1;
	});

	expect(stored.peek()).toEqual({a: 1, b: [2], c: {d: 3}});
	expect(counts[0]).toBe(1);

	let o = stored.peek();
	let a = stored.peek('a');
	let b = stored.peek('b');
	let c = stored.peek('c');

	o.a = 11;
	a = 99;
	b[0] = 22;
	c.d = 33;

	expect(stored.peek()).toEqual({a: 11, b: [22], c: {d: 33}});
	expect(stored.peek('a')).toBe(11);
	expect(stored.peek('b')).toEqual([22]);
	expect(stored.peek('c')).toEqual({d: 33});

	expect(counts).toEqual([1, 1]);

	o = stored.peek(true);
	a = stored.peek('a', true);
	b = stored.peek('b', true);
	c = stored.peek('c', true);

	o.a = 111;
	a = 999;
	b[0] = 222;
	c.d = 333;

	expect(stored.peek()).toEqual({a: 11, b: [22], c: {d: 33}});
	expect(stored.peek('a')).toBe(11);
	expect(stored.peek('b')).toEqual([22]);
	expect(stored.peek('c')).toEqual({d: 33});

	expect(counts).toEqual([1, 1]);
});

test('promise', () =>
	new Promise<void>(done => {
		const count = {
			obj: 0,
			key: 0,
		};

		const stored = store(
			new Promise<{}>(resolve => {
				resolve({
					a: 1,
					b: 2,
					c: 3,
				});
			}),
		);

		stored.subscribe(() => {
			count.obj += 1;
		});

		stored.subscribe('a', () => {
			count.key += 1;
		});

		expect(stored.peek()).toEqual({});
		expect(stored.peek('a')).toBeUndefined();

		expect(count.obj).toBe(1);
		expect(count.key).toBe(1);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 1, b: 2, c: 3});
			expect(stored.peek('a')).toBe(1);

			expect(count.obj).toBe(2);
			expect(count.key).toBe(2);

			stored.set(
				'a',
				new Promise<number>(resolve => {
					setTimeout(() => {
						resolve(123);
					}, 25);
				}),
			);

			stored.set(
				'a',
				new Promise<number>(resolve => {
					setTimeout(() => {
						resolve(456);
					}, 25);
				}),
			);

			stored.set(
				'a',
				new Promise<number>(resolve => {
					setTimeout(() => {
						resolve(789);
					}, 25);
				}),
			);
		}, 50);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 789, b: 2, c: 3});
			expect(stored.peek('a')).toBe(789);

			expect(count.obj).toBe(3);
			expect(count.key).toBe(3);

			stored.set(
				'a',
				new Promise<number>(() => {
					throw new Error('Should be a silent error');
				}),
			);
		}, 100);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 789, b: 2, c: 3});
			expect(stored.peek('a')).toBe(789);

			expect(count.obj).toBe(3);
			expect(count.key).toBe(3);

			stored.set(
				new Promise<{}>(resolve => {
					resolve({
						a: 9,
						b: 8,
						c: 7,
					});
				}),
			);
		}, 125);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
			expect(stored.peek('a')).toBe(9);

			expect(count.obj).toBe(4);
			expect(count.key).toBe(4);

			stored.set(
				new Promise<{}>(() => {
					throw new Error('Should be a silent error');
				}),
			);

			stored.set(
				new Promise<{}>(() => {
					throw new Error('Should be a silent error');
				}),
			);
		}, 150);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
			expect(stored.peek('a')).toBe(9);

			expect(count.obj).toBe(4);
			expect(count.key).toBe(4);

			stored.set(
				new Promise<{}>(resolve => {
					resolve('blah' as never);
				}),
			);
		}, 175);

		setTimeout(() => {
			expect(stored.peek()).toEqual({a: 9, b: 8, c: 7});
			expect(stored.peek('a')).toBe(9);

			expect(count.obj).toBe(4);
			expect(count.key).toBe(4);

			stored.set(
				new Promise<undefined>(resolve => {
					resolve(undefined);
				}),
			);
		}, 200);

		setTimeout(() => {
			expect(stored.peek()).toEqual({});
			expect(stored.peek('a')).toBeUndefined();

			expect(count.obj).toBe(5);
			expect(count.key).toBe(5);

			done();
		}, 225);
	}));

test('subscribe', () => {
	function onA(): void {
		counts.a[1] += 1;
	}

	function onStore(): void {
		counts.store[1] += 1;
	}

	const stored = store({a: 1, b: 2, c: 3});

	const counts = {
		a: [0, 0],
		store: [0, 0],
	};

	const storeSubscriptionOne = stored.subscribe(onStore);

	const storeSubscriptionTwo = stored.subscribe(() => {
		counts.store[0] += 1;
	});

	const aSubscriptionOne = stored.subscribe('a', onA);

	const aSubscriptionTwo = stored.subscribe('a', () => {
		counts.a[0] += 1;
	});

	expect(counts.store).toEqual([1, 1]);
	expect(counts.a).toEqual([1, 1]);

	stored.update(value => ({
		...value,
		c: 99,
		d: 4,
	}));

	expect(counts.store).toEqual([2, 2]);
	expect(counts.a).toEqual([1, 1]);

	stored.set('a', 123);

	expect(counts.store).toEqual([3, 3]);
	expect(counts.a).toEqual([2, 2]);

	stored.update(() => 'blah' as never);

	expect(counts.store).toEqual([3, 3]);
	expect(counts.a).toEqual([2, 2]);

	aSubscriptionOne.unsubscribe();
	storeSubscriptionOne.unsubscribe();

	storeSubscriptionTwo.unsubscribe();
	aSubscriptionTwo.unsubscribe();

	stored.set('a', 456);

	expect(counts.store).toEqual([3, 3]);
	expect(counts.a).toEqual([2, 2]);

	stored.update(() => null as never);

	expect(counts.store).toEqual([3, 3]);
	expect(counts.a).toEqual([2, 2]);

	expect(() => stored.subscribe('blah' as never)).toThrow();
	expect(() => stored.subscribe('blah', 123 as never)).toThrow();

	expect(() => stored.update(undefined as never)).toThrow();
});
