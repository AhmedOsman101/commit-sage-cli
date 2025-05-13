type OkState<T> = { ok: T; error: undefined };
type ErrorState<E extends Error = Error> = { ok: undefined; error: E };

// Rust's Result enum simulation
export type Result<T, E extends Error = Error> = OkState<T> | ErrorState<E>;

export function Ok<T>(ok: T): OkState<T> {
  return { ok, error: undefined };
}

export function Err<E extends Error = Error>(error: E): ErrorState<E> {
  return { ok: undefined, error };
}

export function Text2Err(message: string): ErrorState<Error> {
  return { ok: undefined, error: new Error(message) };
}
