import * as path from "node:path";
import { Err, ErrFromText, Ok, type Result } from "lib-result";
import { ERROR_MESSAGES, REPO_PATH } from "@/lib/constants.ts";
import CommandService from "./commandService.ts";
import FileSystemService from "./fileSystemService.ts";
import GitService from "./gitService.ts";

type BlameInfo = {
  commit: string;
  author: string;
  email: string;
  date: string;
  timestamp: number;
  line: string;
};

class GitBlameAnalyzer {
  static async getGitBlame(
    filePath: string
  ): Promise<Result<BlameInfo[], Error>> {
    const absoluteFilePath = path.resolve(REPO_PATH, filePath);
    const fileExistsResult =
      await FileSystemService.fileExists(absoluteFilePath);
    if (fileExistsResult.isError()) {
      return ErrFromText(`${ERROR_MESSAGES.fileNotFound}: ${absoluteFilePath}`);
    }
    if (!fileExistsResult.ok) {
      return ErrFromText(`${ERROR_MESSAGES.fileNotFound}: ${absoluteFilePath}`);
    }

    if (!GitService.hasHead()) {
      return ErrFromText(ERROR_MESSAGES.noCommitsYet);
    }

    if (GitService.isNewFile(filePath)) {
      return ErrFromText(ERROR_MESSAGES.fileNotCommitted);
    }

    if (GitService.isFileDeleted(filePath)) {
      return ErrFromText(ERROR_MESSAGES.fileDeleted);
    }
    const blameResult = GitBlameAnalyzer.executeGitBlame(filePath);
    if (blameResult.isError()) return Err(blameResult.error);

    return Ok(GitBlameAnalyzer.parseBlameOutput(blameResult.ok));
  }

  static parseBlameOutput(blameOutput: string): BlameInfo[] {
    const lines = blameOutput.split("\n");
    const blameInfos: BlameInfo[] = [];
    let currentBlame: Partial<BlameInfo> = {};

    for (const line of lines) {
      if (line.startsWith("author ")) {
        currentBlame.author = line.substring(7);
      } else if (line.startsWith("author-mail ")) {
        currentBlame.email = line.substring(12).replace(/[<>]/g, "");
      } else if (line.startsWith("author-time ")) {
        currentBlame.timestamp = Number.parseInt(line.substring(11), 10);
        currentBlame.date = new Date(
          currentBlame.timestamp * 1000
        ).toISOString();
      } else if (line.startsWith("\t")) {
        currentBlame.line = line.substring(1);
        if (GitBlameAnalyzer.isCompleteBlameInfo(currentBlame)) {
          blameInfos.push(currentBlame);
        }
        currentBlame = {};
      } else if (line.match(/^[0-9a-f]{40}/)) {
        currentBlame.commit = line.split(" ")[0];
      }
    }

    return blameInfos;
  }
  static executeGitBlame(filePath: string): Result<string, Error> {
    const cmdResult = CommandService.execute(
      "git",
      ["blame", "--line-porcelain", filePath.replaceAll('"', "")],
      REPO_PATH
    );

    if (cmdResult.isError()) return Err(cmdResult.error);
    return Ok(cmdResult.ok.stdout);
  }

  static getDiff(filePath: string): Result<string, Error> {
    const result = GitService.execGit(["diff", "--unified=0", "--", filePath]);

    if (result.isError()) return Err(result.error);
    return Ok(result.ok.stdout);
  }
  static async analyzeChanges(
    filePath: string
  ): Promise<Result<string, Error>> {
    const normalizedPath = path.normalize(filePath.replace(/^\/+/, ""));

    // First check if file is deleted or new, as these don't need blame analysis
    // Use git status to check file state
    if (GitService.isFileDeleted(filePath)) {
      return Ok(`Deleted file: ${normalizedPath}`);
    }

    if (GitService.isNewFile(filePath)) {
      return Ok(`New file: ${normalizedPath}`);
    }

    // For existing files, we need to get blame info
    const blameResult = await GitBlameAnalyzer.getGitBlame(normalizedPath);
    if (blameResult.isError()) return Err(blameResult.error);

    const diffResult = GitBlameAnalyzer.getDiff(normalizedPath);
    if (diffResult.isError()) return Err(diffResult.error);

    const changedLines = GitBlameAnalyzer.parseChangedLines(diffResult.ok);
    const authorChanges = GitBlameAnalyzer.analyzeBlameInfo(
      blameResult.ok,
      changedLines
    );
    return Ok(GitBlameAnalyzer.formatAnalysis(authorChanges));
  }

  static parseChangedLines(diff: string): Set<number> {
    const changedLines = new Set<number>();
    const lines = diff.split("\n");
    let currentLine = 0;

    for (const line of lines) {
      const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        currentLine = Number.parseInt(match[1], 10);
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        changedLines.add(currentLine);
        currentLine++;
      } else if (!line.startsWith("-") && !line.startsWith("---")) {
        currentLine++;
      }
    }

    return changedLines;
  }

  static analyzeBlameInfo(
    blame: BlameInfo[],
    changedLines: Set<number>
  ): Map<string, { count: number; lines: number[] }> {
    const authorChanges = new Map<string, { count: number; lines: number[] }>();

    blame.forEach((info, index) => {
      if (changedLines.has(index + 1)) {
        // changedLines.has(1)
        const key = `${info.author} <${info.email}>`; // author <author@mail.com>
        const current = authorChanges.get(key) || { count: 0, lines: [] }; // get existing data or create new data
        current.count++; // increase the count every time you have the changed lines by the same author
        current.lines.push(index + 1); // push the line that was modified
        authorChanges.set(key, current); // modify the authorChanges map of key to the new object
      }
    });

    return authorChanges;
  }

  static formatAnalysis(
    authorChanges: Map<string, { count: number; lines: number[] }>
  ): string {
    if (authorChanges.size === 0) {
      return "No changes detected.";
    }

    const sortedAuthors = Array.from(authorChanges.entries()).sort(
      (a, b) => b[1].count - a[1].count
    );

    return sortedAuthors
      .map(
        ([author, { count, lines }]) =>
          `${author} modified ${count} line${count === 1 ? "" : "s"} (${lines.join(", ")})`
      )
      .join("\n");
  }
  static getBlameInfo(filePath: string): Result<BlameInfo[], Error> {
    if (!GitService.hasHead()) {
      return ErrFromText(ERROR_MESSAGES.noCommitsYet);
    }

    if (GitService.isNewFile(filePath)) {
      return ErrFromText(ERROR_MESSAGES.fileNotCommitted);
    }

    if (GitService.isFileDeleted(filePath)) {
      return ErrFromText(ERROR_MESSAGES.fileDeleted);
    }

    const blameResult = GitBlameAnalyzer.executeGitBlame(filePath);
    if (blameResult.isError()) return Err(blameResult.error);

    return Ok(GitBlameAnalyzer.parseBlameOutput(blameResult.ok));
  }

  protected static isCompleteBlameInfo(
    blame: Partial<BlameInfo>
  ): blame is BlameInfo {
    return (
      blame.commit !== undefined &&
      blame.author !== undefined &&
      blame.email !== undefined &&
      blame.date !== undefined &&
      blame.timestamp !== undefined &&
      blame.line !== undefined
    );
  }
}

export default GitBlameAnalyzer;
