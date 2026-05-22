import { Schema } from "effect";

export class BackendAuthError extends Schema.TaggedError<BackendAuthError>()(
  "BackendAuthError",
  { message: Schema.String },
) {}

export class BackendExternalError extends Schema.TaggedError<BackendExternalError>()(
  "BackendExternalError",
  { message: Schema.String, status: Schema.optional(Schema.Number) },
) {}

export class BackendNotFoundError extends Schema.TaggedError<BackendNotFoundError>()(
  "BackendNotFoundError",
  { message: Schema.String },
) {}

export class BackendValidationError extends Schema.TaggedError<BackendValidationError>()(
  "BackendValidationError",
  { message: Schema.String },
) {}

export const BackendError = Schema.Union(
  BackendAuthError,
  BackendExternalError,
  BackendNotFoundError,
  BackendValidationError,
);
