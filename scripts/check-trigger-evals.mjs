import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function readRepositoryFile(filePath) {
  return readFileSync(join(repositoryRoot, filePath), "utf8");
}

function readJson(filePath) {
  try {
    return JSON.parse(readRepositoryFile(filePath));
  } catch (error) {
    fail(`${filePath} is not valid JSON: ${error.message}`);
    return null;
  }
}

function collectFrontmatterDescription(skill) {
  const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return "";

  const lines = match[1].split(/\r?\n/);
  const descriptionLines = [];
  let inDescription = false;

  for (const line of lines) {
    if (line.startsWith("description:")) {
      inDescription = true;
      const inlineValue = line.slice("description:".length).trim();
      if (inlineValue && inlineValue !== ">" && inlineValue !== "|") {
        descriptionLines.push(inlineValue);
      }
      continue;
    }

    if (inDescription && /^[A-Za-z0-9_-]+:\s*/.test(line)) break;
    if (inDescription && line.trim()) descriptionLines.push(line.trim());
  }

  return descriptionLines.join(" ").toLowerCase();
}

function validateTriggerEvals() {
  const evals = readJson("evals/trigger-tests.json");
  if (!evals) return;

  for (const section of ["positive", "negative"]) {
    if (!Array.isArray(evals[section]) || evals[section].length === 0) {
      fail(
        `evals/trigger-tests.json must include a non-empty ${section} array`,
      );
    }
  }

  const description = collectFrontmatterDescription(
    readRepositoryFile("penpot-mcp/SKILL.md"),
  );

  if (description.includes("any mention of penpot")) {
    fail(
      "SKILL.md trigger description is too broad: contains 'any mention of Penpot'",
    );
  }

  if (
    !description.includes("ai agent") ||
    !description.includes("penpot mcp")
  ) {
    fail("SKILL.md trigger description must mention AI-agent Penpot MCP usage");
  }

  const negativePrompts = evals.negative.join("\n").toLowerCase();
  if (!negativePrompts.includes("what is penpot")) {
    fail("Trigger evals must include a negative informational Penpot prompt");
  }
}

validateTriggerEvals();

if (failures.length > 0) {
  console.error("Trigger eval validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Trigger eval validation passed");
