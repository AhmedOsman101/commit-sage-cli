import pc from "picocolors";

const encoder = new TextEncoder();

// \r -> column 0; \u001b[K -> clear to end of line. Together they erase the
// previous frame without touching the cursor position.
const LINE_CLEAR = encoder.encode("\r\u001b[K");
const DEFAULT_INTERVAL = 75;
const DEFAULT_SPINNER = ["⢎ ", "⠎⠁", "⠊⠑", "⠈⠱", " ⡱", "⢀⡰", "⢄⡠", "⢆⡀"];

type Color =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray";

const COLORS: Record<Color, (str: string) => string> = {
  black: pc.black,
  red: pc.red,
  green: pc.green,
  yellow: pc.yellow,
  blue: pc.blue,
  magenta: pc.magenta,
  cyan: pc.cyan,
  white: pc.white,
  gray: pc.gray,
};

interface SpinnerOptions {
  spinner?: string[];
  message?: string;
  interval?: number;
  color?: Color;
}

const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
type Signal = (typeof SIGNALS)[number];

// Conventional 128 + signum codes that shells report for each signal.
const SIGNAL_EXIT_CODES: Record<Signal, number> = {
  SIGINT: 130,
  SIGTERM: 143,
  SIGHUP: 129,
};

// A named color resolves to its ANSI opener; anything else is assumed to be
// a raw ANSI escape the caller supplied (this is what the `Ansi` member of
// `Color` is for). Opening code only — the caller appends COLOR_RESET.
function resolveColor(color: Color): (str: string) => string {
  return COLORS[color as keyof typeof COLORS];
}

/**
 * Animated spinner for long-running steps.
 *
 * Behaviors that matter for this CLI:
 *
 * - writes only to stderr, and renders nothing when stderr is not a TTY
 *   (so stdout stays byte-clean for scripting, and CI logs stay frame-free);
 * - traps INT/TERM/HUP to clear the spinner line and then die with the
 *   conventional 130/143/129 exit code, rather than leaving a stray frame
 *   behind or — worse — swallowing the signal and hanging.
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
  #spinner: string[];
  #interval: number;
  #color: Color | undefined;
  #intervalId: ReturnType<typeof setInterval> | null = null;
  #signalHandlers: Array<{ signal: Signal; handler: () => void }> = [];

  /** The message shown next to the spinner. Safe to change while running. */
  message: string;

  constructor(options: SpinnerOptions = {}) {
    this.#spinner = options.spinner ?? DEFAULT_SPINNER;
    this.message = options.message ?? "";
    this.#interval = options.interval ?? DEFAULT_INTERVAL;
    this.color = options.color ?? "green";
  }

  get color(): Color | undefined {
    return this.#color;
  }

  set color(value: Color | undefined) {
    this.#color = value;
  }

  start(): void {
    if (this.#intervalId !== null) return;
    if (!process.stderr.isTTY) return;
    if (this.#spinner.length === 0) return;

    this.#attachSignalHandlers();

    const noColor = !pc.isColorSupported;
    let i = 0;

    const updateFrame = (): void => {
      const frame = this.#spinner[i];
      const styled =
        noColor || this.#color === undefined
          ? frame
          : `${resolveColor(this.#color)(frame)}`;

      // Single process.stderr.write per frame → no flicker between LINE_CLEAR and body.
      const body = encoder.encode(`${styled} ${this.message}`);
      const writeData = new Uint8Array(LINE_CLEAR.length + body.length);
      writeData.set(LINE_CLEAR);
      writeData.set(body, LINE_CLEAR.length);
      process.stderr.write(writeData);

      i = (i + 1) % this.#spinner.length;
    };

    this.#intervalId = setInterval(updateFrame, this.#interval);
    updateFrame();
  }

  /** Erase the spinner line and detach signal handlers. Idempotent. */
  stop(): void {
    if (this.#intervalId === null) return;
    clearInterval(this.#intervalId);
    this.#intervalId = null;
    this.#detachSignalHandlers();
    process.stderr.write(LINE_CLEAR);
  }

  // Registering any listener for a signal removes Node's default
  // "terminate immediately" behavior, so the handler MUST terminate the
  // process itself. Inside the handler we stop() first (a synchronous
  // process.stderr.write of LINE_CLEAR) and only then exit, so the terminal is clean
  // before the process dies.
  #attachSignalHandlers(): void {
    for (const signal of SIGNALS) {
      const handler = (): void => {
        this.stop();
        process.exit(SIGNAL_EXIT_CODES[signal]);
      };
      try {
        process.on(signal, handler);
        this.#signalHandlers.push({ signal, handler });
      } catch {
        // Unsupported signal on this platform (e.g. SIGHUP on some Windows
        // configurations) — nothing to undo.
      }
    }
  }

  #detachSignalHandlers(): void {
    for (const { signal, handler } of this.#signalHandlers) {
      try {
        process.off(signal, handler);
      } catch {
        // Already removed or unsupported — nothing to undo.
      }
    }
    this.#signalHandlers = [];
  }
}

export type { Color, SpinnerOptions };
export { Spinner };
