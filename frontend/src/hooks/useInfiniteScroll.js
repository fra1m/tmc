import { useEffect, useRef } from 'react';

export function useInfiniteScroll({ canLoadMore, isLoadingMore, onLoadMore }) {
	const sentinelRef = useRef(null);

	useEffect(() => {
		const node = sentinelRef.current;
		if (!node) {
			return;
		}

		const observer = new IntersectionObserver(
			entries => {
				const [entry] = entries;
				if (!entry?.isIntersecting) {
					return;
				}

				if (!canLoadMore || isLoadingMore) {
					return;
				}

				onLoadMore();
			},
			{
				rootMargin: '150px',
			},
		);

		observer.observe(node);

		return () => observer.disconnect();
	}, [canLoadMore, isLoadingMore, onLoadMore]);

	return sentinelRef;
}
