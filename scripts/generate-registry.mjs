#!/usr/bin/env node

// Auto-generates registry.json from bundle manifest files.
//
// Run: node scripts/generate-registry.mjs
//
// Reads every bundles/{id}/manifest.json and produces registry.json
// at the repo root. Contributors only need to edit their manifest —
// this script handles the rest.

import { readdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLES_DIR = join(ROOT, "bundles");
const REGISTRY_PATH = join(ROOT, "registry.json");

async function main() {
  const entries = await readdir(BUNDLES_DIR, { withFileTypes: true });
  const bundles = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const manifestPath = join(BUNDLES_DIR, entry.name, "manifest.json");
    let raw;
    try {
      raw = await readFile(manifestPath, "utf8");
    } catch {
      console.warn(`Skipping ${entry.name}: no manifest.json`);
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(raw);
    } catch {
      console.warn(`Skipping ${entry.name}: invalid JSON`);
      continue;
    }

    bundles.push({
      bundleId: manifest.bundleId,
      name: manifest.name,
      description: manifest.description ?? "",
      version: manifest.version,
      author: manifest.createdBy ?? "community",
      tags: extractTags(manifest),
      minPaprworkVersion: manifest.minPaprworkVersion,
      path: `bundles/${entry.name}`,
      ...(manifest.icon ? { icon: manifest.icon } : {}),
      requirements: manifest.requirements ?? [],
    });
  }

  bundles.sort((a, b) => a.name.localeCompare(b.name));

  const registry = {
    schemaVersion: "1.0.0",
    bundles,
  };

  await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2) + "\n", "utf8");
  console.log(`Generated registry.json with ${bundles.length} bundle(s)`);
}

function extractTags(manifest) {
  const tags = new Set();

  const desc = (manifest.description ?? "").toLowerCase();
  const name = (manifest.name ?? "").toLowerCase();
  const text = `${name} ${desc}`;

  const tagKeywords = {
    finance: ["expense", "budget", "money", "finance", "payment", "invoice"],
    charts: ["chart", "graph", "visualization", "pie", "bar chart"],
    data: ["database", "sqlite", "db api", "data", "storage"],
    template: ["template", "starter", "hello world", "minimal"],
    productivity: ["todo", "task", "calendar", "note", "timer"],
    health: ["health", "fitness", "workout", "diet"],
    weather: ["weather", "forecast", "temperature"],
  };

  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) {
      tags.add(tag);
    }
  }

  if (tags.size === 0) tags.add("utility");

  return [...tags];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
