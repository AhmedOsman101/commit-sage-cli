import { dirname } from "node:path";
import {
  Err,
  ErrFromText,
  Ok,
  type Result,
  wrapAsyncThrowable,
} from "lib-result";

const FileSystemService = {
  async fileExists(path: string): Promise<Result<boolean>> {
    try {
      const info = await Deno.stat(path);
      return Ok(info.isFile || info.isSymlink);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return ErrFromText(`File: '${path}' doesn't exist`);
      }

      return ErrFromText(`Cannot open file: '${path}'.`);
    }
  },
  async dirExists(path: string): Promise<Result<boolean>> {
    try {
      const info = await Deno.stat(path);
      return Ok(info.isDirectory);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return ErrFromText(`Directory: '${path}' doesn't exist`);
      }

      return ErrFromText(`Cannot open file: '${path}'.`);
    }
  },
  async readFile(path: string): Promise<Result<string>> {
    try {
      const isFile = await this.fileExists(path);
      if (isFile.isError()) return Err(isFile.error);

      return Ok(await Deno.readTextFile(path));
    } catch {
      return ErrFromText(`Cannot read file: '${path}'.`);
    }
  },
  async writeFile(
    path: string,
    content: string,
    file: Deno.FsFile | null = null
  ): Promise<Result<boolean>> {
    try {
      if (file !== null) {
        const encoder = new TextEncoder();
        const text = encoder.encode(`${content}\n`);
        file.writeSync(text);
        return Ok(true);
      }

      const isFile = await this.fileExists(path);
      if (isFile.isError()) return Err(isFile.error);

      Deno.writeTextFileSync(path, content);
      return Ok(true);
    } catch {
      return ErrFromText(`Cannot write to file: '${path}'.`);
    }
  },
  async createFile(path: string): Promise<Result<Deno.FsFile>> {
    try {
      const dir = dirname(path);

      const dirExists = await this.dirExists(dir);

      if (dirExists.isError() || !dirExists.ok) {
        const createDir = await this.createDir(dir);
        if (createDir.isError()) return Err(createDir.error);
      }

      const isFile = await this.fileExists(path);
      if (isFile.isError() || !isFile.ok) {
        return Ok(await Deno.create(path));
      }
      return ErrFromText(`Cannot create file: '${path}'.`);
    } catch {
      return ErrFromText(`Cannot create file: '${path}'.`);
    }
  },
  async createDir(path: string): Promise<Result<boolean>> {
    try {
      const dirExists = await this.dirExists(path);

      if (dirExists.isError() || !dirExists.ok) {
        await Deno.mkdir(path, { recursive: true });
      }

      return Ok(true);
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
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
    options?: Omit<Deno.MakeTempOptions, "prefix" | "suffix">
  ): Promise<Result<string>> {
    try {
      const path = await Deno.makeTempFile({ ...options, prefix, suffix });
      return Ok(path);
    } catch {
      return ErrFromText("Cannot create temporary file.");
    }
  },

  /**
   * Best-effort remove. Swallows errors — used in `finally` cleanup paths.
   */
  removeFile: wrapAsyncThrowable(Deno.remove),
};

export default FileSystemService;
