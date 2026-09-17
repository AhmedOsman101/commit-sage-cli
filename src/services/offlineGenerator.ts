// Copyright (C) 2025 Ahmad Osman
// Licensed under the GNU General Public License v3.0. See LICENSE for details.

/**
 * Offline static-analysis commit message generator.
 *
 * Ported from `auto-commit-msg`'s deterministic generator. Pure function — no
 * git, no IO, no env. The CLI wires up the `diff-index` source upstream; this
 * service only knows how to turn `FileChange[]` into a Conventional Commit
 * shaped message.
 */

// ─── Types (private to this service) ────────────────────────────────────────

/**
 * Mirrors `git diff-index --name-status` parsed output.
 *
 * `action` is the single-letter git status code (M/A/D/R/C); for renames the
 * percent-similarity suffix is stripped. `fromPath` is the old path; `toPath`
 * is empty unless this is a rename/copy.
 */
type FileChange = {
  action: string;
  /** Always " " for diff-index rows (kept for parity with upstream type). */
  status: string;
  fromPath: string;
  toPath: string;
};

// ─── Constants (copied wholesale from auto-commit-msg) ──────────────────────

/** When change count reaches this size, switch to count format and drop prefix. */
const AGGREGATE_MIN = 5;

/** Human-friendly token for the repo root, used in `move and rename X to Y at <ROOT>`. */
const ROOT = "repo root";

/** Human-friendly verb for each git status code. */
const ACTION_VERB: Record<string, string> = {
  M: "update",
  A: "create",
  D: "delete",
  R: "rename",
  C: "copy",
};

/** Conventional Commit prefix enum (port from auto-commit-msg). */
const CONVENTIONAL_TYPE = {
  BUILD: "build",
  BUILD_DEPENDENCIES: "build(deps)",
  CI: "ci",
  CHORE: "chore",
  DOCS: "docs",
  FEAT: "feat",
  FIX: "fix",
  PERF: "perf",
  REFACTOR: "refactor",
  REVERT: "revert",
  STYLE: "style",
  TEST: "test",
  UNKNOWN: "",
} as const;

type ConventionalType =
  (typeof CONVENTIONAL_TYPE)[keyof typeof CONVENTIONAL_TYPE];

// Classification constants (wholesale from auto-commit-msg).
const CI_DIRS = [".circleci", ".github/workflows"];
const CI_NAMES = [
  "netlify.toml",
  "travis.yml",
  "tox.ini",
  ".vscodeignore",
  "codecov.yml",
  ".codecov.yml",
  ".codeclimate.yml",
  "now.json",
  ".nowignore",
  "vercel.json",
  ".vercelignore",
  "Procfile",
];

const PACKAGE_NAMES = [
  "requirements.txt",
  "requirements-dev.txt",
  "dev-requirements.txt",
  "requirements-test.txt",
  "test-requirements.txt",
  "Pipfile",
  "Pipefile.lock",
  "poetry.toml",
  "poetry.lock",
  "pyproject.toml",
  "setup.py",
  "setup.cfg",
  "Gemfile",
  "Gemfile.lock",
  "package-lock.json",
  "shrinkwrap.json",
  "yarn.lock",
  "composer.json",
  "composer.lock",
  "go.mod",
  "go.sum",
  "Cargo.toml",
  "Cargo.lock",
  "deps.ts",
  "test_deps.ts",
  "dev_deps.ts",
  "import_map.json",
  "version.txt",
];

const BUILD_NAMES = [
  ".dockerignore",
  "Dockerfile",
  "docker-compose.yml",
  "GNUmakefile",
  "makefile",
  "Makefile",
  "rakefile",
  "Rakefile",
  "rakefile.rb",
  "Rakefile.rb",
  "package.json",
  "gradlew",
  "grailsw",
  "micronaut-cli.yml",
];
const BUILD_EXTENSIONS = [".gemspec", ".bat", ".gradle"];

const CONFIG_EXTENSIONS = [
  ".yml",
  ".yaml",
  ".json",
  ".toml",
  ".ini",
  ".cfg",
  ".config.js",
];
const CONFIG_DIRS = [".vscode"];
const CONFIG_NAMES = [
  ".gitignore",
  ".editorconfig",
  ".pylintrc",
  ".isort.cfg",
  ".flake8",
  "pytest.ini",
  ".coveragerc",
  ".pylintrc",
  ".npmignore",
  ".npmrc",
  ".babelrc",
  ".eslintrc",
  ".browserslistrc",
  "browserslist",
  "rollup.config.js",
  "webpack.config.js",
  "npm-shrinkwrap.json",
  "tsconfig.json",
  "tslint.json",
  ".env",
  ".env.dev",
  ".env.prod",
  ".env.tempate",
];

const LICENSE_NAMES = [
  "LICENSE",
  "LICENSE.txt",
  "License.txt",
  "LICENSE-source",
];

const DOC_NAMES = [
  "readme",
  "readme.md",
  "readme.txt",
  "installation.md",
  "usage.md",
  "development.md",
  "deploy.md",
  "security.md",
  "contributing.md",
  "changelog.md",
  "releases.md",
  "funding.md",
  "pull_request_template.md",
  "issue_template.md",
  "code_of_conduct.md",
  "maintainers.txt",
  "codeowners",
  "sample.png",
  "sample-1.png",
  "sample-2.png",
  "screenshot.png",
  "preview.png",
];

const TEST_DIRS = ["test", "tests", "spec", "unit", "unit_tests", "__mocks__"];

// ─── Path helpers (port from auto-commit-msg/src/lib/paths.ts) ──────────────

interface SplitPathResult {
  atRoot: boolean;
  dirPath: string;
  name: string;
  extension: string;
}

function splitPath(filePath: string): SplitPathResult {
  const lastSlash = filePath.lastIndexOf("/");
  const dir = lastSlash === -1 ? "." : filePath.slice(0, lastSlash);
  const isAtRepoRoot = dir === ".";
  const name = lastSlash === -1 ? filePath : filePath.slice(lastSlash + 1);
  const dotIdx = name.lastIndexOf(".");
  const extension = dotIdx > 0 ? name.slice(dotIdx) : "";
  return {
    atRoot: isAtRepoRoot,
    dirPath: isAtRepoRoot ? ROOT : dir,
    name,
    extension,
  };
}

function quoteForSpaces(value: string): string {
  if (value.includes(" ") && value !== ROOT) {
    return `'${value}'`;
  }
  return value;
}

const REPEAT_FILENAMES = ["readme", "index", "__init__.py"];

function friendlyFile(filePath: string): string {
  const { name } = splitPath(filePath);
  const nameLower = name.toLowerCase();
  for (const p of REPEAT_FILENAMES) {
    if (nameLower.startsWith(p)) {
      return quoteForSpaces(filePath);
    }
  }
  return quoteForSpaces(name);
}

function joinAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  const head = items.slice(0, -1).join(", ");
  return `${head} and ${items.at(-1)}`;
}

function humanList(paths: string[]): string {
  if (paths.length === 0) {
    throw new Error("Expected at least one path, got zero");
  }
  const formatted = paths.map(p => friendlyFile(p));
  if (formatted.length === 1) return formatted[0];
  return joinAnd(formatted);
}

function moveOrRenameFromPaths(
  oldP: SplitPathResult,
  newP: SplitPathResult
): "move" | "rename" | "move and rename" {
  if (oldP.name === newP.name) return "move";
  if (oldP.dirPath === newP.dirPath) return "rename";
  return "move and rename";
}

// ─── Parsing (port from auto-commit-msg/src/git/parseOutput.ts) ─────────────

/**
 * Parse a single line of `git diff-index --name-status` output into a
 * `FileChange`. Throws on malformed input (mirrors upstream).
 */
function parseDiffIndex(line: string): FileChange {
  if (line.length < 4) {
    throw new Error(
      `Invalid input. Input string must be at least 4 characters. Got: '${line}'`
    );
  }
  const action = line[0];
  const status = " ";
  const [_, fromPath, toPath] = line.split("\t");
  if (!fromPath) {
    throw new Error(`Invalid input - could not find 'from' path: ${line}`);
  }
  return {
    action,
    status,
    fromPath,
    toPath: toPath ?? "",
  };
}

// ─── Type classification (port from auto-commit-msg/src/generate/convCommit.ts) ─

function isCI(dirPath: string, name: string): boolean {
  return CI_DIRS.includes(dirPath) || CI_NAMES.includes(name);
}

function isPackage(name: string): boolean {
  return PACKAGE_NAMES.includes(name);
}

function isBuild(name: string, extension: string): boolean {
  return BUILD_NAMES.includes(name) || BUILD_EXTENSIONS.includes(extension);
}

function isConfig(name: string, dirPath: string, extension: string): boolean {
  return (
    CONFIG_EXTENSIONS.includes(extension) ||
    CONFIG_DIRS.includes(dirPath) ||
    CONFIG_NAMES.includes(name) ||
    name.includes(".eslintrc") ||
    name.includes(".eslintignore") ||
    name.includes(".eslintcache") ||
    name.includes(".prettier") ||
    name.includes("tslint") ||
    name.includes("webpack")
  );
}

function isLicense(name: string): boolean {
  return LICENSE_NAMES.includes(name);
}

function isDocs(name: string, extension: string, dirPath: string): boolean {
  if (extension === ".rst") return true;
  const lowerName = name.toLowerCase();
  if (DOC_NAMES.includes(lowerName)) return true;
  if (dirPath.startsWith("docs")) return true;
  return false;
}

function isTest(dirPath: string, name: string): boolean {
  const segments = dirPath.split("/");
  if (segments.some(seg => TEST_DIRS.includes(seg))) return true;
  if (name === ".coveragerc") return true;
  if (/^test_.*\.[^.]+$/.test(name)) return true;
  if (/^spec_.*\.[^.]+$/.test(name)) return true;
  if (/^.*\.test\.[^.]+$/.test(name)) return true;
  if (/^.*\.spec\.[^.]+$/.test(name)) return true;
  return false;
}

function classifyPath(filePath: string): ConventionalType {
  const { dirPath, name, extension } = splitPath(filePath);
  if (isCI(dirPath, name)) return CONVENTIONAL_TYPE.CI;
  if (isPackage(name)) return CONVENTIONAL_TYPE.BUILD_DEPENDENCIES;
  if (isBuild(name, extension)) return CONVENTIONAL_TYPE.BUILD;
  if (isLicense(name) || isConfig(name, dirPath, extension)) {
    return CONVENTIONAL_TYPE.CHORE;
  }
  if (isDocs(name, extension, dirPath)) return CONVENTIONAL_TYPE.DOCS;
  if (isTest(dirPath, name)) return CONVENTIONAL_TYPE.TEST;
  return CONVENTIONAL_TYPE.UNKNOWN;
}

function lookupAction(actionChar: string): string {
  const verb = ACTION_VERB[actionChar];
  if (verb === undefined) {
    throw new Error(`Unknown ACTION key: ${actionChar}`);
  }
  return verb;
}

function getConventionType(
  actionChar: string,
  filePath: string
): ConventionalType {
  if (actionChar === "R" || actionChar === "D") {
    return CONVENTIONAL_TYPE.CHORE;
  }
  const commitType = classifyPath(filePath);
  if (actionChar === "A") {
    return commitType || CONVENTIONAL_TYPE.FEAT;
  }
  return commitType;
}

// ─── Collapse (multiple → single prefix) ────────────────────────────────────

function allEqual(arr: string[]): boolean {
  return arr.every(v => v === arr[0]);
}

function collapse(types: ConventionalType[]): ConventionalType {
  if (types.length === 0) return CONVENTIONAL_TYPE.UNKNOWN;
  if (allEqual(types)) return types[0];
  if (types.includes(CONVENTIONAL_TYPE.BUILD_DEPENDENCIES)) {
    return CONVENTIONAL_TYPE.BUILD_DEPENDENCIES;
  }
  return CONVENTIONAL_TYPE.UNKNOWN;
}

// ─── Descriptions (port from message.ts / count.ts / action.ts) ─────────────

/** `move X to Y` / `rename X to Y` / `move and rename X to Y`. */
function moveOrRenameMsg(oldPath: string, newPath: string): string {
  const oldP = splitPath(oldPath);
  const newP = splitPath(newPath);
  const moveDesc = moveOrRenameFromPaths(oldP, newP);
  const from = quoteForSpaces(oldP.name);
  if (moveDesc === "move") {
    const to = quoteForSpaces(newP.dirPath);
    return `move ${from} to ${to}`;
  }
  if (moveDesc === "rename") {
    const to = quoteForSpaces(newP.name);
    return `rename ${from} to ${to}`;
  }
  const to = quoteForSpaces(newP.name);
  const target =
    newP.dirPath === ROOT ? `${to} at ${ROOT}` : quoteForSpaces(newPath);
  return `move and rename ${from} to ${target}`;
}

function oneChangeDescription(change: FileChange): string {
  if (change.action === "R") {
    return moveOrRenameMsg(change.fromPath, change.toPath);
  }
  const verb = lookupAction(change.action);
  return `${verb} ${friendlyFile(change.fromPath)}`;
}

function pluralS(n: number): string {
  return n === 1 ? "" : "s";
}

function formatOne(action: string, count: number): string {
  return `${action} ${count} file${pluralS(count)}`;
}

function countDescription(changes: FileChange[]): string {
  const counts: Record<string, number> = {};
  for (const change of changes) {
    const verb = lookupAction(change.action);
    counts[verb] = (counts[verb] ?? 0) + 1;
  }
  const parts = Object.entries(counts).map(([action, n]) =>
    formatOne(action, n)
  );
  return joinAnd(parts);
}

function namedDescription(changes: FileChange[]): string {
  const actions = changes.map(c => c.action);
  const singleAction = allEqual(actions) ? lookupAction(actions[0]) : null;
  const paths = changes.map(c => c.fromPath);
  const list = humanList(paths);
  if (singleAction === null) {
    return countDescription(changes);
  }
  return `${singleAction} ${list}`;
}

interface ConvCommitMsg {
  typePrefix: ConventionalType;
  description: string;
}

function msgFromChanges(changes: FileChange[]): ConvCommitMsg {
  if (changes.length === 1) {
    const change = changes[0];
    // For renames the meaningful path is the new one; upstream uses `from` as a
    // single-arg fallback because diff-index collapses moves to a single R row
    // where `from` is the old path. We pass `to` (new path) so classification
    // is correct.
    const pathForType = change.toPath || change.fromPath;
    return {
      typePrefix: getConventionType(change.action, pathForType),
      description: oneChangeDescription(change),
    };
  }
  if (changes.length < AGGREGATE_MIN) {
    const types = changes.map(c =>
      getConventionType(c.action, c.toPath || c.fromPath)
    );
    return {
      typePrefix: collapse(types),
      description: namedDescription(changes),
    };
  }
  // AGGREGATE_MIN or more — count format, never prefix.
  return {
    typePrefix: CONVENTIONAL_TYPE.UNKNOWN,
    description: countDescription(changes),
  };
}

function formatMsg(msg: ConvCommitMsg): string {
  if (msg.typePrefix === CONVENTIONAL_TYPE.UNKNOWN) return msg.description;
  return `${msg.typePrefix}: ${msg.description}`;
}

// ─── Truncation (NOT in auto-commit-msg — adapter addition) ─────────────────

function truncateSubject(subject: string, maxLength: number): string {
  if (maxLength <= 0) return subject;
  if (subject.length <= maxLength) return subject;
  const slice = subject.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

type OfflineOptions = { maxLength: number };

/**
 * Pure: turn `FileChange[]` rows (parsed `git diff-index --name-status`) into
 * a Conventional Commit-shaped message. No IO. Caller is responsible for the
 * git invocation + parsing upstream.
 */
function generateOfflineMessage(
  changes: FileChange[],
  options: OfflineOptions
): string {
  if (changes.length === 0) return "";
  const { typePrefix, description } = msgFromChanges(changes);
  const subject = formatMsg({ typePrefix, description });
  return truncateSubject(subject, options.maxLength);
}

export type { FileChange, OfflineOptions };
export { generateOfflineMessage, parseDiffIndex };
