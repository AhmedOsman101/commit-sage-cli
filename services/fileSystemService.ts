import type { Result } from "../index.d.ts";
import { configPath } from "../utils/constants.ts";

const FileSystemService = {
  async fileExists(path: string): Promise<Result<boolean>> {
    try {
      const info = await Deno.stat(path);
      return [info.isFile || info.isSymlink, null];
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return [null, `File: '${path}' doesn't exist`];
      }

      return [null, `Cannot open file: '${path}'.`];
    }
  },
  async dirExists(path: string): Promise<Result<boolean>> {
    try {
      const info = await Deno.stat(path);
      return [info.isDirectory, null];
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return [null, `Directory: '${path}' doesn't exist`];
      }

      return [null, `Cannot open file: '${path}'.`];
    }
  },
  async readFile(path: string): Promise<Result<string>> {
    try {
      const [, isFileError] = await this.fileExists(path);
      if (isFileError) return [null, isFileError];

      const content = await Deno.readTextFile(path);
      return [content, null];
    } catch (_error) {
      return [null, `Cannot read file: '${path}'.`];
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
        return [true, null];
      }

      const [, isFileError] = await this.fileExists(path);
      if (isFileError !== null) return [null, isFileError];

      Deno.writeTextFileSync(path, content);
      return [true, null];
    } catch (_error) {
      return [null, `Cannot write to file: '${path}'.`];
    }
  },
  async createFile(path: string): Promise<Result<Deno.FsFile>> {
    try {
      const dir = configPath.substring(0, configPath.lastIndexOf("/"));

      const [dirExists, dirExistsError] = await this.dirExists(dir);

      if (dirExistsError !== null || !dirExists) {
        const [, createDirError] = await this.createDir(dir);
        if (createDirError !== null) return [null, createDirError];
      }

      const [isFile, isFileError] = await this.fileExists(path);
      if (isFileError !== null || !isFile) {
        const file = await Deno.create(path);
        return [file, null];
      }

      return [null, `Cannot create file: '${path}'.`];
    } catch (_error) {
      return [null, `Cannot create file: '${path}'.`];
    }
  },
  async createDir(path: string): Promise<Result<null>> {
    try {
      const [dirExists, dirExistsError] = await this.dirExists(path);

      if (dirExistsError !== null || !dirExists) {
        await Deno.mkdir(path, { recursive: true });
      }

      return [null, null];
    } catch (error) {
      if (error instanceof Deno.errors.AlreadyExists) {
        return [null, `Directory: '${path}' already exists.`];
      }
      return [null, `Error creating directory: '${path}'.`];
    }
  },
};

export default FileSystemService;
