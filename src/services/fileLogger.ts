import { homedir } from "node:os";
import { join } from "node:path";

function getCacheDir(): string {
  const OS = Deno.build.os;
  const HOME_DIR = homedir();

  switch (OS) {
    case "freebsd":
    case "netbsd":
    case "darwin":
    case "linux":
      return join(HOME_DIR, ".cache", "commit-sage");
    // biome-ignore lint/suspicious/noFallthroughSwitchClause: If the directory doesn't exist use the default case
    case "windows": {
      const cacheDir = Deno.env.get("LOCALAPPDATA");
      if (cacheDir) return join(cacheDir, "commit-sage", "cache");
    }
    default:
      return join(HOME_DIR, ".commit-sage", "cache");
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
  private static ensureLogDirSync(): void {
    try {
      Deno.mkdirSync(CACHE_DIR, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        console.error("Failed to create log directory:", error);
      }
    }
  }

  private static writeSync(
    level: string,
    message: string,
    details?: unknown
  ): void {
    try {
      FileLogger.ensureLogDirSync();
    } catch {
      // Ignore - directory may already exist
    }

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
        try {
          logEntry += `\n  Details: ${JSON.stringify(details, null, 2)}`;
        } catch {
          logEntry += `\n  Details: ${String(details)}`;
        }
      }
    }

    logEntry += "\n";

    try {
      Deno.writeTextFileSync(LOG_FILE, logEntry, { append: true });
    } catch (e) {
      console.error("Failed to write to log file:", e);
    }
  }

  static error(message: string, details?: unknown): void {
    FileLogger.writeSync("ERROR", message, details);
  }

  static warn(message: string, details?: unknown): void {
    FileLogger.writeSync("WARN", message, details);
  }

  static info(message: string, _details?: unknown): void {
    FileLogger.ensureLogDirSync();
    const timestamp = formatTimestamp(new Date());
    const logEntry = `${timestamp} [INFO] ${message}\n`;
    try {
      Deno.writeTextFileSync(LOG_FILE, logEntry, { append: true });
    } catch {
      /* Ignored */
    }
  }

  static debug(message: string, _details?: unknown): void {
    FileLogger.ensureLogDirSync();
    const timestamp = formatTimestamp(new Date());
    const logEntry = `${timestamp} [DEBUG] ${message}\n`;
    try {
      Deno.writeTextFileSync(LOG_FILE, logEntry, { append: true });
    } catch {
      // Ignore
    }
  }
}

export default FileLogger;
