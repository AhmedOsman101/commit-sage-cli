import * as fs from "node:fs";
import * as path from "node:path";
import { repoPath } from "../main.ts";
import { errorMessages } from "../utils/constants.ts";
import { logError } from "../utils/Logger.ts";
import CommandService from "./commandService.ts";
import GitService from "./gitService.ts";

type BlameInfo = {
  commit: string;
  author: string;
  email: string;
  date: string;
  timestamp: number;
  line: string;
};

const GitBlameAnalyzer = {
  async getGitBlame(filePath: string): Promise<BlameInfo[]> {
    try {
      const absoluteFilePath = path.resolve(repoPath as string, filePath);
      if (!fs.existsSync(absoluteFilePath)) {
        throw new Error(`${errorMessages.fileNotFound}: ${absoluteFilePath}`);
      }

      if (!(await GitService.hasHead())) {
        throw new Error(errorMessages.noCommitsYet);
      }

      if (await GitService.isNewFile(filePath)) {
        throw new Error(errorMessages.fileNotCommitted);
      }
      const blameOutput = await this.executeGitBlame(filePath);
      return this.parseBlameOutput(blameOutput);
    } catch (error) {
      void logError("Error getting blame info:", error as Error);
      throw error;
    }
  },

  parseBlameOutput(blameOutput: string): BlameInfo[] {
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
        if (
          currentBlame.author &&
          currentBlame.email &&
          currentBlame.date &&
          currentBlame.timestamp &&
          currentBlame.line
        ) {
          blameInfos.push(currentBlame as BlameInfo);
        }
        currentBlame = {};
      } else if (line.match(/^[0-9a-f]{40}/)) {
        currentBlame.commit = line.split(" ")[0];
      }
    }

    return blameInfos;
  },
  async executeGitBlame(filePath: string): Promise<string> {
    const [output, err] = await CommandService.execute(
      "git",
      ["blame", "--line-porcelain", filePath],
      repoPath
    );

    if (err !== null) throw new Error(err);
    return output.stdout;
  },

  async getDiff(filePath: string): Promise<string> {
    const [output, err] = await GitService.execGit([
      "diff",
      "--unified=0",
      "--",
      filePath,
    ]);
    if (err !== null) throw new Error(err);
    return output.stdout;
  },
  async analyzeChanges(filePath: string): Promise<string> {
    try {
      // First check if file is deleted or new, as these don't need blame analysis
      // Use git status to check file state
      const normalizedPath = path.normalize(filePath.replace(/^\/+/, ""));

      if (await GitService.isFileDeleted(normalizedPath)) {
        return `Deleted file: ${normalizedPath}`;
      }

      if (await GitService.isNewFile(normalizedPath)) {
        return `New file: ${normalizedPath}`;
      }

      // For existing files, we need to get blame info
      const blame = await GitBlameAnalyzer.getGitBlame(normalizedPath);

      const diff = await GitBlameAnalyzer.getDiff(normalizedPath);

      const changedLines = GitBlameAnalyzer.parseChangedLines(diff);
      const authorChanges = GitBlameAnalyzer.analyzeBlameInfo(
        blame,
        changedLines
      );
      return GitBlameAnalyzer.formatAnalysis(authorChanges);
    } catch (error) {
      void logError("Error analyzing changes:", error as Error);
      throw error;
    }
  },

  parseChangedLines(diff: string): Set<number> {
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
  },

  analyzeBlameInfo(
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
  },

  formatAnalysis(
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
  },
  async getBlameInfo(filePath: string): Promise<BlameInfo[]> {
    try {
      if (!(await GitService.hasHead())) {
        throw new Error(errorMessages.noCommitsYet);
      }

      if (await GitService.isNewFile(filePath)) {
        throw new Error(errorMessages.fileNotCommitted);
      }

      if (await GitService.isFileDeleted(filePath)) {
        throw new Error(errorMessages.fileDeleted);
      }

      const blameOutput = await GitBlameAnalyzer.executeGitBlame(filePath);
      return GitBlameAnalyzer.parseBlameOutput(blameOutput);
    } catch (error) {
      void logError("Error getting blame info:", error as Error);
      throw error;
    }
  },
};

export default GitBlameAnalyzer;
