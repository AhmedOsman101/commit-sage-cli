import { configPath } from "../lib/constants.ts";
import { Err, Ok, type Result } from "../result.ts";

const FileSystemService = {
  async fileExists(path: string): Promise<Result<boolean>> {
    try {
      const info = await Deno.stat(path);
      return Ok(info.isFile || info.isSymlink);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return Err(new Error(`File: '${path}' doesn't exist`));
      }

      return Err(new Error(`Cannot open file: '${path}'.`));
    }
  },
  async dirExists(path: string): Promise<Result<boolean>> {
    try {
      const info = await Deno.stat(path);
      return Ok(info.isDirectory);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return Err(new Error(`Directory: '${path}' doesn't exist`));
      }

      return Err(new Error(`Cannot open file: '${path}'.`));
    }
  },
  async readFile(path: string): Promise<Result<string>> {
    try {
      const { error: isFileError } = await this.fileExists(path);
      if (isFileError) return Err(isFileError);

      return Ok(await Deno.readTextFile(path));
    } catch (_error) {
      return Err(new Error(`Cannot read file: '${path}'.`));
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
        const text = encoder.encode(content);
        file.writeSync(text);
        return Ok(true);
      }

      const { error: isFileError } = await this.fileExists(path);
      if (isFileError !== undefined) return Err(isFileError);

      Deno.writeTextFileSync(path, content);
      return Ok(true);
    } catch (_error) {
      return Err(new Error(`Cannot write to file: '${path}'.`));
    }
  },
  async createFile(path: string): Promise<Result<Deno.FsFile>> {
    try {
      const dir = configPath.substring(0, configPath.lastIndexOf("/"));

      const { ok: dirExists, error: dirExistsError } =
        await this.dirExists(dir);

      if (dirExistsError !== undefined || !dirExists) {
        const { error: createDirError } = await this.createDir(dir);
        if (createDirError !== undefined) return Err(createDirError);
      }

      const { ok: isFile, error: isFileError } = await this.fileExists(path);
      if (isFileError !== undefined || !isFile) {
        return Ok(await Deno.create(path));
      }
      return Err(new Error(`Cannot create file: '${path}'.`));
    } catch (_error) {
      return Err(new Error(`Cannot create file: '${path}'.`));
    }
  },
  async createDir(path: string): Promise<Result<null>> {
    try {
      const { ok: dirExists, error: dirExistsError } =
        await this.dirExists(path);

      if (dirExistsError !== undefined || !dirExists) {
        await Deno.mkdir(path, { recursive: true });
      }

      return Ok(null);
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        return Err(new Error(`Directory: '${path}' already exists.`));
      }
      return Err(new Error(`Error creating directory: '${path}'.`));
    }
  },
};

export default FileSystemService;
