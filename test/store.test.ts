import {expect, test} from 'vitest';
import {effect, store} from '../src';
import {noop} from '../src/subscription';

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

	expect(count).toBe(1);
	expect(value).toBe(123);
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

	const obj = store({a: 1, b: 2, c: 3});

	const counts = {
		a: [0, 0],
		store: [0, 0],
	};

	obj.subscribe(onStore);

	const unsubscribeStore = obj.subscribe(() => {
		counts.store[0] += 1;
	});

	obj.subscribe('a', onA);

	const unsubscribeA = obj.subscribe('a', () => {
		counts.a[0] += 1;
	});

	expect(counts.store).toEqual([1, 1]);
	expect(counts.a).toEqual([1, 1]);

	obj.update(value => ({
		...value,
		c: 99,
		d: 4,
	}));

	expect(counts.store).toEqual([2, 2]);
	expect(counts.a).toEqual([1, 1]);

	obj.set('a', 123);

	expect(counts.store).toEqual([3, 3]);
	expect(counts.a).toEqual([2, 2]);

	obj.update(() => 'blah' as never);

	expect(counts.store).toEqual([3, 3]);
	expect(counts.a).toEqual([2, 2]);

	obj.unsubscribe(onStore);
	obj.unsubscribe('a', onA);

	unsubscribeStore();
	unsubscribeA();

	obj.set('a', 456);

	expect(counts.store).toEqual([3, 3]);
	expect(counts.a).toEqual([2, 2]);

	obj.update(() => null as never);

	expect(counts.store).toEqual([3, 3]);
	expect(counts.a).toEqual([2, 2]);

	expect(obj.subscribe('blah' as never)).toEqual(noop);
	expect(obj.subscribe('blah', 123 as never)).toEqual(noop);

	obj.unsubscribe('blah' as never);
	obj.unsubscribe('blah' as never, 123 as never);
});
