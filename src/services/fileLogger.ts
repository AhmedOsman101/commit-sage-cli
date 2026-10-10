import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { wrap } from "lib-result";
import { JsonStringify } from "@/lib/utils.ts";

function getCacheDir(): string {
  const OS = process.platform;
  const HOME_DIR = homedir();

  switch (OS) {
    case "darwin": // macOS
    case "linux":
    case "freebsd":
    case "netbsd":
    case "openbsd": {
      const base = process.env.XDG_CACHE_HOME ?? join(HOME_DIR, ".cache");
      return join(base, "commitSage");
    }
    case "win32": {
      const base = process.env.LOCALAPPDATA;
      return base ? join(base, "commitSage") : join(HOME_DIR, "commitSage");
    }
    default:
      return join(HOME_DIR, ".commitSage");
  }
}

const CACHE_DIR = getCacheDir();
const LOG_FILE = join(CACHE_DIR, "commit-sage.log");

function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

class FileLogger {
  private static ensureLogDir(): void {
    try {
      mkdirSync(CACHE_DIR, { recursive: true });
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "EEXIST")
      ) {
        console.error("Failed to create log directory:", error);
      }
    }
  }

  private static write(
    level: string,
    message: string,
    details?: unknown
  ): void {
    // Ignore errors - directory may already exist
    wrap(FileLogger.ensureLogDir);

    const timestamp = formatTimestamp(new Date());
    let logEntry = `${timestamp} [${level}] ${message}`;

    if (details) {
      if (details instanceof Error) {
        logEntry += `\n  Error: ${details.message}`;
        if (details.stack) {
          logEntry += `\n  Stack: ${details.stack}`;
        }
      } else if (Array.isArray(details)) {
        for (const item of details) {
          if (item instanceof Error) {
            logEntry += `\n  Error: ${item.message}`;
            if (item.stack) {
              logEntry += `\n  Stack: ${item.stack}`;
            }
          }
        }
      } else {
        const detailsMsg = JsonStringify(details, null, 2).unwrapOr(
          String(details)
        );

        logEntry += `\n  Details: ${detailsMsg}`;
      }
    }

    logEntry += "\n";

    try {
      appendFileSync(LOG_FILE, logEntry);
    } catch (e) {
      console.error("Failed to write to log file:", e);
    }
  }

  static error(message: string, details?: unknown): void {
    FileLogger.write("ERROR", message, details);
  }

  static warn(message: string, details?: unknown): void {
    FileLogger.write("WARN", message, details);
  }

  static info(message: string, _details?: unknown): void {
    FileLogger.ensureLogDir();
    const timestamp = formatTimestamp(new Date());
    const logEntry = `${timestamp} [INFO] ${message}\n`;
    try {
      appendFileSync(LOG_FILE, logEntry);
    } catch {
      /* Ignored */
    }
  }

  static debug(message: string, _details?: unknown): void {
    FileLogger.ensureLogDir();
    const timestamp = formatTimestamp(new Date());
    const logEntry = `${timestamp} [DEBUG] ${message}\n`;
    try {
      appendFileSync(LOG_FILE, logEntry);
    } catch {
      // Ignore
    }
  }
}

export default FileLogger;
