import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getLeftItems, getRightItems, getState } from '../api/client';

export const PAGE_LIMIT = 20;

export function useLeftItems(query) {
	return useInfiniteQuery({
		queryKey: ['left-items', query],
		initialPageParam: 0,
		queryFn: ({ pageParam }) =>
			getLeftItems({
				query,
				offset: pageParam,
				limit: PAGE_LIMIT,
			}),
		getNextPageParam: lastPage => lastPage.nextOffset ?? undefined,
	});
}

export function useRightItems(query) {
	return useInfiniteQuery({
		queryKey: ['right-items', query],
		initialPageParam: 0,
		queryFn: ({ pageParam }) =>
			getRightItems({
				query,
				offset: pageParam,
				limit: PAGE_LIMIT,
			}),
		getNextPageParam: lastPage => lastPage.nextOffset ?? undefined,
	});
}

export function useServerState() {
	return useQuery({
		queryKey: ['server-state'],
		queryFn: getState,
		refetchInterval: 2_000,
		refetchOnWindowFocus: true,
	});
}
