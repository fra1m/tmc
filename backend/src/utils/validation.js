import { ApiError } from "./errors.js";
import { PAGE_LIMIT } from "../config.js";

export function parseId(value) {
  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      throw new ApiError(400, "VALIDATION_ERROR", "ID must not be empty.");
    }

    return trimmedValue;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ApiError(400, "VALIDATION_ERROR", "ID number must be finite.");
    }

    return String(value);
  }

  throw new ApiError(400, "VALIDATION_ERROR", "ID must be string or number.");
}

function parseNonNegativeInt(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new ApiError(400, "VALIDATION_ERROR", "offset must be a non-negative integer.");
  }

  return Number(value);
}

export function parseListQuery(queryObject) {
  const query = typeof queryObject.query === "string" ? queryObject.query.trim() : "";
  const offset = parseNonNegativeInt(queryObject.offset, 0);

  return {
    query,
    offset,
    limit: PAGE_LIMIT
  };
}

export function parseReorderQuery(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}
