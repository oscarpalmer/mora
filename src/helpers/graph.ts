import type {Link, ObserverState, ReactiveState} from '../models';

// Sources (signals, computeds, arrays, and stores) are read by observers (effects and computeds),
// so a computed is both. Each dependency is a link, stored in two lists: the observer's sources,
// in the order they were read, and the source's observers. The lists are doubly linked, so links
// are cheap to add and remove.
//
// Tracking: when an observer runs, its reads are compared with the reads from its last run. If
// they match, in the same order, every link is reused. A read that doesn't match gets a new link,
// and links that weren't read this time are removed, so an observer only depends on what it read
// last time.
//
// Push: when a source changes, nothing runs yet; observers are only marked. The source's own
// observers are marked dirty: they need to run. Observers further down are marked check: a
// computed in between may end up with the same value. Effects are queued when first marked, and
// so are computeds with subscribers.
//
// Pull: queued effects run when the queue is flushed (after a write, or when the outermost batch
// stops), and computeds update when they're read. A dirty observer runs right away. A check
// observer first updates its computed sources, in order, and only runs if one of them changed.
// So a computed that ends up with the same value stops the update there, and a computed that
// nothing reads (or subscribes to) never runs.
//
// Cleanup: when an observer stops, or a source is deactivated, its links are removed.

// #region Functions

/**
 * Inserts the link into the observer's sources between `previous` and `next`, and appends it to the source's observers
 */
export function linkSource(
	observer: ObserverState,
	source: ReactiveState,
	previous: Link | undefined,
	next: Link | undefined,
): Link {
	const link: Link = {
		observer,
		source,
		nextObserver: undefined,
		nextSource: next,
		previousObserver: source.lastObserver,
		previousSource: previous,
		version: observer.version,
	};

	if (previous == null) {
		observer.firstSource = link;
	} else {
		previous.nextSource = link;
	}

	if (next == null) {
		observer.lastSource = link;
	} else {
		next.previousSource = link;
	}

	if (source.lastObserver == null) {
		source.firstObserver = link;
	} else {
		source.lastObserver.nextObserver = link;
	}

	source.lastObserver = link;

	return link;
}

export function unlinkObserver(link: Link): void {
	const {nextObserver, previousObserver, source} = link;

	if (previousObserver == null) {
		source.firstObserver = nextObserver;
	} else {
		previousObserver.nextObserver = nextObserver;
	}

	if (nextObserver == null) {
		source.lastObserver = previousObserver;
	} else {
		nextObserver.previousObserver = previousObserver;
	}
}

export function unlinkSource(link: Link): void {
	const {nextSource, observer, previousSource} = link;

	// The source can be deactivated while its observer is running
	if (observer.cursor === link) {
		observer.cursor = previousSource;
	}

	if (previousSource == null) {
		observer.firstSource = nextSource;
	} else {
		previousSource.nextSource = nextSource;
	}

	if (nextSource == null) {
		observer.lastSource = previousSource;
	} else {
		nextSource.previousSource = previousSource;
	}
}

/**
 * Cuts the observer's sources off at `from`, and removes those links from their sources' observers
 */
export function unlinkSourcesFrom(observer: ObserverState, from: Link | undefined): void {
	if (from == null) {
		return;
	}

	const previous = from.previousSource;

	if (previous == null) {
		observer.firstSource = undefined;
	} else {
		previous.nextSource = undefined;
	}

	observer.lastSource = previous;

	let link: Link | undefined = from;

	while (link != null) {
		const next: Link | undefined = link.nextSource;

		unlinkObserver(link);

		link = next;
	}
}

// #endregion
