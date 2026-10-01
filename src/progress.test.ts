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

for (const size of [50, 100]) {
  for (const mode of ["read", "typing", "quiz"]) {
    it(`restores a ${size}-card ${mode} session`, () => {
      const cardIds = Array.from({ length: size }, (_, i) => `word-${i}`);
      const session = {
        mode,
        size,
        cardIds,
        index: size - 1,
        attempts: [],
        theme: "Education",
        level: "All levels",
        search: "",
        tense: "",
        answer: "",
        flipped: false,
        assisted: false,
        finished: false,
        reviewOnly: false,
        result: null,
        questions:
          mode === "quiz"
            ? cardIds.map((wordId) => ({
                wordId,
                id: wordId,
                prompt: "Question",
                direction: "French → English",
                answer: "a",
                audio: "mot",
                options: ["a", "b", "c", "d"],
              }))
            : [],
      };
      const backup = { version: 1, history: [], difficult: [], session };
      expect(validateBackup(backup, new Set(cardIds)).session).toEqual(session);
      expect(() =>
        validateBackup(
          {
            ...backup,
            session: {
              ...session,
              cardIds: [...cardIds, ...cardIds, "word-0"],
            },
          },
          new Set(cardIds),
        ),
      ).toThrow();
    });
  }
}
