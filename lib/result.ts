// Rust's Result enum simulation
export type Result<T, E extends Error = Error> =
  | { ok: T; error: undefined }
  | { ok: undefined; error: E };

export function Ok<T, E extends Error = Error>(ok: T): Result<T, E> {
  return { ok, error: undefined };
}

export function Err<T, E extends Error = Error>(error: E): Result<T, E> {
  return { ok: undefined, error };
}
