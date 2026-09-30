import { it, expect } from "vitest";
import { validateBackup, difficultFromHistory } from "./progress";
it("tracks the latest outcome per word, including conjugation questions", () => {
  expect(
    difficultFromHistory([
      { id: "verb-a:present:1sm", correct: false, assisted: false },
      { id: "word-b", correct: true, assisted: true },
      { id: "verb-a:present:1sm", correct: true, assisted: false },
    ]),
  ).toEqual(["word-b"]);
});
it("rejects invalid backups without accepting unknown word IDs", () => {
  expect(() =>
    validateBackup(
      { version: 1, history: [], difficult: ["missing"], session: null },
      new Set(),
    ),
  ).toThrow();
  expect(() =>
    validateBackup(
      { version: 1, history: [], difficult: [], session: { index: -1 } },
      new Set(),
    ),
  ).toThrow();
  expect(
    validateBackup(
      { version: 1, history: [], difficult: ["word-a"], session: null },
      new Set(["word-a"]),
    ),
  ).toHaveProperty("version", 1);
});
