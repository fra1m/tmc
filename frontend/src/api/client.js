const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  if (!response.ok) {
    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    throw new HttpError(
      response.status,
      payload?.code ?? "HTTP_ERROR",
      payload?.message ?? `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

function toListQuery(params) {
  const search = new URLSearchParams({
    query: params.query ?? "",
    offset: String(params.offset ?? 0),
    limit: String(params.limit ?? 20)
  });

  return `?${search.toString()}`;
}

export function getLeftItems(params) {
  return request(`/items/left${toListQuery(params)}`);
}

export function getRightItems(params) {
  return request(`/items/right${toListQuery(params)}`);
}

export function addItem(id) {
  return request("/items/add", {
    method: "POST",
    body: JSON.stringify({ id })
  });
}

export function selectItem(id) {
  return request("/selected/add", {
    method: "POST",
    body: JSON.stringify({ id })
  });
}

export function unselectItem(id) {
  return request("/selected/remove", {
    method: "POST",
    body: JSON.stringify({ id })
  });
}

export function reorderSelected({ activeId, overId, query }) {
  return request("/selected/reorder", {
    method: "POST",
    body: JSON.stringify({ activeId, overId, query })
  });
}

export function sortSelectedById() {
  return request("/selected/sort-by-id", {
    method: "POST"
  });
}

export function getState() {
  return request("/state");
}
