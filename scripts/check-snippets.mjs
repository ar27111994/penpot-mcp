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

/** Reads a UTF-8 Markdown file from a repository-relative path. */
function readRepositoryFile(filePath) {
  try {
    return readFileSync(join(repositoryRoot, filePath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      fail(`Missing markdown file: ${filePath}`);
    } else {
      fail(`Could not read markdown file ${filePath}: ${error.message}`);
    }

    return null;
  }
}

/** Escapes user-provided text for literal use inside a RegExp. */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

/** Removes a line comment while preserving // inside strings such as URLs. */
function stripLineComment(line) {
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length - 1; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (quote && character === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (character === quote) quote = null;
      continue;
    }

    if (["'", '"', "`"].includes(character)) {
      quote = character;
      continue;
    }

    if (character === "/" && nextCharacter === "/") {
      return line.slice(0, index);
    }
  }

  return line;
}

/** Removes comments to reduce false positives in executable checks. */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map(stripLineComment)
    .join("\n");
}

/** Returns snippet lines that are not explicitly marked as bad examples. */
function executableExampleLines(block) {
  return block.code.split(/\r?\n/).filter((line) => !line.includes("❌"));
}

/** Finds variables assigned from penpot.createText(...). */
function collectCreatedTextVariables(code) {
  const textVariables = [];
  const createTextPattern =
    /(?:const|let|var)\s+(\w+)\s*=\s*penpot\.createText\s*\(/g;

  for (const match of code.matchAll(createTextPattern)) {
    textVariables.push({
      name: match[1],
      declarationIndex: match.index,
      afterDeclarationIndex: match.index + match[0].length,
    });
  }

  return textVariables;
}

/** Finds the first match index for a pattern at or after startIndex. */
function findMatchIndex(code, pattern, startIndex = 0) {
  const match = pattern.exec(code.slice(startIndex));
  return match ? startIndex + match.index : -1;
}

/** Finds the first recognized null guard for a variable after declaration. */
function findNullGuardIndex(code, variableName, startIndex) {
  const escapedName = escapeRegExp(variableName);
  const guardPatterns = [
    new RegExp(`if\\s*\\(\\s*!${escapedName}\\s*\\)`),
    new RegExp(
      `if\\s*\\(\\s*${escapedName}\\s*(?:==|===)\\s*(?:null|undefined)\\s*\\)`,
    ),
    new RegExp(
      `if\\s*\\(\\s*(?:null|undefined)\\s*(?:==|===)\\s*${escapedName}\\s*\\)`,
    ),
  ];

  const guardIndexes = guardPatterns
    .map((pattern) => findMatchIndex(code, pattern, startIndex))
    .filter((index) => index !== -1);

  return guardIndexes.length === 0 ? -1 : Math.min(...guardIndexes);
}

/** Validates one JavaScript snippet for known Penpot API anti-patterns. */
function validateSnippet(filePath, block) {
  const executableCode = stripComments(
    executableExampleLines(block).join("\n"),
  );
  const location = `${filePath}:${block.startLine}`;

  if (
    /\b\w+\.width\s*=(?!=)/.test(executableCode) ||
    /\b\w+\.height\s*=(?!=)/.test(executableCode)
  ) {
    fail(`${location} assigns width/height directly; use resize(w, h)`);
  }

  if (
    /\b\w+\.parentX\s*=(?!=)/.test(executableCode) ||
    /\b\w+\.parentY\s*=(?!=)/.test(executableCode)
  ) {
    fail(
      `${location} assigns parentX/parentY directly; use penpotUtils.setParentXY(shape, x, y)`,
    );
  }

  if (/\b\w+\.fillColor\s*=(?!=)/.test(executableCode)) {
    fail(`${location} assigns fillColor directly; library colors use .color`);
  }

  const textVariables = collectCreatedTextVariables(executableCode);
  for (const textVariable of textVariables) {
    const variableName = textVariable.name;
    const escapedName = escapeRegExp(variableName);
    const firstUseIndex = findMatchIndex(
      executableCode,
      new RegExp(`\\b${escapedName}\\s*\\.`),
      textVariable.afterDeclarationIndex,
    );
    const nullGuardIndex = findNullGuardIndex(
      executableCode,
      variableName,
      textVariable.afterDeclarationIndex,
    );

    if (nullGuardIndex === -1) {
      fail(`${location} calls penpot.createText(...) without a null guard`);
    } else if (firstUseIndex !== -1 && nullGuardIndex > firstUseIndex) {
      fail(`${location} uses ${variableName} before its null guard`);
    }

    const textResizeIndex = findMatchIndex(
      executableCode,
      new RegExp(`\\b${escapedName}\\.resize\\s*\\(`),
      textVariable.afterDeclarationIndex,
    );
    if (textResizeIndex === -1) continue;

    const growTypeIndex = findMatchIndex(
      executableCode,
      new RegExp(`\\b${escapedName}\\.growType\\s*=`),
      textResizeIndex,
    );
    if (growTypeIndex === -1) {
      fail(`${location} resizes ${variableName} without resetting growType`);
    }
  }
}

for (const filePath of markdownFiles) {
  const markdown = readRepositoryFile(filePath);
  if (markdown === null) continue;

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
