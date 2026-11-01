import type {Link, ObserverState, ReactiveState} from '../models';

// #region Functions

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
