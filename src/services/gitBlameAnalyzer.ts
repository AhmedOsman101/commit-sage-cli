import * as path from "node:path";
import { ERROR_MESSAGES, REPO_PATH } from "../lib/constants.ts";
import { logError } from "../lib/logger.ts";
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
  static async getGitBlame(filePath: string): Promise<BlameInfo[]> {
    try {
      const absoluteFilePath = path.resolve(REPO_PATH, filePath);
      if (!(await FileSystemService.fileExists(absoluteFilePath))) {
        throw new Error(`${ERROR_MESSAGES.fileNotFound}: ${absoluteFilePath}`);
      }

      if (!GitService.hasHead()) {
        throw new Error(ERROR_MESSAGES.noCommitsYet);
      }

      if (GitService.isNewFile(filePath)) {
        throw new Error(ERROR_MESSAGES.fileNotCommitted);
      }

      if (GitService.isFileDeleted(filePath)) {
        throw new Error(ERROR_MESSAGES.fileDeleted);
      }

      const blameOutput = GitBlameAnalyzer.executeGitBlame(filePath);
      return GitBlameAnalyzer.parseBlameOutput(blameOutput);
    } catch (error) {
      logError("Error getting blame info:", (error as Error).message);
    }
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
  static executeGitBlame(filePath: string): string {
    const { stdout } = CommandService.execute(
      "git",
      ["blame", "--line-porcelain", filePath.replaceAll('"', "")],
      REPO_PATH
    ).unwrap();

    return stdout;
  }

  static getDiff(filePath: string): string {
    const { stdout } = GitService.execGit([
      "diff",
      "--unified=0",
      "--",
      filePath,
    ]).unwrap();

    return stdout;
  }
  static async analyzeChanges(filePath: string): Promise<string> {
    try {
      const normalizedPath = path.normalize(filePath.replace(/^\/+/, ""));

      // First check if file is deleted or new, as these don't need blame analysis
      // Use git status to check file state
      if (GitService.isFileDeleted(filePath)) {
        return `Deleted file: ${normalizedPath}`;
      }

      if (GitService.isNewFile(filePath)) {
        return `New file: ${normalizedPath}`;
      }

      // For existing files, we need to get blame info
      const blame = await GitBlameAnalyzer.getGitBlame(normalizedPath);

      const diff = GitBlameAnalyzer.getDiff(normalizedPath);

      const changedLines = GitBlameAnalyzer.parseChangedLines(diff);
      const authorChanges = GitBlameAnalyzer.analyzeBlameInfo(
        blame,
        changedLines
      );
      return GitBlameAnalyzer.formatAnalysis(authorChanges);
    } catch (error) {
      logError("Error analyzing changes:", (error as Error).message);
    }
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
  static getBlameInfo(filePath: string): BlameInfo[] {
    try {
      if (!GitService.hasHead()) {
        throw new Error(ERROR_MESSAGES.noCommitsYet);
      }

      if (GitService.isNewFile(filePath)) {
        throw new Error(ERROR_MESSAGES.fileNotCommitted);
      }

      if (GitService.isFileDeleted(filePath)) {
        console.log(`${filePath} is deleted`);
        throw new Error(ERROR_MESSAGES.fileDeleted);
      }

      const blameOutput = GitBlameAnalyzer.executeGitBlame(filePath);
      return GitBlameAnalyzer.parseBlameOutput(blameOutput);
    } catch (error) {
      logError("Error getting blame info:", (error as Error).message);
    }
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
