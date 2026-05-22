import { Data } from "effect";

export class AuthError extends Data.TaggedError("AuthError")<{
  message: string;
}> {}

export class ConfigError extends Data.TaggedError("ConfigError")<{
  message: string;
}> {}

export class ExternalServiceError extends Data.TaggedError(
  "ExternalServiceError",
)<{
  message: string;
  status?: number;
}> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  message: string;
}> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  message: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string;
}> {}
