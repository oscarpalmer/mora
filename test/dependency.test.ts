import {expect, test} from 'vite-plus/test';
import {
	array,
	type Computed,
	computed,
	type Effect,
	effect,
	scope,
	signal,
	store,
} from '../src';
import {SYMBOL_STATE} from '../src/constants';

function getState(value: unknown): any {
	return (value as any)[SYMBOL_STATE];
}

test('children: computed in computed', () => {
	const a = signal(1);

	const inner: Computed<number>[] = [];

	const outer = computed(() => {
		inner.push(computed(() => 1));

		return a.get();
	});

	expect(inner[0].active).toBe(true);

	a.set(2);

	expect(inner[0].active).toBe(false);
	expect(inner[1].active).toBe(true);

	outer.deactivate();

	expect(inner[1].active).toBe(false);
});

test('children: computed in effect', () => {
	const a = signal(1);

	const inner: Computed<number>[] = [];

	const outer = effect(() => {
		a.get();

		inner.push(computed(() => 1));
	});

	a.set(2);

	expect(inner[0].active).toBe(false);
	expect(inner[1].active).toBe(true);

	outer.stop();

	expect(inner[1].active).toBe(false);
});

test('children: effect in effect', () => {
	const a = signal(1);
	const b = signal(1);

	const inner: Effect[] = [];

	let count = 0;

	const outer = effect(() => {
		a.get();

		inner.push(
			effect(() => {
				b.get();

				count += 1;
			}),
		);
	});

	b.set(2);

	expect(count).toBe(2);

	a.set(2);

	expect(inner[0].active).toBe(false);
	expect(count).toBe(3);

	b.set(3);

	expect(count).toBe(4);

	outer.stop();

	expect(inner[1].active).toBe(false);

	b.set(4);

	expect(count).toBe(4);
});

test('children: filter in effect', () => {
	const items = array([1, 2, 3]);
	const trigger = signal(1);

	const derived: Computed<number[]>[] = [];

	effect(() => {
		trigger.get();

		derived.push(items.filter(item => item > 1));
	});

	expect(getState(items).children).toBeUndefined();

	trigger.set(2);

	expect(derived[0].active).toBe(false);
	expect(derived[1].active).toBe(true);
	expect(derived[1].peek()).toEqual([2, 3]);
});

test('children: keyed get in effect', () => {
	const stored = store({a: 1});

	const values: unknown[] = [];

	effect(() => {
		values.push(stored.get('a'));
	});

	stored.set('a', 2);
	stored.set('a', 3);

	expect(values).toEqual([1, 2, 3]);
	expect(getState(stored).children.size).toBe(1);
});

test('children: removed by hand', () => {
	const a = signal(1);

	let inner: Effect | undefined;

	const outer = effect(() => {
		a.get();

		inner = effect(() => {});
	});

	expect(getState(outer).children.size).toBe(1);

	inner!.stop();

	expect(getState(outer).children.size).toBe(0);

	const items = array([1, 2, 3]);
	const even = items.filter(item => item % 2 === 0);

	expect(getState(items).children.size).toBe(1);

	even.deactivate();

	expect(getState(items).children.size).toBe(0);
});

test('cleanup: deactivated computed', () => {
	const a = signal(1);
	const b = computed(() => a.get() * 2);

	expect(getState(a).observers.size).toBe(1);

	b.deactivate();

	expect(getState(a).observers.size).toBe(0);
});

test('cleanup: deactivated signal', () => {
	const a = signal(1);
	const b = signal(2);

	const fx = effect(() => {
		a.get();
		b.get();
	});

	expect(getState(fx).sources.size).toBe(2);

	a.deactivate();

	expect(getState(fx).sources.has(getState(a))).toBe(false);
	expect(getState(fx).sources.size).toBe(1);
});

test('cleanup: stopped effect', () => {
	const a = signal(1);
	const b = signal(2);

	const fx = effect(() => {
		a.get();
		b.get();
	});

	expect(getState(a).observers.size).toBe(1);
	expect(getState(b).observers.size).toBe(1);

	fx.stop();

	expect(getState(a).observers.size).toBe(0);
	expect(getState(b).observers.size).toBe(0);
	expect(getState(fx).sources).toBeUndefined();

	const empty = effect(() => {});

	empty.stop();

	expect(empty.active).toBe(false);
});

test('cleanup: stopped effect, during its own run', () => {
	const a = signal(1);

	const fx = effect(() => {
		if (a.get() > 1) {
			fx.stop();

			a.get();
		}
	});

	a.set(2);

	expect(fx.active).toBe(false);
	expect(getState(a).observers.size).toBe(0);
});

test('dynamic: computed', () => {
	const flag = signal(true);
	const a = signal(1);
	const b = signal(2);

	let count = 0;

	const c = computed(() => {
		count += 1;

		return flag.get() ? a.get() : b.get();
	});

	expect(c.get()).toBe(1);
	expect(count).toBe(1);

	flag.set(false);

	expect(c.get()).toBe(2);
	expect(count).toBe(2);

	a.set(10);

	expect(count).toBe(2);
	expect(getState(a).observers.size).toBe(0);

	b.set(20);

	expect(c.get()).toBe(20);
	expect(count).toBe(3);
});

test('dynamic: effect', () => {
	const flag = signal(true);
	const a = signal(1);
	const b = signal(2);

	let count = 0;

	effect(() => {
		count += 1;

		if (flag.get()) {
			a.get();
		} else {
			b.get();
		}
	});

	flag.set(false);

	expect(count).toBe(2);

	a.set(10);

	expect(count).toBe(2);
	expect(getState(a).observers.size).toBe(0);

	b.set(20);

	expect(count).toBe(3);
});

test('scope: disposes everything created inside', () => {
	const a = signal(1);

	let count = 0;
	let doubled: Computed<number> | undefined;

	const dispose = scope(() => {
		effect(() => {
			a.get();

			count += 1;
		});

		doubled = computed(() => a.get() * 2);
	});

	a.set(2);

	expect(count).toBe(2);
	expect(doubled!.get()).toBe(4);

	dispose();
	dispose();

	a.set(3);

	expect(count).toBe(2);
	expect(doubled!.active).toBe(false);

	expect(() => scope(123 as never)).toThrow(TypeError);
});

test('scope: inside an effect', () => {
	const a = signal(1);
	const b = signal(1);

	let count = 0;
	let inner: Effect | undefined;

	const outer = effect(() => {
		a.get();

		if (inner == null) {
			scope(() => {
				inner = effect(() => {
					b.get();

					count += 1;
				});
			});
		}
	});

	a.set(2);

	expect(inner!.active).toBe(true);

	outer.stop();

	b.set(2);

	expect(inner!.active).toBe(true);
	expect(count).toBe(2);
});

test('scope: not tracked', () => {
	const a = signal(1);

	let count = 0;

	effect(() => {
		count += 1;

		scope(() => {
			a.get();
		});
	});

	a.set(2);

	expect(count).toBe(1);
	expect(getState(a).observers).toBeUndefined();
});

test('single recompute', () => {
	const a = signal(1);

	let count = 0;

	const b = computed(() => {
		count += 1;

		return a.get() * 2;
	});

	b.subscribe(() => {
		b.get();
	});

	expect(count).toBe(1);

	a.set(2);

	expect(b.peek()).toBe(4);
	expect(count).toBe(2);
});

test('untracked: computed subscriber', () => {
	const a = signal(1);
	const other = signal(1);

	let count = 0;

	const b = computed(() => {
		count += 1;

		return a.get() * 2;
	});

	b.subscribe(() => {
		other.get();
	});

	a.set(2);

	expect(count).toBe(2);

	other.set(2);

	expect(count).toBe(2);
	expect(getState(other).observers).toBeUndefined();
});

test('untracked: flushed subscriber', () => {
	const a = signal(1);
	const other = signal(1);

	let count = 0;

	a.subscribe(() => {
		other.get();
	});

	effect(() => {
		count += 1;

		a.set(a.peek() + 1);
	});

	other.set(2);

	expect(count).toBe(1);
	expect(getState(other).observers).toBeUndefined();
});
