import { ListItemRow } from "./ListItemRow";

export function LeftList({
  items,
  query,
  isLoading,
  isError,
  errorMessage,
  isActionPending,
  isFetchingNextPage,
  onSelect,
  sentinelRef
}) {
  if (isLoading) {
    return <p className="list-placeholder">Загрузка списка...</p>;
  }

  if (isError) {
    return <p className="list-error">{errorMessage ?? "Не удалось получить список."}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="list-empty-wrap">
        <p className="list-placeholder">{query ? "По запросу ничего не найдено." : "Свободных элементов нет."}</p>
        <div ref={sentinelRef} className="sentinel" />
      </div>
    );
  }

  return (
    <>
      <ul className="items-list">
        {items.map((item) => (
          <ListItemRow
            key={item.id}
            item={item}
            actionLabel="Выбрать"
            actionDisabled={isActionPending}
            onAction={onSelect}
          />
        ))}
      </ul>
      <div ref={sentinelRef} className="sentinel" />
      {isFetchingNextPage ? <p className="list-loading-more">Подгрузка...</p> : null}
    </>
  );
}
