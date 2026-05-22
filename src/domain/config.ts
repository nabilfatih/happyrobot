import { Effect } from "effect";
import { ConfigError } from "./errors";

/** Reads a required secret from the server process environment. */
export function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    return Effect.fail(
      new ConfigError({ message: `${name} is required but was not set.` }),
    );
  }

  return Effect.succeed(value);
}

/** Compares secrets without leaking early mismatch timing for equal lengths. */
export function secretsMatch(provided: string, expected: string) {
  const maxLength = Math.max(provided.length, expected.length);
  let mismatch = provided.length === expected.length ? 0 : 1;

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return mismatch === 0;
}
