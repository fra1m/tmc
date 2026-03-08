import { BASE_MAX_ID, BASE_MIN_ID } from "../config.js";
import { ApiError } from "../utils/errors.js";

const idCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});

function compareIds(leftId, rightId) {
  return idCollator.compare(String(leftId), String(rightId));
}

function findInsertIndex(sortedArray, value) {
  let low = 0;
  let high = sortedArray.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (compareIds(sortedArray[middle], value) < 0) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
}

function arrayMove(array, fromIndex, toIndex) {
  const copy = [...array];
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

function mergeSortedIds(leftPart, rightPart) {
  const merged = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftPart.length && rightIndex < rightPart.length) {
    if (compareIds(leftPart[leftIndex], rightPart[rightIndex]) <= 0) {
      merged.push(leftPart[leftIndex]);
      leftIndex += 1;
    } else {
      merged.push(rightPart[rightIndex]);
      rightIndex += 1;
    }
  }

  while (leftIndex < leftPart.length) {
    merged.push(leftPart[leftIndex]);
    leftIndex += 1;
  }

  while (rightIndex < rightPart.length) {
    merged.push(rightPart[rightIndex]);
    rightIndex += 1;
  }

  return merged;
}

function mergeSortIds(values) {
  if (values.length < 2) {
    return [...values];
  }

  const middle = Math.floor(values.length / 2);
  const leftPart = mergeSortIds(values.slice(0, middle));
  const rightPart = mergeSortIds(values.slice(middle));

  return mergeSortedIds(leftPart, rightPart);
}

function toItem(id) {
  return { id };
}

export class ItemStore {
  constructor() {
    this.manualIdsSet = new Set();
    this.manualIdsSorted = [];

    this.selectedSet = new Set();
    this.selectedOrder = [];
  }

  exists(id) {
    return this.isBaseId(id) || this.manualIdsSet.has(id);
  }

  addManualId(id) {
    if (this.exists(id)) {
      throw new ApiError(409, "ID_ALREADY_EXISTS", `Item with ID ${id} already exists.`);
    }

    this.manualIdsSet.add(id);

    const insertionIndex = findInsertIndex(this.manualIdsSorted, id);
    this.manualIdsSorted.splice(insertionIndex, 0, id);
  }

  select(id) {
    if (!this.exists(id)) {
      throw new ApiError(404, "ID_NOT_FOUND", `Item with ID ${id} does not exist.`);
    }

    if (this.selectedSet.has(id)) {
      throw new ApiError(409, "ALREADY_SELECTED", `Item with ID ${id} is already selected.`);
    }

    this.selectedSet.add(id);
    this.selectedOrder.push(id);
  }

  unselect(id) {
    if (!this.selectedSet.has(id)) {
      throw new ApiError(409, "NOT_SELECTED", `Item with ID ${id} is not selected.`);
    }

    this.selectedSet.delete(id);
    this.selectedOrder = this.selectedOrder.filter((currentId) => currentId !== id);
  }

  reorder({ activeId, overId, query }) {
    if (this.selectedOrder.length === 0 || activeId === overId) {
      return;
    }

    if (!this.selectedSet.has(activeId) || !this.selectedSet.has(overId)) {
      throw new ApiError(404, "ID_NOT_FOUND", "Both IDs must exist in selected list.");
    }

    const filteredSelectedIds = this.selectedOrder.filter((id) => this.matchesQueryById(id, query));
    if (filteredSelectedIds.length === 0) {
      return;
    }

    const activeIndex = filteredSelectedIds.indexOf(activeId);
    const overIndex = filteredSelectedIds.indexOf(overId);

    if (activeIndex === -1 || overIndex === -1) {
      throw new ApiError(400, "REORDER_OUTSIDE_FILTER", "Both IDs must be in current filtered subset.");
    }

    const reorderedFilteredIds = arrayMove(filteredSelectedIds, activeIndex, overIndex);

    let reorderedCursor = 0;
    this.selectedOrder = this.selectedOrder.map((id) => {
      if (!this.matchesQueryById(id, query)) {
        return id;
      }

      const nextId = reorderedFilteredIds[reorderedCursor];
      reorderedCursor += 1;
      return nextId;
    });
  }

  sortSelectedById() {
    if (this.selectedOrder.length < 2) {
      return;
    }

    this.selectedOrder = mergeSortIds(this.selectedOrder);
  }

  getLeftPage({ query, offset, limit }) {
    const pageItems = [];
    let matchedCount = 0;
    let hasMore = false;

    const consume = (id) => {
      if (this.selectedSet.has(id)) {
        return false;
      }

      if (!this.matchesQueryById(id, query)) {
        return false;
      }

      if (matchedCount < offset) {
        matchedCount += 1;
        return false;
      }

      if (pageItems.length < limit) {
        pageItems.push(toItem(id));
        matchedCount += 1;
        return false;
      }

      hasMore = true;
      return true;
    };

    for (let id = BASE_MIN_ID; id <= BASE_MAX_ID; id += 1) {
      if (consume(String(id))) {
        break;
      }
    }

    if (!hasMore) {
      for (const manualId of this.manualIdsSorted) {
        if (consume(manualId)) {
          break;
        }
      }
    }

    return {
      items: pageItems,
      nextOffset: hasMore ? offset + pageItems.length : null
    };
  }

  getRightPage({ query, offset, limit }) {
    const filteredIds = this.selectedOrder.filter((id) => this.matchesQueryById(id, query));
    const pageIds = filteredIds.slice(offset, offset + limit);

    return {
      items: pageIds.map((id) => toItem(id)),
      nextOffset: offset + pageIds.length < filteredIds.length ? offset + pageIds.length : null
    };
  }

  getState({ addQueuePending, dataQueuePending }) {
    const baseCount = BASE_MAX_ID - BASE_MIN_ID + 1;
    const existingTotal = baseCount + this.manualIdsSet.size;

    return {
      baseRange: {
        from: BASE_MIN_ID,
        to: BASE_MAX_ID
      },
      counts: {
        existingTotal,
        selected: this.selectedOrder.length,
        leftVisibleTotalEstimate: existingTotal - this.selectedOrder.length,
        manualAdded: this.manualIdsSet.size
      },
      selectedOrder: [...this.selectedOrder],
      queue: {
        addPending: addQueuePending,
        dataPending: dataQueuePending
      }
    };
  }

  isBaseId(id) {
    if (!/^\d+$/.test(id)) {
      return false;
    }

    const numericId = Number(id);
    if (!Number.isSafeInteger(numericId)) {
      return false;
    }

    if (String(numericId) !== id) {
      return false;
    }

    return numericId >= BASE_MIN_ID && numericId <= BASE_MAX_ID;
  }

  matchesQueryById(id, query) {
    if (!query) {
      return true;
    }

    return String(id).includes(query);
  }
}
