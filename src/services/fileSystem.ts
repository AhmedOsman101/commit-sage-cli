import { randomUUID } from "node:crypto";
import type { MakeDirectoryOptions } from "node:fs";
import { mkdir, open, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Err, ErrFromText, Ok, type Result, wrapAsync } from "lib-result";
import { Encoder } from "@/lib/utils.ts";

const FileSystemService = {
  async touch(path: string): Promise<Result<string>> {
    return await wrapAsync(async () => {
      // Open in append mode: creates the file if missing, never truncates it.
      const fileHandle = await open(path, "a");
      await fileHandle.close();

      // Update access and modification times
      const now = new Date();
      await utimes(path, now, now);
      return path;
    });
  },
  async fileExists(path: string): Promise<Result<boolean>> {
    try {
      const info = await stat(path);
      return Ok(info.isFile() || info.isSymbolicLink());
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return ErrFromText(`File: '${path}' doesn't exist`);
      }

      return ErrFromText(`Cannot open file: '${path}'.`);
    }
  },
  async dirExists(path: string): Promise<Result<boolean>> {
    try {
      const info = await stat(path);
      return Ok(info.isDirectory());
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return ErrFromText(`Directory: '${path}' doesn't exist`);
      }

      return ErrFromText(`Cannot open file: '${path}'.`);
    }
  },
  async readFile(path: string): Promise<Result<string>> {
    const isFile = await this.fileExists(path);
    if (isFile.isError()) return Err(isFile.error);
    return (await wrapAsync(async () => await Bun.file(path).text())).or(
      ErrFromText(`Cannot read file: '${path}'.`)
    );
  },
  async writeFile(
    path: string,
    content: string,
    file: Bun.BunFile | null = null
  ): Promise<Result<boolean>> {
    try {
      if (file !== null) {
        const text = Encoder.encode(`${content}\n`);
        await file.write(text);
        return Ok(true);
      }

      const isFile = await this.fileExists(path);
      if (isFile.isError()) return Err(isFile.error);

      await Bun.write(path, content);
      return Ok(true);
    } catch {
      return ErrFromText(`Cannot write to file: '${path}'.`);
    }
  },
  async createFile(path: string): Promise<Result<Bun.BunFile>> {
    try {
      const dir = dirname(path);

      const dirExists = await this.dirExists(dir);

      if (dirExists.isError() || !dirExists.ok) {
        const createDir = await this.createDir(dir);
        if (createDir.isError()) return Err(createDir.error);
      }

      const isFile = await this.fileExists(path);
      if (isFile.isError() || !isFile.ok) {
        const touchResult = await this.touch(path);
        if (touchResult.isError()) {
          return Err(touchResult.error);
        }
        return Ok(Bun.file(touchResult.ok));
      }
      return ErrFromText(`Cannot create file: '${path}'.`);
    } catch {
      return ErrFromText(`Cannot create file: '${path}'.`);
    }
  },
  async createDir(
    path: string,
    options?: MakeDirectoryOptions
  ): Promise<Result<boolean>> {
    try {
      const dirExists = await this.dirExists(path);

      if (dirExists.isError() || !dirExists.ok) {
        await mkdir(path, { ...options, recursive: true });
      }

      return Ok(true);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        return ErrFromText(`Directory: '${path}' already exists.`);
      }
      return ErrFromText(`Error creating directory: '${path}'.`);
    }
  },

  /**
   * Create a unique temp file with the given prefix and suffix.
   * Returns the absolute path. Caller is responsible for cleanup.
   */
  async createTempFile(
    prefix = "commit-sage-",
    suffix = ".txt",
    options?: { dir?: string }
  ): Promise<Result<string>> {
    return await wrapAsync(async () => {
      const dir = options?.dir ?? tmpdir();

      // Compose a unique basename: <prefix><uuid><suffix>.
      const path = join(dir, `${prefix}${randomUUID()}${suffix}`);

      // 'a' creates the file if it's missing and never truncates an
      // existing one — the same semantics as the `touch` helper above.
      const fileHandle = await open(path, "a");
      await fileHandle.close();

      return path;
    });
  },

  /**
   * Deletes a file from the file system.
   * @param path string | URL
   */
  async removeFile(path: string | URL) {
    await wrapAsync(async () => await Bun.file(path).delete());
  },
};

export default FileSystemService;
