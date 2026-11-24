// Developer Excuses — make.fun entry
//
// Competition: u-motasimfuad-make-the-ai-judge-laugh-developer-49386be3
// Task: write one funny single-line excuse a developer gives when code
// breaks in production, under 200 characters, to /output/entry.txt.
// A house judge model compares lines head to head in private blind rounds.
//
// Design of this program:
// - The verse is built from three named parts, each carrying one job:
//   the opening states the symptom, the middle names the real cause,
//   the punch owns it in first person. Keeping the parts separate makes
//   the joke easy to tune without touching the plumbing.
// - The program checks its own work before writing: one verse, visible
//   glyphs only, inside the 1..200 character gate. A verse that fails
//   the gate is reported and never written.
// - The write is verified by reading the file back and comparing it
//   with the verse in memory. The run is deterministic: fixed text,
//   no clock, no randomness, no network, no input files.
// - Output goes to MAKEFUN_OUTPUT_DIR when set, falling back to
//   /output, matching the grader sandbox layout.
//
// Revision pass 3: the composer now trims the assembled verse so no
// stray edge whitespace can slip into the file, and the success line
// reports the byte size too, since the leaderboard tie-break weighs
// the smaller text in bytes.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Fixed contract values
// ---------------------------------------------------------------------------

const ENTRY_FILENAME = "entry.txt";
const MAX_VERSE_CHARS = 200;
const MIN_VERSE_CHARS = 1;
const DEFAULT_OUTPUT_DIR = "/output";
const OUTPUT_DIR_ENV = "MAKEFUN_OUTPUT_DIR";
const NEWLINE_GLYPH = "\n";
const RETURN_GLYPH = "\r";
const SPACE_GLYPH = " ";
const VERSE_SEPARATOR = SPACE_GLYPH;

// ---------------------------------------------------------------------------
// The verse, in three named parts
//
// Opening: the symptom the team can see.
// Twist: the real cause, in jargon a developer recognises at once.
// Punch: the first-person admission that lands the laugh.
// ---------------------------------------------------------------------------

const VERSE_OPENING = "The dashboard stayed green all night";
const VERSE_TWIST = "because the health check only pings itself";
const VERSE_PUNCH = "— I wrote it that way so it would stop waking me up.";

// ---------------------------------------------------------------------------
// Shapes carried between the small helpers
// ---------------------------------------------------------------------------

interface VerseReport {
  verse: string;
  glyphCount: number;
  valid: boolean;
  problems: string[];
}

interface VerseDelivery {
  outputPath: string;
  glyphCount: number;
  byteCount: number;
  verified: boolean;
  failureNote: string;
}

// ---------------------------------------------------------------------------
// Glyph helpers
// ---------------------------------------------------------------------------

function countGlyphs(verse: string): number {
  const glyphList = Array.from(verse);
  const tally = glyphList.length;
  return tally;
}

function countBytes(verse: string): number {
  const encoder = new TextEncoder();
  const encodedVerse = encoder.encode(verse);
  const byteTally = encodedVerse.length;
  return byteTally;
}

function hasVisibleGlyph(verse: string): boolean {
  const strippedVerse = verse.trim();
  const visible = strippedVerse.length > 0;
  return visible;
}

function holdsSingleVerse(verse: string): boolean {
  const newlineFound = verse.includes(NEWLINE_GLYPH);
  const returnFound = verse.includes(RETURN_GLYPH);
  const single = newlineFound === false && returnFound === false;
  return single;
}

function isWithinBudget(glyphCount: number): boolean {
  const aboveMinimum = glyphCount >= MIN_VERSE_CHARS;
  const belowMaximum = glyphCount <= MAX_VERSE_CHARS;
  const within = aboveMinimum && belowMaximum;
  return within;
}

function joinVerseParts(parts: string[]): string {
  const trimmedParts = parts.map((part) => part.trim());
  const joinedVerse = trimmedParts.join(VERSE_SEPARATOR);
  return joinedVerse;
}

// ---------------------------------------------------------------------------
// Composition
// ---------------------------------------------------------------------------

function composeVerse(): string {
  const verseParts = [VERSE_OPENING, VERSE_TWIST, VERSE_PUNCH];
  const assembledVerse = joinVerseParts(verseParts);
  const trimmedVerse = assembledVerse.trim();
  return trimmedVerse;
}

// ---------------------------------------------------------------------------
// Gate validation: the sealed scorer wants UTF-8 text of 1 to 200
// characters, not only white space, on a single line.
// ---------------------------------------------------------------------------

function validateVerse(verse: string): VerseReport {
  const glyphCount = countGlyphs(verse);
  const problems: string[] = [];
  const visible = hasVisibleGlyph(verse);
  if (visible === false) {
    problems.push("verse holds no visible glyph");
  }
  const single = holdsSingleVerse(verse);
  if (single === false) {
    problems.push("verse spans more than one line");
  }
  const budgeted = isWithinBudget(glyphCount);
  if (budgeted === false) {
    problems.push("verse length sits outside the 1..200 character gate");
  }
  const valid = problems.length === 0;
  const report: VerseReport = {
    verse,
    glyphCount,
    valid,
    problems,
  };
  return report;
}

// ---------------------------------------------------------------------------
// Output directory resolution
// ---------------------------------------------------------------------------

function resolveOutputDir(): string {
  const fallbackDir = DEFAULT_OUTPUT_DIR;
  const rawValue = process.env[OUTPUT_DIR_ENV];
  if (rawValue === undefined) {
    return fallbackDir;
  }
  const trimmedValue = rawValue.trim();
  if (trimmedValue.length === 0) {
    return fallbackDir;
  }
  return trimmedValue;
}

// ---------------------------------------------------------------------------
// Disk write with read-back verification
// ---------------------------------------------------------------------------

function writeVerseToDisk(outputDir: string, verse: string): VerseDelivery {
  const glyphCount = countGlyphs(verse);
  const byteCount = countBytes(verse);
  const outputPath = join(outputDir, ENTRY_FILENAME);
  try { mkdirSync(outputDir, { recursive: true });
    writeFileSync(outputPath, verse, "utf8");
    const readBack = readFileSync(outputPath, "utf8");
    const verified = readBack === verse;
    const failureNote = verified ? "" : "read-back differs from verse";
    const delivery: VerseDelivery = {
      outputPath,
      glyphCount,
      byteCount,
      verified,
      failureNote,
    };
    return delivery;
  } catch (diskMishap) {
    const mishapMessage =
      diskMishap instanceof Error ? diskMishap.message : String(diskMishap);
    const failedDelivery: VerseDelivery = {
      outputPath,
      glyphCount,
      byteCount,
      verified: false,
      failureNote: mishapMessage,
    };
    return failedDelivery;
  }
}

// ---------------------------------------------------------------------------
// Main flow: compose, gate, write, verify, report.
// Exit code 0 means a verified verse on disk; 1 means a failed run.
// ---------------------------------------------------------------------------

function runEntryComposer(): number {
  const verse = composeVerse();
  const report = validateVerse(verse);
  if (report.valid === false) {
    const problemList = report.problems.join("; ");
    console.error(`verse failed the gate: ${problemList}`);
    console.error(`verse length: ${report.glyphCount} characters`);
    const failedCode = 1;
    return failedCode;
  }
  const outputDir = resolveOutputDir();
  const delivery = writeVerseToDisk(outputDir, verse);
  if (delivery.verified === false) {
    console.error(`write failed: ${delivery.failureNote}`);
    const failedCode = 1;
    return failedCode;
  }
  console.log(
    `entry written: ${delivery.glyphCount} characters, ${delivery.byteCount} bytes -> ${delivery.outputPath}`,
  );
  const okCode = 0;
  return okCode;
}

try { const exitCode = runEntryComposer(); process.exitCode = exitCode; } catch (toppleError) {
  const toppleMessage =
    toppleError instanceof Error ? toppleError.message : String(toppleError);
  console.error(`entry composer failed: ${toppleMessage}`);
  process.exitCode = 1;
}
