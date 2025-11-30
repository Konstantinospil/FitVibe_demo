"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toError = toError;
exports.toErrorPayload = toErrorPayload;
function toError(value) {
  if (value instanceof Error) {
    return value;
  }
  var message =
    typeof value === "string"
      ? value
      : value && typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return new Error(message);
}
function toErrorPayload(value) {
  var err = toError(value);
  var payload = { err: err };
  if (!(value instanceof Error)) {
    payload.raw = value;
  }
  return payload;
}
