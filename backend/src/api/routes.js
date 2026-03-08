import { Router } from "express";

import { ApiError, DuplicateQueuedOperationError } from "../utils/errors.js";
import { parseId, parseListQuery, parseReorderQuery } from "../utils/validation.js";

function toKeyPart(value) {
  return encodeURIComponent(String(value));
}

function sendError(res, error) {
  if (error instanceof ApiError) {
    res.status(error.status).json({
      code: error.code,
      message: error.message
    });
    return;
  }

  if (error instanceof DuplicateQueuedOperationError) {
    res.status(409).json({
      code: "ALREADY_QUEUED",
      message: "Same operation is already queued."
    });
    return;
  }

  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Unexpected error."
  });
}

export function buildApiRouter({ store, addQueue, dataQueue }) {
  const router = Router();

  router.get("/items/left", async (req, res) => {
    try {
      const params = parseListQuery(req.query);

      const response = await dataQueue.enqueue({
        key: `left:${toKeyPart(params.query)}:${params.offset}:${params.limit}`,
        dedupePolicy: "merge",
        run: () => store.getLeftPage(params)
      });

      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/items/right", async (req, res) => {
    try {
      const params = parseListQuery(req.query);

      const response = await dataQueue.enqueue({
        key: `right:${toKeyPart(params.query)}:${params.offset}:${params.limit}`,
        dedupePolicy: "merge",
        run: () => store.getRightPage(params)
      });

      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/items/add", async (req, res) => {
    try {
      const id = parseId(req.body?.id);

      const response = await addQueue.enqueue({
        key: `add:${toKeyPart(id)}`,
        dedupePolicy: "reject",
        run: () => {
          store.addManualId(id);

          return {
            addedId: id
          };
        }
      });

      res.status(201).json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/selected/add", async (req, res) => {
    try {
      const id = parseId(req.body?.id);

      const response = await dataQueue.enqueue({
        key: `select:${toKeyPart(id)}`,
        dedupePolicy: "merge",
        run: () => {
          store.select(id);

          return {
            selectedId: id
          };
        }
      });

      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/selected/remove", async (req, res) => {
    try {
      const id = parseId(req.body?.id);

      const response = await dataQueue.enqueue({
        key: `unselect:${toKeyPart(id)}`,
        dedupePolicy: "merge",
        run: () => {
          store.unselect(id);

          return {
            unselectedId: id
          };
        }
      });

      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/selected/reorder", async (req, res) => {
    try {
      const activeId = parseId(req.body?.activeId);
      const overId = parseId(req.body?.overId);
      const query = parseReorderQuery(req.body?.query);

      const response = await dataQueue.enqueue({
        key: `reorder:${toKeyPart(activeId)}:${toKeyPart(overId)}:${toKeyPart(query)}`,
        dedupePolicy: "merge",
        run: () => {
          store.reorder({ activeId, overId, query });

          return {
            moved: {
              activeId,
              overId,
              query
            }
          };
        }
      });

      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.post("/selected/sort-by-id", async (_req, res) => {
    try {
      const response = await dataQueue.enqueue({
        key: "selected:sort-by-id",
        dedupePolicy: "merge",
        run: () => {
          store.sortSelectedById();

          return {
            sorted: true
          };
        }
      });

      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  router.get("/state", async (_req, res) => {
    try {
      const response = await dataQueue.enqueue({
        key: "state",
        dedupePolicy: "merge",
        run: () =>
          store.getState({
            addQueuePending: addQueue.getPendingCount(),
            dataQueuePending: dataQueue.getPendingCount()
          })
      });

      res.json(response);
    } catch (error) {
      sendError(res, error);
    }
  });

  return router;
}
