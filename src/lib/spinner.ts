import { green } from "@std/fmt/colors";
import { Encoder } from "@/lib/utils.ts";

const FRAMES = ["⢎ ", "⠎⠁", "⠊⠑", "⠈⠱", " ⡱", "⢀⡰", "⢄⡠", "⢆⡀"];
const INTERVAL_MS = 75;

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

type SpinnerOptions = {
  /** Text next to the animation. Mutable while running. */
  message?: string;
  /** Frame interval in milliseconds. Defaults to 75. */
  interval?: number;
};

/**
 * Animated spinner for long-running steps. Writes to stderr only (stdout
 * stays clean for scripting) and renders nothing when stderr is not a TTY.
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
  message: string;
  #interval: number;
  #timer?: ReturnType<typeof setInterval>;
  #frame = 0;
  #active = false;
  #isTTY: boolean;
  #signalHandlers: Array<{
    signal: (typeof SIGNALS)[number];
    handler: () => void;
  }> = [];

  constructor(options: SpinnerOptions = {}) {
    this.message = options.message ?? "";
    this.#interval = options.interval ?? INTERVAL_MS;
    this.#isTTY = Deno.stderr.isTerminal();
  }

  start(): void {
    if (this.#active || !this.#isTTY) return;
    this.#active = true;
    this.#render();
    this.#timer = setInterval(() => {
      this.#frame = (this.#frame + 1) % FRAMES.length;
      this.#render();
    }, this.#interval);
    this.#attachSignalHandlers();
  }

  /** Erase the spinner line completely. Idempotent. */
  stop(): void {
    if (!this.#active) return;
    this.#active = false;
    if (this.#timer !== undefined) {
      clearInterval(this.#timer);
      this.#timer = undefined;
    }
    this.#detachSignalHandlers();
    Deno.stderr.writeSync(Encoder.encode("\r\x1b[K"));
  }

  #render(): void {
    Deno.stderr.writeSync(
      Encoder.encode(green(`\r${FRAMES[this.#frame]} ${this.message}`))
    );
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

export type { SpinnerOptions };
export { Spinner };
