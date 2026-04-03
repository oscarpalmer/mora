import {expect, test} from 'vitest';
import {computed, effect, signal, startBatch, stopBatch} from '../src';

test(' basic', () => {
	const a = signal(1);
	const b = signal(2);

	const c = computed(() => a.get() + b.get());
	const d = computed(() => c.get() + 1);

	expect(c.peek()).toBe(3);
	expect(d.peek()).toBe(4);

	a.update(current => current + 1);

	expect(c.peek()).toBe(4);
	expect(d.peek()).toBe(5);

	b.set(5);

	expect(c.peek()).toBe(7);
	expect(d.peek()).toBe(8);

	expect(c.toJSON()).toEqual(7);
	expect(d.toJSON()).toEqual(8);

	expect(c.toString()).toBe('7');
	expect(d.toString()).toBe('8');
});

test('get & peek', () => {
	const a = signal(1);
	const b = computed(() => a.get() ** 2);
	const c = computed(() => b.get() + 1);

	let getCount = 0;
	let peekCount = 0;

	effect(() => {
		b.get();

		getCount += 1;
	});

	effect(() => {
		c.peek();

		peekCount += 1;
	});

	for (let index = 0; index < 100; index += 1) {
		a.update(current => current + 1);
	}

	expect(getCount).toBe(101);
	expect(peekCount).toBe(1);

	expect(a.peek()).toBe(101);
	expect(b.peek()).toBe(10201);
	expect(c.peek()).toBe(10202);
});

test('batch', () => {
	const a = signal(1);
	const b = computed(() => a.get() + 1);

	let count = 0;

	effect(() => {
		b.get();

		count += 1;
	});

	expect(count).toBe(1);

	startBatch();

	for (let index = 0; index < 100; index += 1) {
		a.update(current => current + 1);
	}

	expect(count).toBe(1);

	stopBatch();

	expect(count).toBe(2);
});

test('promise', () =>
	new Promise<void>(done => {
		const count = {
			com: {
				fx: 0,
				sub: 0,
			},
			sig: 0,
		};

		const sig = signal(1);

		sig.subscribe(() => {
			count.sig += 1;
		});

		const com = computed(
			() =>
				new Promise<number>((resolve, reject) => {
					const value = sig.get();

					setTimeout(() => {
						if (value <= 0) {
							reject(new Error('Value cannot be zero or negative'));
						} else {
							resolve(value ** 2);
						}
					}, 25);
				}),
		);

		effect(() => {
			com.get();

			count.com.fx += 1;
		});

		com.subscribe(() => {
			count.com.sub += 1;
		});

		expect(com.peek()).toBeUndefined();

		setTimeout(() => {
			expect(com.peek()).toBe(1);

			sig.set(0);
			sig.set(-1);
		}, 50);

		setTimeout(() => {
			expect(com.peek()).toBe(1);

			sig.set(2);
			sig.set(3);
			sig.set(4);
			sig.set(5);
		}, 100);

		setTimeout(() => {
			expect(com.peek()).toBe(25);

			expect(count).toEqual({
				com: {
					fx: 3,
					sub: 3,
				},
				sig: 7,
			});

			done();
		}, 150);
	}));
