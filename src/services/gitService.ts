import { Buffer } from "node:buffer";
import * as path from "node:path";
import { Err, ErrFromText, Ok, type Result } from "lib-result";
import {
  NoChangesDetectedError,
  NoRepositoriesFoundError,
} from "../lib/errors.ts";
import type { CommandOutput } from "../lib/index.d.ts";
import { logError } from "../lib/logger.ts";
import CommandService from "./commandService.ts";
import FileSystemService from "./fileSystemService.ts";

const GIT_STATUS_CODES = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
  untracked: "??",
  submodule: "S",
} as const;

type GitStatusCode = (typeof GIT_STATUS_CODES)[keyof typeof GIT_STATUS_CODES];

const STAGED_STATUS_CODES: GitStatusCode[] = [
  GIT_STATUS_CODES.modified,
  GIT_STATUS_CODES.added,
  GIT_STATUS_CODES.deleted,
  GIT_STATUS_CODES.renamed,
];

class GitService {
  static repoPath = "";

  static initialize(): string {
    const repoPath = GitService.getRepoPath();
    if (repoPath.isError()) logError(repoPath.error.message);

    GitService.setRepoPath(repoPath.ok);
    return repoPath.ok;
  }
  static execGit(args: string[]): Result<CommandOutput> {
    const cmd = CommandService.execute("git", args, GitService.repoPath);
    if (cmd.isError()) return Err(cmd.error);

    const { stderr, code } = cmd.ok;

    if (code !== 0)
      return ErrFromText(
        `Git Command failed with code ${code}${stderr ? `: ${stderr}` : ""}`
      );

    return Ok(cmd.ok);
  }
  static calculateFileHash(content: string): string {
    // Simple hash calculation for git index
    const hash = Buffer.from(content).toString("base64");
    return hash.substring(0, 7);
  }
  static hasHead(): boolean {
    const cmd = GitService.execGit(["rev-parse", "HEAD"]);
    return cmd.isOk() && cmd.ok.code === 0;
  }
  static hasChanges(
    type: "staged" | "unstaged" | "untracked" | "deleted"
  ): boolean {
    let command: string[];
    switch (type) {
      case "staged":
        command = ["diff", "--cached", "--name-only"];
        break;
      case "unstaged":
        command = ["diff", "--name-only"];
        break;
      case "untracked":
        command = ["ls-files", "--others", "--exclude-standard"];
        break;
      case "deleted":
        command = ["ls-files", "--deleted"];
        break;
      default:
        throw new Error(`Invalid change type: ${type}`);
    }

    const cmd = GitService.execGit(command);
    if (cmd.isError()) {
      logError(`Error checking for ${type} changes`);
    }

    return cmd.ok.stdout.trim().length > 0;
  }
  static isSubmodule(file: string): boolean {
    const cmd = GitService.execGit(["ls-files", "--stage", "--", file]);

    return cmd.isOk() && cmd.ok.stdout.includes("160000");
  }
  static async getDiff(onlyStagedChanges: boolean): Promise<string> {
    try {
      const hasHead = GitService.hasHead();

      const hasStagedChanges = GitService.hasChanges("staged");

      const hasUnstagedChanges = GitService.hasChanges("unstaged");

      const hasUntrackedFiles = GitService.hasChanges("untracked");

      const hasDeletedFiles = hasHead && GitService.hasChanges("deleted");

      if (
        !hasStagedChanges &&
        !hasUnstagedChanges &&
        !hasUntrackedFiles &&
        !hasDeletedFiles
      ) {
        throw new NoChangesDetectedError("No changes detected.");
      }
      const diffs: string[] = [];

      // Skip submodule changes
      // If we only want staged changes and there are some, return only those
      if (onlyStagedChanges && hasStagedChanges) {
        const diffResult = GitService.execGit([
          "diff",
          "--cached",
          "--name-only",
        ]);
        if (diffResult.isError()) throw diffResult.error;

        const { stdout: stagedFiles } = diffResult.ok;

        const stagedFilesArray = stagedFiles
          .split("\n")
          .filter(file => file.trim());

        for (const file of stagedFilesArray) {
          if (!GitService.isSubmodule(file)) {
            const { stdout: fileDiff } = GitService.execGit([
              "diff",
              "--cached",
              "--",
              file,
            ]).unwrap();

            if (fileDiff.trim()) diffs.push(fileDiff);
          }
        }
        return diffs.join("\n\n").trim();
      }

      // Otherwise, get all changes
      if (hasStagedChanges) {
        const diffResult = GitService.execGit([
          "diff",
          "--cached",
          "--name-only",
        ]);

        if (diffResult.isError()) {
          throw new Error(`${diffResult.error.message} hasStagedChanges`);
        }

        const { stdout: stagedFiles } = diffResult.ok;
        const stagedFilesArray = stagedFiles
          .split("\n")
          .filter(file => file.trim());

        for (const file of stagedFilesArray) {
          if (!GitService.isSubmodule(file)) {
            const diffCached = GitService.execGit([
              "diff",
              "--cached",
              "--",
              file,
            ]);

            if (diffCached.isError()) {
              throw new Error(
                `${diffCached.error.message} hasStagedChanges ${file} loop`
              );
            }

            const { stdout: fileDiff } = diffCached.ok;
            if (fileDiff.trim()) {
              diffs.push(`# Staged changes:\n${fileDiff}`);
            }
          }
        }
      }

      if (hasUnstagedChanges) {
        const { stdout: unstagedFiles } = GitService.execGit([
          "diff",
          "--name-only",
        ]).unwrap();

        const unstagedFilesArray = unstagedFiles
          .split("\n")
          .filter(file => file.trim());

        for (const file of unstagedFilesArray) {
          if (!GitService.isSubmodule(file)) {
            const { stdout: fileDiff } = GitService.execGit([
              "diff",
              "--",
              file,
            ]).unwrap();

            if (fileDiff.trim()) {
              diffs.push(`# Unstaged changes:\n${fileDiff}`);
            }
          }
        }
      }

      if (hasUntrackedFiles) {
        const { stdout: untrackedFiles } = GitService.execGit([
          "ls-files",
          "--others",
          "--exclude-standard",
        ]).unwrap();

        const untrackedDiff = await Promise.all(
          untrackedFiles
            .split("\n")
            .filter(file => file.trim())
            .map(async file => {
              try {
                // Read the content of the new file
                const content = await FileSystemService.readFile(
                  path.join(GitService.repoPath, file)
                ).then(result => result.unwrap());

                const lines = content.split("\n");
                const contentDiff = lines
                  .map((line: string) => `+${line}`)
                  .join("\n");
                return `diff --git a/${file} b/${file}\nnew file mode 100644\nindex 0000000..${GitService.calculateFileHash(content)}\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n${contentDiff}`;
              } catch (error) {
                logError(
                  `Error reading new file ${file}: ${(error as Error).message}`
                );
              }
            })
        );
        const validUntrackedDiffs = untrackedDiff.filter(diff => diff.trim());
        if (validUntrackedDiffs.length > 0) {
          diffs.push(`# New files:\n${validUntrackedDiffs.join("\n")}`);
        }
      }

      if (hasDeletedFiles) {
        const { stdout: deletedFiles } = GitService.execGit([
          "ls-files",
          "--deleted",
        ]).unwrap();

        const deletedDiff = deletedFiles
          .split("\n")
          .filter(file => file.trim())
          .map(file => {
            try {
              const { stdout: oldContent } = GitService.execGit([
                "show",
                `HEAD:${file}`,
              ]).unwrap();

              return `diff --git a/${file} b/${file}\ndeleted file mode 100644\n--- a/${file}\n+++ /dev/null\n@@ -1 +0,0 @@\n-${oldContent.trim()}\n`;
            } catch {
              return "";
            }
          });

        const validDeletedDiffs = deletedDiff.filter(diff => diff.trim());
        if (validDeletedDiffs.length > 0) {
          diffs.push(`# Deleted files:\n${validDeletedDiffs.join("\n")}`);
        }
      }

      const combinedDiff = diffs.join("\n\n").trim();
      if (!combinedDiff) {
        throw new NoChangesDetectedError("No changes detected.");
      }

      return combinedDiff;
    } catch (error) {
      logError(`Failed to get diff: ${(error as Error).message}`);
    }
  }
  static getChangedFiles(onlyStaged = false): string[] {
    try {
      const output = GitService.execGit(["status", "--porcelain"]).unwrap();

      return output.stdout
        .split("\n")
        .filter(line => line.trim() !== "")
        .filter(line => {
          if (line.includes("Subproject commit") || line.includes("Entering")) {
            return false;
          }

          if (onlyStaged) {
            // For staged changes, check first character
            return STAGED_STATUS_CODES.includes(line[0] as GitStatusCode);
          }
          // For all changes, check both staged and unstaged status
          const [staged, unstaged] = [line[0], line[1]];
          return staged !== " " || unstaged !== " ";
        })
        .map(line => {
          const status = line.substring(0, 2);
          let filePath = line.trim().substring(2).trim();

          // Handle renamed files (they have format "R100 old-name -> new-name")
          if (status.startsWith("R")) {
            filePath = filePath.split(" -> ")[1];
          }

          // Return relative path as git status returns it
          return filePath;
        });
    } catch (error) {
      logError(`Error getting changed files: ${(error as Error).message}`);
    }
  }
  static isNewFile(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath.replace(/^\/+/, ""));
    const { stdout } = GitService.execGit([
      "status",
      "--porcelain",
      normalizedPath,
    ]).unwrap();

    const status = stdout.slice(0, 2);
    return status.startsWith("??") || status.startsWith("A ");
  }
  static isFileDeleted(filePath: string): boolean {
    const normalizedPath = path.normalize(filePath.replace(/^\/+/, ""));
    const { stdout } = GitService.execGit([
      "status",
      "--porcelain",
      normalizedPath,
    ]).unwrap();

    const status = stdout.slice(0, 2);
    return status === " D" || status === "D ";
  }
  static isGitRepo(): boolean {
    const cmd = CommandService.execute("git", [
      "rev-parse",
      "--is-inside-work-tree",
    ]);

    if (cmd.isError()) return false;

    const { stdout, stderr, code } = cmd.ok;
    return code === 0 && !stderr && stdout.startsWith("true");
  }
  static getRepoPath(): Result<string> {
    if (!GitService.isGitRepo()) {
      return Err(new NoRepositoriesFoundError());
    }

    const cmd = GitService.execGit(["rev-parse", "--show-toplevel"]);

    if (cmd.isError() || cmd.ok.stderr || cmd.ok.code !== 0) {
      return ErrFromText(
        "Unable to determine the Git repository root directory."
      );
    }

    return Ok(cmd.ok.stdout);
  }
  static setRepoPath(value: string) {
    GitService.repoPath = value;
  }
}

export default GitService;
