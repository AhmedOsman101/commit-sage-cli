import {
  type SpinnerOptions,
  Spinner as StdSpinner,
} from "@std/cli/unstable-spinner";

// Deno equivalent of `trap ... INT TERM HUP`: once any listener is
// registered for a signal, its default "terminate immediately" behavior is
// gone — the handler MUST terminate the process itself, or the signal is
// swallowed and the process hangs. Hence stop()-then-exit inside the
// handler, with the conventional 128 + signum codes shells report.
const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
const SIGNAL_EXIT_CODES: Record<(typeof SIGNALS)[number], number> = {
  SIGINT: 130,
  SIGTERM: 143,
  SIGHUP: 129,
};

/**
 * Animated spinner for long-running steps. Thin wrapper over the standard
 * library spinner (`@std/cli/unstable-spinner`) that adds the two behaviors
 * std lacks and this CLI depends on:
 *
 * - stderr only, and renders nothing when stderr is not a TTY (stdout stays
 *   byte-clean for scripting, CI logs stay frame-free);
 * - signal trap: INT/TERM/HUP clear the spinner line, then the process dies
 *   with the conventional 130/143/129 instead of leaving a frame behind.
 *
 * The cursor is deliberately never hidden: SIGKILL cannot be trapped by
 * anyone, and a hidden cursor would outlive the spinner in that case.
 *
 * ```ts
 * const spinner = new Spinner({ message: "Generating..." });
 * spinner.start();
 * const result = await slowStep();
 * spinner.stop();
 * ```
 */
class Spinner {
  #options: SpinnerOptions;
  #inner?: StdSpinner;
  #signalHandlers: Array<{
    signal: (typeof SIGNALS)[number];
    handler: () => void;
  }> = [];

  constructor(options: SpinnerOptions = {}) {
    this.#options = options;
    this.#options.output = Deno.stderr;
    this.#options.color = this.#options.color ?? "green";
    this.#options.spinner = this.#options.spinner ?? [
      "⢎ ",
      "⠎⠁",
      "⠊⠑",
      "⠈⠱",
      " ⡱",
      "⢀⡰",
      "⢄⡠",
      "⢆⡀",
    ];
  }

  start(): void {
    // std animates into any writable stream — gate on TTY here so piped
    // runs stay silent.
    if (this.#inner !== undefined || !Deno.stderr.isTerminal()) return;
    this.#inner = new StdSpinner(this.#options);
    this.#inner.start();
    this.#attachSignalHandlers();
  }

  /** Erase the spinner line completely. Idempotent. */
  stop(): void {
    if (this.#inner === undefined) return;
    this.#detachSignalHandlers();
    this.#inner.stop();
    this.#inner = undefined;
  }

  // Signal trap: clear the spinner line, then die with the conventional
  // code so `kill -TERM <pid>` et al behave like an untrapped death minus
  // the leftover frame on the terminal.
  #attachSignalHandlers(): void {
    for (const signal of SIGNALS) {
      const handler = (): void => {
        this.stop();
        Deno.exit(SIGNAL_EXIT_CODES[signal]);
      };
      try {
        Deno.addSignalListener(signal, handler);
        this.#signalHandlers.push({ signal, handler });
      } catch {
        // Unsupported signal on this platform (e.g. SIGHUP on Windows).
      }
    }
  }

  #detachSignalHandlers(): void {
    for (const { signal, handler } of this.#signalHandlers) {
      try {
        Deno.removeSignalListener(signal, handler);
      } catch {
        // Already removed or unsupported — nothing to undo.
      }
    }
    this.#signalHandlers = [];
  }
}

// Re-exported so callers never touch the std import directly; if the
// unstable API moves, only this module changes.
export { Spinner };
