import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const requiredReferenceFiles = [
  "penpot-mcp/references/penpot-api-patterns.md",
  "penpot-mcp/references/design-system-workflows.md",
  "penpot-mcp/references/design-to-code-workflows.md",
  "penpot-mcp/references/prototyping-workflows.md",
];

const skippedDirectories = new Set([".git", "node_modules"]);
const textFileExtensions = new Set([".json", ".md", ".mjs", ".yml", ".yaml"]);

/** Records a validation failure without stopping later checks. */
function fail(message) {
  failures.push(message);
}

/** Resolves a repository-relative path to an absolute path. */
function repositoryPath(filePath) {
  return join(repositoryRoot, filePath);
}

/** Reads a UTF-8 file from a repository-relative path. */
function readRepositoryFile(filePath) {
  return readFileSync(repositoryPath(filePath), "utf8");
}

/** Removes one pair of surrounding quotes from a YAML scalar value. */
function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

/** Extracts a simple or folded scalar from the SKILL.md frontmatter. */
function readFrontmatterValue(frontmatter, key) {
  const lines = frontmatter.split(/\r?\n/);
  const keyPattern = new RegExp(`^${key}:\\s*(.*)$`);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const match = lines[lineIndex].match(keyPattern);
    if (!match) continue;

    const value = match[1].trim();
    if (value !== ">" && value !== "|") {
      return stripQuotes(value.trim());
    }

    const foldedLines = [];
    for (
      let nextIndex = lineIndex + 1;
      nextIndex < lines.length;
      nextIndex += 1
    ) {
      const nextLine = lines[nextIndex];
      if (/^[A-Za-z0-9_-]+:\s*/.test(nextLine)) break;
      if (nextLine.trim().length > 0) foldedLines.push(nextLine.trim());
    }

    return foldedLines.join(" ").trim();
  }

  return "";
}

/** Validates root package metadata needed for publishing and discovery. */
function validatePackageJson() {
  let packageJson;
  try {
    packageJson = JSON.parse(readRepositoryFile("package.json"));
  } catch (error) {
    fail(`package.json is not valid JSON: ${error.message}`);
    return null;
  }

  if (packageJson.name !== "penpot-mcp") {
    fail("package.json name must be penpot-mcp");
  }

  if (
    !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(packageJson.version || "")
  ) {
    fail("package.json version must be valid semver");
  }

  if (!packageJson.description || typeof packageJson.description !== "string") {
    fail("package.json description is required");
  }

  if (packageJson.license !== "MIT") {
    fail("package.json license must be MIT");
  }

  return packageJson;
}

/** Reads a hardcoded shields.io version badge from README content, if present. */
function readHardcodedReadmeBadgeVersion(readme) {
  const badgePrefix = "https://img.shields.io/badge/version-";
  const badgeSuffix = "-blue.svg";

  for (const line of readme.split(/\r?\n/)) {
    const startIndex = line.indexOf(badgePrefix);
    if (startIndex === -1) continue;

    const versionStartIndex = startIndex + badgePrefix.length;
    const versionEndIndex = line.indexOf(badgeSuffix, versionStartIndex);
    if (versionEndIndex === -1) continue;

    return line.slice(versionStartIndex, versionEndIndex);
  }

  return null;
}

/** Ensures the README version badge cannot drift from package.json. */
function validateReadmeVersionBadge(packageJson) {
  const readme = readRepositoryFile("README.md");
  const dynamicBadgeUrl =
    "https://img.shields.io/github/package-json/v/ar27111994/penpot-mcp";
  const hasDynamicBadge = readme
    .split(/\r?\n/)
    .some((line) => line.includes(dynamicBadgeUrl));

  if (hasDynamicBadge) return;

  const hardcodedBadgeVersion = readHardcodedReadmeBadgeVersion(readme);
  if (!hardcodedBadgeVersion) {
    fail(
      "README.md must include a version badge backed by package.json or matching package.json version",
    );
    return;
  }

  if (hardcodedBadgeVersion !== packageJson.version) {
    fail(
      `README.md version badge ${hardcodedBadgeVersion} does not match package.json ${packageJson.version}`,
    );
  }
}

/** Validates the skill discovery frontmatter required by agent clients. */
function validateSkillFrontmatter() {
  const skill = readRepositoryFile("penpot-mcp/SKILL.md");
  const frontmatterMatch = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!frontmatterMatch) {
    fail("penpot-mcp/SKILL.md must start with YAML frontmatter");
    return;
  }

  const frontmatter = frontmatterMatch[1];
  const name = readFrontmatterValue(frontmatter, "name");
  const description = readFrontmatterValue(frontmatter, "description");

  if (name !== "penpot-mcp") {
    fail("penpot-mcp/SKILL.md frontmatter name must be penpot-mcp");
  }

  if (!description) {
    fail("penpot-mcp/SKILL.md frontmatter description is required");
  }
}

/** Ensures all reference files advertised by the package exist. */
function validateRequiredReferences() {
  for (const filePath of requiredReferenceFiles) {
    if (!existsSync(repositoryPath(filePath))) {
      fail(`Required reference file is missing: ${filePath}`);
    }
  }
}

/** Splits a Markdown table row while ignoring pipes inside inline code. */
function splitMarkdownTableRow(line) {
  const cells = [];
  let currentCell = "";
  let codeTickCount = 0;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === "\\" && index + 1 < line.length) {
      currentCell += character + line[index + 1];
      index += 1;
      continue;
    }

    if (character === "`") {
      let nextIndex = index;
      while (line[nextIndex] === "`") nextIndex += 1;
      const tickRun = nextIndex - index;
      currentCell += "`".repeat(tickRun);

      if (codeTickCount === 0) {
        codeTickCount = tickRun;
      } else if (codeTickCount === tickRun) {
        codeTickCount = 0;
      }

      index = nextIndex - 1;
      continue;
    }

    if (character === "|" && codeTickCount === 0) {
      cells.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  cells.push(currentCell.trim());

  if (line.trimStart().startsWith("|")) cells.shift();
  if (line.trimEnd().endsWith("|")) cells.pop();

  return cells;
}

/** Validates one contiguous Markdown table block for stable column counts. */
function validateMarkdownTableBlock(filePath, rows) {
  if (rows.length < 2) return;

  const expectedColumnCount = splitMarkdownTableRow(rows[0].line).length;
  for (const row of rows) {
    const columnCount = splitMarkdownTableRow(row.line).length;
    if (columnCount !== expectedColumnCount) {
      fail(
        `${filePath}:${row.lineNumber} has ${columnCount} table columns; expected ${expectedColumnCount}`,
      );
    }
  }
}

/** Validates Markdown tables while ignoring fenced code blocks. */
function validateMarkdownTables(filePath) {
  const lines = readRepositoryFile(filePath).split(/\r?\n/);
  let activeFence = null;
  let tableRows = [];

  /** Flushes the current candidate table block into the table validator. */
  function flushTableRows() {
    validateMarkdownTableBlock(filePath, tableRows);
    tableRows = [];
  }

  lines.forEach((line, index) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

    if (fenceMatch) {
      const fenceMarker = fenceMatch[1];
      const fenceCharacter = fenceMarker[0];

      if (!activeFence) {
        flushTableRows();
        activeFence = { character: fenceCharacter, length: fenceMarker.length };
        return;
      }

      if (
        activeFence.character === fenceCharacter &&
        fenceMarker.length >= activeFence.length
      ) {
        activeFence = null;
      }

      return;
    }

    if (!activeFence && line.trim().startsWith("|") && line.includes("|")) {
      tableRows.push({ line, lineNumber: index + 1 });
      return;
    }

    flushTableRows();
  });

  flushTableRows();
}

/** Collects repository text files that should be covered by validation. */
function collectTextFiles(directoryPath = repositoryRoot) {
  const files = [];

  for (const entry of readdirSync(directoryPath)) {
    if (skippedDirectories.has(entry)) continue;

    const entryPath = join(directoryPath, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      files.push(...collectTextFiles(entryPath));
      continue;
    }

    const extension = entry.slice(entry.lastIndexOf("."));
    if (textFileExtensions.has(extension)) {
      files.push(relative(repositoryRoot, entryPath).replace(/\\/g, "/"));
    }
  }

  return files;
}

/** Fails when a text file contains trailing spaces or tabs. */
function validateTrailingWhitespace(filePath) {
  const lines = readRepositoryFile(filePath).split(/\r?\n/);

  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) {
      fail(`${filePath}:${index + 1} has trailing whitespace`);
    }
  });
}

const packageJson = validatePackageJson();
if (packageJson) validateReadmeVersionBadge(packageJson);
validateSkillFrontmatter();
validateRequiredReferences();

for (const filePath of collectTextFiles()) {
  validateTrailingWhitespace(filePath);
  if (filePath.endsWith(".md")) validateMarkdownTables(filePath);
}

if (failures.length > 0) {
  console.error("Validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Package validation passed");
