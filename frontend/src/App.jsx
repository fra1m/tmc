import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addItem, reorderSelected, selectItem, sortSelectedById, unselectItem, HttpError } from "./api/client";
import { AddItemForm } from "./components/AddItemForm";
import { ColumnCard } from "./components/ColumnCard";
import { LeftList } from "./components/LeftList";
import { SearchInput } from "./components/SearchInput";
import { ScrollToTopButton } from "./components/ScrollToTopButton";
import { SortableSelectedList } from "./components/SortableSelectedList";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useLeftItems, useRightItems, useServerState } from "./hooks/usePaginatedItems";

function getErrorMessage(error) {
  if (error instanceof HttpError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Неизвестная ошибка.";
}

function formatNumber(value) {
  return new Intl.NumberFormat("ru-RU").format(value ?? 0);
}

function reorderFlatItems(items, activeId, overId) {
  const activeIndex = items.findIndex((item) => item.id === activeId);
  const overIndex = items.findIndex((item) => item.id === overId);

  if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(activeIndex, 1);
  nextItems.splice(overIndex, 0, moved);
  return nextItems;
}

function reorderInfiniteItemsData(data, activeId, overId) {
  if (!data?.pages?.length) {
    return data;
  }

  const flatItems = data.pages.flatMap((page) => page.items);
  const reorderedItems = reorderFlatItems(flatItems, activeId, overId);

  if (reorderedItems === flatItems) {
    return data;
  }

  let cursor = 0;
  const nextPages = data.pages.map((page) => {
    const pageSize = page.items.length;
    const pageItems = reorderedItems.slice(cursor, cursor + pageSize);
    cursor += pageSize;

    return {
      ...page,
      items: pageItems
    };
  });

  return {
    ...data,
    pages: nextPages
  };
}

export default function App() {
  const queryClient = useQueryClient();

  const [leftQuery, setLeftQuery] = useState("");
  const [rightQuery, setRightQuery] = useState("");
  const [feedback, setFeedback] = useState(null);

  const normalizedLeftQuery = leftQuery.trim();
  const normalizedRightQuery = rightQuery.trim();

  const leftQueryResult = useLeftItems(normalizedLeftQuery);
  const rightQueryResult = useRightItems(normalizedRightQuery);
  const stateQuery = useServerState();

  const leftItems = useMemo(
    () => leftQueryResult.data?.pages.flatMap((page) => page.items) ?? [],
    [leftQueryResult.data]
  );

  const rightItems = useMemo(
    () => rightQueryResult.data?.pages.flatMap((page) => page.items) ?? [],
    [rightQueryResult.data]
  );

  const leftSentinelRef = useInfiniteScroll({
    canLoadMore: Boolean(leftQueryResult.hasNextPage),
    isLoadingMore: leftQueryResult.isFetchingNextPage,
    onLoadMore: () => {
      void leftQueryResult.fetchNextPage();
    }
  });

  const rightSentinelRef = useInfiniteScroll({
    canLoadMore: Boolean(rightQueryResult.hasNextPage),
    isLoadingMore: rightQueryResult.isFetchingNextPage,
    onLoadMore: () => {
      void rightQueryResult.fetchNextPage();
    }
  });

  const addMutation = useMutation({
    mutationFn: addItem,
    onSuccess: async ({ addedId }) => {
      setFeedback({ type: "success", message: `ID ${addedId} добавлен.` });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["left-items"] }),
        queryClient.invalidateQueries({ queryKey: ["server-state"] })
      ]);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  });

  const selectMutation = useMutation({
    mutationFn: selectItem,
    onSuccess: async () => {
      setFeedback(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["left-items"] }),
        queryClient.invalidateQueries({ queryKey: ["right-items"] }),
        queryClient.invalidateQueries({ queryKey: ["server-state"] })
      ]);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  });

  const unselectMutation = useMutation({
    mutationFn: unselectItem,
    onSuccess: async () => {
      setFeedback(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["left-items"] }),
        queryClient.invalidateQueries({ queryKey: ["right-items"] }),
        queryClient.invalidateQueries({ queryKey: ["server-state"] })
      ]);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  });

  const reorderMutation = useMutation({
    mutationFn: ({ activeId, overId }) =>
      reorderSelected({
        activeId,
        overId,
        query: normalizedRightQuery
      }),
    onMutate: async ({ activeId, overId }) => {
      const queryKey = ["right-items", normalizedRightQuery];
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, (currentData) =>
        reorderInfiniteItemsData(currentData, activeId, overId)
      );

      return { queryKey, previousData };
    },
    onSuccess: async () => {
      setFeedback(null);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["left-items"] }),
        queryClient.invalidateQueries({ queryKey: ["right-items"] }),
        queryClient.invalidateQueries({ queryKey: ["server-state"] })
      ]);
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  });

  const sortByIdMutation = useMutation({
    mutationFn: sortSelectedById,
    onSuccess: async () => {
      setFeedback({ type: "success", message: "Выбранные элементы отсортированы по ID." });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["right-items"] }),
        queryClient.invalidateQueries({ queryKey: ["server-state"] })
      ]);
    },
    onError: (error) => {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  });

  const isLeftActionPending = selectMutation.isPending;
  const isRightActionPending =
    unselectMutation.isPending ||
    reorderMutation.isPending ||
    sortByIdMutation.isPending;

  const selectedCount = stateQuery.data?.counts?.selected ?? 0;
  const manualCount = stateQuery.data?.counts?.manualAdded ?? 0;
  const leftCount = stateQuery.data?.counts?.leftVisibleTotalEstimate ?? 0;

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Items Manager</h1>
        <p>Базовый набор: ID 1..1 000 000. Добавлять можно любой ID (включая строковый).</p>
        <div className="stats-row">
          <span>Свободные: {formatNumber(leftCount)}</span>
          <span>Выбранные: {formatNumber(selectedCount)}</span>
          <span>Добавленные вручную: {formatNumber(manualCount)}</span>
          <span>
            Очередь add/data: {formatNumber(stateQuery.data?.queue?.addPending)}/
            {formatNumber(stateQuery.data?.queue?.dataPending)}
          </span>
        </div>
      </header>

      {feedback ? <div className={`feedback ${feedback.type}`}>{feedback.message}</div> : null}

      <main className="columns-grid">
        <ColumnCard
          title="Левое окно: доступные элементы"
          subtitle="Фильтрация по ID, infinite scroll и добавление новых элементов"
        >
          <SearchInput
            value={leftQuery}
            placeholder="Фильтр по ID"
            onChange={(value) => {
              setLeftQuery(value);
              setFeedback(null);
            }}
          />

          <AddItemForm
            isSubmitting={addMutation.isPending}
            onAdd={async (id) => {
              setFeedback(null);
              await addMutation.mutateAsync(id);
            }}
          />

          <LeftList
            items={leftItems}
            query={normalizedLeftQuery}
            isLoading={leftQueryResult.isLoading}
            isError={leftQueryResult.isError}
            errorMessage={leftQueryResult.error ? getErrorMessage(leftQueryResult.error) : null}
            isActionPending={isLeftActionPending}
            isFetchingNextPage={leftQueryResult.isFetchingNextPage}
            onSelect={(id) => {
              setFeedback(null);
              selectMutation.mutate(id);
            }}
            sentinelRef={leftSentinelRef}
          />
        </ColumnCard>

        <ColumnCard
          title="Правое окно: выбранные элементы"
          subtitle="Фильтрация по ID, Drag & Drop и infinite scroll"
        >
          <SearchInput
            value={rightQuery}
            placeholder="Фильтр по ID"
            onChange={(value) => {
              setRightQuery(value);
              setFeedback(null);
            }}
          />

          <button
            type="button"
            className="secondary-button"
            disabled={isRightActionPending || rightItems.length === 0}
            onClick={() => {
              setFeedback(null);
              sortByIdMutation.mutate();
            }}
          >
            {sortByIdMutation.isPending ? "Сортировка..." : "Сортировать по ID"}
          </button>

          <SortableSelectedList
            items={rightItems}
            query={normalizedRightQuery}
            isLoading={rightQueryResult.isLoading}
            isError={rightQueryResult.isError}
            errorMessage={rightQueryResult.error ? getErrorMessage(rightQueryResult.error) : null}
            isActionPending={isRightActionPending}
            isFetchingNextPage={rightQueryResult.isFetchingNextPage}
            onRemove={(id) => {
              setFeedback(null);
              unselectMutation.mutate(id);
            }}
            onReorder={(activeId, overId) => {
              setFeedback(null);
              reorderMutation.mutate({ activeId, overId });
            }}
            sentinelRef={rightSentinelRef}
          />
        </ColumnCard>
      </main>

      <ScrollToTopButton />
    </div>
  );
}
