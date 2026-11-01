import {expect, test} from 'vite-plus/test';
import {
	array,
	type Computed,
	computed,
	type Effect,
	effect,
	scope,
	signal,
	startBatch,
	stopBatch,
	store,
} from '../src';
import {SYMBOL_STATE} from '../src/constants';

function countChildren(value: unknown): number {
	let count = 0;
	let child = getState(value).firstChild;

	while (child != null) {
		count += 1;
		child = child.nextSibling;
	}

	return count;
}

function countObservers(value: unknown): number {
	let count = 0;
	let link = getState(value).firstObserver;

	while (link != null) {
		count += 1;
		link = link.nextObserver;
	}

	return count;
}

function countSources(value: unknown): number {
	let count = 0;
	let link = getState(value).firstSource;

	while (link != null) {
		count += 1;
		link = link.nextSource;
	}

	return count;
}

function getState(value: unknown): any {
	return (value as any)[SYMBOL_STATE];
}

function hasSource(value: unknown, source: unknown): boolean {
	let link = getState(value).firstSource;

	while (link != null) {
		if (link.source === getState(source)) {
			return true;
		}

		link = link.nextSource;
	}

	return false;
}

test('children: computed in computed', () => {
	const a = signal(1);

	const inner: Computed<number>[] = [];

	const outer = computed(() => {
		inner.push(computed(() => 1));

		return a.get();
	});

	expect(outer.get()).toBe(1);
	expect(inner[0].active).toBe(true);

	a.set(2);

	expect(inner[0].active).toBe(true);
	expect(outer.get()).toBe(2);
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

	expect(countChildren(items)).toBe(0);

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
	expect(countChildren(stored)).toBe(1);
});

test('children: removed by hand', () => {
	const a = signal(1);

	let inner: Effect | undefined;

	const outer = effect(() => {
		a.get();

		inner = effect(() => {});
	});

	expect(countChildren(outer)).toBe(1);

	inner!.stop();

	expect(countChildren(outer)).toBe(0);

	const items = array([1, 2, 3]);
	const even = items.filter(item => item % 2 === 0);

	expect(countChildren(items)).toBe(1);

	even.deactivate();

	expect(countChildren(items)).toBe(0);
});

test('cleanup: deactivated computed', () => {
	const a = signal(1);
	const b = computed(() => a.get() * 2);

	expect(countObservers(a)).toBe(0);
	expect(b.get()).toBe(2);
	expect(countObservers(a)).toBe(1);

	b.deactivate();

	expect(countObservers(a)).toBe(0);
});

test('cleanup: deactivated signal', () => {
	const a = signal(1);
	const b = signal(2);

	const fx = effect(() => {
		a.get();
		b.get();
	});

	expect(countSources(fx)).toBe(2);

	a.deactivate();

	expect(hasSource(fx, a)).toBe(false);
	expect(countSources(fx)).toBe(1);
});

test('cleanup: stopped effect', () => {
	const a = signal(1);
	const b = signal(2);

	const fx = effect(() => {
		a.get();
		b.get();
	});

	expect(countObservers(a)).toBe(1);
	expect(countObservers(b)).toBe(1);

	fx.stop();

	expect(countObservers(a)).toBe(0);
	expect(countObservers(b)).toBe(0);
	expect(countSources(fx)).toBe(0);

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
	expect(countObservers(a)).toBe(0);
});

test('flush: error keeps remaining handlers queued', () => {
	const a = signal(1);

	const values: number[] = [];

	effect(() => {
		if (a.get() === 2) {
			throw new Error('Should be a silent error');
		}
	});

	effect(() => {
		values.push(a.get());
	});

	a.set(2);

	expect(values).toEqual([1]);

	stopBatch();

	expect(values).toEqual([1, 2]);
});

test('flush: stopped while queued', () => {
	const a = signal(1);

	let count = 0;

	const fx = effect(() => {
		a.get();

		count += 1;
	});

	startBatch();

	a.set(2);

	fx.stop();

	stopBatch();

	expect(count).toBe(1);
});

test('flush: queued once while batching', () => {
	const a = signal(1);
	const b = computed(() => a.get() * 2);

	const values: unknown[] = [];

	b.subscribe(value => {
		values.push(value);
	});

	startBatch();

	a.set(2);

	expect(b.get()).toBe(4);

	a.set(3);

	stopBatch();

	expect(values).toEqual([2, 6]);
});

test('flush: repeated reads link once', () => {
	const a = signal(1);

	const fx = effect(() => {
		a.get();
		a.get();
		a.get();
	});

	expect(countObservers(a)).toBe(1);
	expect(countSources(fx)).toBe(1);

	a.set(2);

	expect(countObservers(a)).toBe(1);
	expect(countSources(fx)).toBe(1);
});

test('graph: children removed from the middle', () => {
	const inner: Effect[] = [];

	const outer = effect(() => {
		inner.push(
			effect(() => {}),
			effect(() => {}),
			effect(() => {}),
		);
	});

	expect(countChildren(outer)).toBe(3);

	inner[1].stop();

	expect(countChildren(outer)).toBe(2);

	inner[2].stop();

	expect(countChildren(outer)).toBe(1);

	inner[0].stop();

	expect(countChildren(outer)).toBe(0);
});

test('graph: repeated reads in between others', () => {
	const a = signal(1);
	const b = signal(1);

	let count = 0;

	const fx = effect(() => {
		a.get();
		b.get();
		a.get();

		count += 1;
	});

	expect(countSources(fx)).toBe(2);
	expect(countObservers(a)).toBe(1);

	a.set(2);

	expect(count).toBe(2);
	expect(countSources(fx)).toBe(2);
	expect(countObservers(a)).toBe(1);
});

test('graph: reordered reads', () => {
	const flag = signal(true);
	const a = signal(1);
	const b = signal(1);

	let count = 0;

	const fx = effect(() => {
		if (flag.get()) {
			a.get();
			b.get();
		} else {
			b.get();
			a.get();
		}

		count += 1;
	});

	flag.set(false);

	expect(count).toBe(2);
	expect(countSources(fx)).toBe(3);
	expect(countObservers(a)).toBe(1);
	expect(countObservers(b)).toBe(1);

	a.set(2);
	b.set(2);

	expect(count).toBe(4);
});

test('graph: source deactivated during a run', () => {
	const a = signal(1);
	const b = signal(1);

	let count = 0;

	const fx = effect(() => {
		a.get();

		if (b.get() === 2) {
			b.deactivate();
		}

		count += 1;
	});

	b.set(2);

	expect(count).toBe(2);
	expect(countSources(fx)).toBe(1);
	expect(hasSource(fx, b)).toBe(false);

	a.set(2);

	expect(count).toBe(3);
});

test('lazy: avoidable propagation', () => {
	const a = signal(1);
	const other = signal(1);
	const isEven = computed(() => a.get() % 2 === 0);

	let count = 0;

	effect(() => {
		other.get();
		isEven.get();

		count += 1;
	});

	a.set(3);
	a.set(5);

	expect(count).toBe(1);

	a.set(6);

	expect(count).toBe(2);
});

test('lazy: diamond', () => {
	const a = signal(1);
	const b = computed(() => a.get() * 2);
	const c = computed(() => a.get() * 3);

	let computes = 0;
	let runs = 0;

	const d = computed(() => {
		computes += 1;

		return b.get() + c.get();
	});

	effect(() => {
		d.get();

		runs += 1;
	});

	a.set(2);

	expect(d.peek()).toBe(10);
	expect(computes).toBe(2);
	expect(runs).toBe(2);
});

test('lazy: first reads', () => {
	const a = signal(2);

	expect(computed(() => a.get() * 2).peek()).toBe(4);
	expect(computed(() => a.get() * 3).toJSON()).toBe(6);
	expect(computed(() => a.get() * 4).toString()).toBe('8');

	const values: unknown[] = [];

	computed(() => a.get() * 5).subscribe(value => {
		values.push(value);
	});

	expect(values).toEqual([10]);
});

test('lazy: fresh reads in a batch', () => {
	const a = signal(1);
	const b = computed(() => a.get() + 1);

	let count = 0;

	effect(() => {
		b.get();

		count += 1;
	});

	startBatch();

	a.set(2);

	expect(b.get()).toBe(3);
	expect(count).toBe(1);

	stopBatch();

	expect(count).toBe(2);
});

test('lazy: not computed until read', () => {
	const a = signal(1);

	let count = 0;

	const b = computed(() => {
		count += 1;

		return a.get() * 2;
	});

	expect(count).toBe(0);

	a.set(2);
	a.set(3);

	expect(count).toBe(0);
	expect(b.get()).toBe(6);
	expect(count).toBe(1);

	a.set(4);
	a.set(5);

	expect(count).toBe(1);
	expect(b.get()).toBe(10);
	expect(count).toBe(2);
});

test('lazy: write inside an effect', () => {
	const a = signal(1);
	const b = signal(0);

	const values: number[] = [];

	effect(() => {
		b.set(a.get() * 10);
	});

	effect(() => {
		values.push(b.get());
	});

	a.set(2);

	expect(values).toEqual([10, 20]);
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
	expect(countObservers(a)).toBe(0);

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
	expect(countObservers(a)).toBe(0);

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
	expect(countObservers(a)).toBe(0);
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
	expect(countObservers(other)).toBe(0);
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
	expect(countObservers(other)).toBe(0);
});
