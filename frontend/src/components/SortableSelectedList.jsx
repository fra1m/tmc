import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableRow({ item, onRemove, isActionPending }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <li ref={setNodeRef} style={style} className={`item-row sortable-row${isDragging ? " dragging" : ""}`}>
      <button className="drag-handle" type="button" aria-label={`Переместить элемент ${item.id}`} {...attributes} {...listeners}>
        ⠿
      </button>

      <div className="item-id">ID: {item.id}</div>

      <button className="secondary-button" type="button" disabled={isActionPending} onClick={() => onRemove(item.id)}>
        Убрать
      </button>
    </li>
  );
}

export function SortableSelectedList({
  items,
  query,
  isLoading,
  isError,
  errorMessage,
  isActionPending,
  isFetchingNextPage,
  onRemove,
  onReorder,
  sentinelRef
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 2
      }
    })
  );

  function handleDragEnd(event) {
    if (isActionPending) {
      return;
    }

    const over = event.over;
    if (!over) {
      return;
    }

    const activeId = String(event.active.id);
    const overId = String(over.id);

    if (activeId === overId) {
      return;
    }

    onReorder(activeId, overId);
  }

  if (isLoading) {
    return <p className="list-placeholder">Загрузка списка...</p>;
  }

  if (isError) {
    return <p className="list-error">{errorMessage ?? "Не удалось получить список."}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="list-empty-wrap">
        <p className="list-placeholder">{query ? "По запросу ничего не найдено." : "Список выбранных пуст."}</p>
        <div ref={sentinelRef} className="sentinel" />
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ul className="items-list">
            {items.map((item) => (
              <SortableRow key={item.id} item={item} onRemove={onRemove} isActionPending={isActionPending} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <div ref={sentinelRef} className="sentinel" />
      {isFetchingNextPage ? <p className="list-loading-more">Подгрузка...</p> : null}
    </>
  );
}
