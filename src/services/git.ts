import { Buffer } from "node:buffer";
import * as path from "node:path";
import { Err, ErrFromText, ErrFromUnknown, Ok, type Result } from "lib-result";
import {
  CommandError,
  NoChangesDetectedError,
  NoRepositoriesFoundError,
} from "@/lib/errors.ts";
import { Log } from "@/lib/logger.ts";

import type { CommandOutput } from "@/lib/types/index.ts";
import CommandService from "@/services/command.ts";
import FileSystemService from "@/services/fileSystem.ts";

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

  static async initialize(): Promise<string> {
    Log.debug("[gitService.initialize] ENTRY");
    const repoPath = await GitService.getRepoPath();
    if (repoPath.isError()) throw Log.error(repoPath.error.message).exit();

    GitService.setRepoPath(repoPath.ok);
    Log.debug(`[gitService.initialize] EXIT repoPath=${repoPath.ok}`);
    return repoPath.ok;
  }
  static async execGit(
    args: string[]
  ): Promise<Result<CommandOutput, CommandError>> {
    const cmd = await CommandService.execute("git", args, GitService.repoPath);
    if (cmd.isError()) return Err(cmd.error);

    const { stderr, code } = cmd.ok;

    if (code !== 0) {
      return Err(
        new CommandError(
          `Git Command failed with code ${code}${stderr ? `: ${stderr}` : ""}`,
          `git ${args.join(" ")}`,
          cmd.ok
        )
      );
    }
    return Ok(cmd.ok);
  }
  static calculateFileHash(content: string): string {
    // Simple hash calculation for git index
    const hash = Buffer.from(content).toString("base64");
    return hash.substring(0, 7);
  }
  static async hasHead(): Promise<boolean> {
    const cmd = await GitService.execGit(["rev-parse", "HEAD"]);
    return cmd.isOk() && cmd.ok.code === 0;
  }
  static async hasChanges(
    type: "staged" | "unstaged" | "untracked" | "deleted"
  ): Promise<boolean> {
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
        return false;
    }

    const cmd = await GitService.execGit(command);
    if (cmd.isError()) return false;

    return cmd.ok.stdout.trim().length > 0;
  }
  /**
   * Resolve current branch name. Returns `null` if HEAD is unborn (no commits).
   */
  static async currentBranch(): Promise<string | null> {
    const result = await GitService.execGit([
      "rev-parse",
      "--abbrev-ref",
      "HEAD",
    ]);
    if (result.isError()) return null;
    const branch = result.ok.stdout.trim();
    // git returns "HEAD" when there are no commits yet
    if (!branch || branch === "HEAD") return null;
    return branch;
  }
  /**
   * Whether any git remote is configured.
   */
  static async hasAnyRemote(): Promise<boolean> {
    const result = await GitService.execGit(["remote"]);
    return result.isOk() && result.ok.stdout.trim().length > 0;
  }
  /**
   * Whether an `origin` remote exists. The URL from `git remote get-url
   * origin` is treated as opaque: both HTTPS (https://host/org/repo.git) and
   * SSH (git@host:org/repo.git) origins resolve — only a missing origin fails.
   */
  static async hasOriginRemote(): Promise<boolean> {
    const result = await GitService.execGit(["remote", "get-url", "origin"]);
    return result.isOk() && result.ok.stdout.trim().length > 0;
  }
  /**
   * Whether the branch already tracks an upstream (`@{u}` resolves).
   */
  static async hasUpstream(branch: string): Promise<boolean> {
    const result = await GitService.execGit([
      "rev-parse",
      "--abbrev-ref",
      `${branch}@{u}`,
    ]);
    return result.isOk();
  }
  /**
   * Push the branch to `origin`, optionally setting the upstream (`-u`).
   */
  static async push(
    branch: string,
    options: { setUpstream: boolean }
  ): Promise<Result<CommandOutput, CommandError>> {
    const args = ["push"];
    if (options.setUpstream) args.push("-u");
    args.push("origin", branch);
    return await GitService.execGit(args);
  }
  static async isSubmodule(file: string): Promise<boolean> {
    const cmd = await GitService.execGit(["ls-files", "--stage", "--", file]);

    return cmd.isOk() && cmd.ok.stdout.includes("160000");
  }
  static async getDiff(
    diffMode: "staged" | "unstaged"
  ): Promise<Result<string, Error>> {
    Log.debug(`[gitService.getDiff] ENTRY diffMode=${diffMode}`);
    try {
      const hasStagedChanges = GitService.hasChanges("staged");

      const hasUnstagedChanges = GitService.hasChanges("unstaged");

      const hasUntrackedFiles = GitService.hasChanges("untracked");

      const diffs: string[] = [];

      if (diffMode === "staged") {
        if (!hasStagedChanges) {
          return Err(new NoChangesDetectedError("No staged changes detected."));
        }

        const diffResult = await GitService.execGit([
          "diff",
          "--cached",
          "--name-only",
        ]);
        if (diffResult.isError()) return Err(diffResult.error);

        const { stdout: stagedFiles } = diffResult.ok;

        const stagedFilesArray = stagedFiles
          .split("\n")
          .filter(file => file.trim());

        for (const file of stagedFilesArray) {
          if (!(await GitService.isSubmodule(file))) {
            const fileDiffResult = await GitService.execGit([
              "diff",
              "--cached",
              "--",
              file,
            ]);
            if (fileDiffResult.isError()) return Err(fileDiffResult.error);

            const { stdout: fileDiff } = fileDiffResult.ok;
            if (fileDiff.trim()) diffs.push(fileDiff);
          }
        }
        return Ok(diffs.join("\n\n").trim());
      }

      if (!hasUnstagedChanges && !hasUntrackedFiles) {
        return Err(new NoChangesDetectedError("No unstaged changes detected."));
      }

      if (await hasUnstagedChanges) {
        const unstagedResult = await GitService.execGit([
          "diff",
          "--name-only",
        ]);
        if (unstagedResult.isError()) return Err(unstagedResult.error);

        const { stdout: unstagedFiles } = unstagedResult.ok;

        const unstagedFilesArray = unstagedFiles
          .split("\n")
          .filter(file => file.trim());

        for (const file of unstagedFilesArray) {
          if (!(await GitService.isSubmodule(file))) {
            const fileDiffResult = await GitService.execGit([
              "diff",
              "--",
              file,
            ]);
            if (fileDiffResult.isError()) return Err(fileDiffResult.error);

            const { stdout: fileDiff } = fileDiffResult.ok;
            if (fileDiff.trim()) {
              diffs.push(`# Unstaged changes:\n${fileDiff}`);
            }
          }
        }
      }

      if (await hasUntrackedFiles) {
        const untrackedResult = await GitService.execGit([
          "ls-files",
          "--others",
          "--exclude-standard",
        ]);
        if (untrackedResult.isError()) return Err(untrackedResult.error);

        const { stdout: untrackedFiles } = untrackedResult.ok;

        const untrackedDiff = await Promise.all(
          untrackedFiles
            .split("\n")
            .filter(file => file.trim())
            .map(async file => {
              // Read the content of the new file
              const contentResult = await FileSystemService.readFile(
                path.join(GitService.repoPath, file)
              );
              if (contentResult.isError()) return "";

              const content = contentResult.ok;
              const lines = content.split("\n");
              const contentDiff = lines
                .map((line: string) => `+${line}`)
                .join("\n");
              return `diff --git a/${file} b/${file}\nnew file mode 100644\nindex 0000000..${GitService.calculateFileHash(content)}\n--- /dev/null\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n${contentDiff}`;
            })
        );
        const validUntrackedDiffs = untrackedDiff.filter(diff => diff.trim());
        if (validUntrackedDiffs.length > 0) {
          diffs.push(`# New files:\n${validUntrackedDiffs.join("\n")}`);
        }
      }

      const combinedDiff = diffs.join("\n\n").trim();
      if (!combinedDiff) {
        return Err(new NoChangesDetectedError("No changes detected."));
      }

      return Ok(combinedDiff);
    } catch (error) {
      return ErrFromUnknown(error);
    }
  }
  static async getChangedFiles(
    diffMode: "staged" | "unstaged" = "unstaged"
  ): Promise<Result<string[], Error>> {
    Log.debug(`[gitService.getChangedFiles] ENTRY diffMode=${diffMode}`);
    try {
      const outputResult = await GitService.execGit(["status", "--porcelain"]);
      if (outputResult.isError()) return Err(outputResult.error);

      const { stdout } = outputResult.ok;

      const files = stdout
        .split("\n")
        .filter(line => line.trim() !== "")
        .filter(line => {
          if (
            line.includes("Subproject commit") ||
            line.includes("Entering") ||
            line.includes("Submodule")
          ) {
            return false;
          }

          if (diffMode === "staged") {
            return STAGED_STATUS_CODES.includes(line[0] as GitStatusCode);
          }

          return line.startsWith("??") || line[1] !== " ";
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

      return Ok(files);
    } catch (error) {
      return ErrFromUnknown(error);
    }
  }
  static async isNewFile(filePath: string): Promise<boolean> {
    const normalizedPath = path.normalize(filePath.replace(/^\/+/, ""));
    const { stdout } = (
      await GitService.execGit(["status", "--porcelain", normalizedPath])
    ).unwrap();

    const status = stdout.slice(0, 2);
    return status.startsWith("??") || status.startsWith("A ");
  }
  static async isFileDeleted(filePath: string): Promise<boolean> {
    const normalizedPath = path.normalize(filePath.replace(/^\/+/, ""));

    // TODO: use `git ls-files --deleted` instead of `git status`
    const { stdout } = (
      await GitService.execGit(["status", "--porcelain"])
    ).unwrap();

    if (!stdout.trim()) return false;

    const lines = stdout.split("\n");
    for (const line of lines) {
      // Check for deletion in working tree (D ) or index ( D)
      if (line.startsWith("D ") || line.startsWith(" D")) {
        const [, ...gitPath] = line.split(/\s+/);
        if (gitPath.join(" ") === normalizedPath) return true;
      }
    }

    return false;
  }
  static async isGitRepo(): Promise<boolean> {
    const cmd = await CommandService.execute("git", [
      "rev-parse",
      "--is-inside-work-tree",
    ]);

    if (cmd.isError()) return false;

    const { stdout, stderr, code } = cmd.ok;
    return code === 0 && !stderr && stdout.startsWith("true");
  }
  static async getRepoPath(): Promise<Result<string>> {
    if (!(await GitService.isGitRepo())) {
      return Err(new NoRepositoriesFoundError());
    }

    const cmd = await GitService.execGit(["rev-parse", "--show-toplevel"]);

    if (cmd.isError() || cmd.ok.stderr || cmd.ok.code !== 0) {
      return ErrFromText(
        "Unable to determine the Git repository root directory."
      );
    }

    return Ok(cmd.ok.stdout.trim());
  }
  static setRepoPath(value: string) {
    GitService.repoPath = value;
  }
}

export default GitService;
