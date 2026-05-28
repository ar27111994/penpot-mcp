import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const markdownFiles = [
  "penpot-mcp/SKILL.md",
  "penpot-mcp/references/penpot-api-patterns.md",
  "penpot-mcp/references/design-system-workflows.md",
  "penpot-mcp/references/design-to-code-workflows.md",
  "penpot-mcp/references/prototyping-workflows.md",
];
const failures = [];

/** Records a snippet validation failure. */
function fail(message) {
  failures.push(message);
}

/** Reads a UTF-8 file from a repository-relative path. */
function readRepositoryFile(filePath) {
  return readFileSync(join(repositoryRoot, filePath), "utf8");
}

/** Extracts fenced JavaScript code blocks with starting line numbers. */
function collectJavaScriptBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split(/\r?\n/);
  let activeBlock = null;

  lines.forEach((line, index) => {
    const fenceMatch = line.match(/^```(\S*)?\s*$/);
    if (!fenceMatch) {
      if (activeBlock) activeBlock.lines.push(line);
      return;
    }

    if (!activeBlock) {
      const language = (fenceMatch[1] || "").toLowerCase();
      if (["js", "javascript"].includes(language)) {
        activeBlock = { startLine: index + 1, lines: [] };
      }
      return;
    }

    blocks.push({
      startLine: activeBlock.startLine,
      code: activeBlock.lines.join("\n"),
    });
    activeBlock = null;
  });

  return blocks;
}

/** Removes comments to reduce false positives in executable checks. */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/g, ""))
    .join("\n");
}

/** Returns snippet lines that are not explicitly marked as bad examples. */
function executableExampleLines(block) {
  return block.code
    .split(/\r?\n/)
    .filter((line) => !line.includes("❌"))
    .map((line) => line.replace(/\/\/.*$/g, ""));
}

/** Finds variables assigned from penpot.createText(...). */
function collectCreatedTextVariables(code) {
  const textVariables = [];
  const createTextPattern =
    /(?:const|let|var)\s+(\w+)\s*=\s*penpot\.createText\s*\(/g;

  for (const match of code.matchAll(createTextPattern)) {
    textVariables.push(match[1]);
  }

  return textVariables;
}

/** Validates one JavaScript snippet for known Penpot API anti-patterns. */
function validateSnippet(filePath, block) {
  const executableCode = stripComments(
    executableExampleLines(block).join("\n"),
  );
  const location = `${filePath}:${block.startLine}`;

  if (
    /\b\w+\.width\s*=/.test(executableCode) ||
    /\b\w+\.height\s*=/.test(executableCode)
  ) {
    fail(`${location} assigns width/height directly; use resize(w, h)`);
  }

  if (/\b\w+\.fillColor\s*=/.test(executableCode)) {
    fail(`${location} assigns fillColor directly; library colors use .color`);
  }

  const textVariables = collectCreatedTextVariables(executableCode);
  for (const variableName of textVariables) {
    const nullGuardPattern = new RegExp(`if\\s*\\(\\s*!${variableName}\\s*\\)`);
    if (!nullGuardPattern.test(executableCode)) {
      fail(`${location} calls penpot.createText(...) without a null guard`);
    }

    const textResizePattern = new RegExp(`\\b${variableName}\\.resize\\s*\\(`);
    const growTypePattern = new RegExp(`\\b${variableName}\\.growType\\s*=`);
    if (
      textResizePattern.test(executableCode) &&
      !growTypePattern.test(executableCode)
    ) {
      fail(`${location} resizes ${variableName} without resetting growType`);
    }
  }
}

for (const filePath of markdownFiles) {
  const markdown = readRepositoryFile(filePath);
  for (const block of collectJavaScriptBlocks(markdown)) {
    validateSnippet(filePath, block);
  }
}

if (failures.length > 0) {
  console.error("Snippet validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Snippet validation passed");
