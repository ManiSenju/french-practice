import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  checkAnswer,
  vocabularyQuiz,
  verbQuiz,
  normalize,
  studyLevel,
} from "./logic";
import type { Word, Conjugations } from "./types";
const data = JSON.parse(
  readFileSync(
    new URL("../public/data/vocabulary.json", import.meta.url),
    "utf8",
  ),
) as { vocabulary: Word[]; verbs: Word[] };
const conjugations = JSON.parse(
  readFileSync(
    new URL("../public/data/conjugations.json", import.meta.url),
    "utf8",
  ),
) as Conjugations;
describe("French typing", () => {
  it("accepts missing accents but teaches correct spelling; preserves articles", () => {
    const word = { fr: "une leçon" } as Word;
    expect(checkAnswer(word, " UNE LECON ")).toEqual({
      correct: true,
      spellingNote: true,
    });
    expect(checkAnswer(word, "une leçon")).toEqual({
      correct: true,
      spellingNote: false,
    });
    expect(checkAnswer(word, "leçon").correct).toBe(false);
  });
  it("accepts documented variants and curly apostrophes", () => {
    expect(
      checkAnswer(
        { fr: "l'école", fr_variants: ["une école"] } as Word,
        "une ecole",
      ).correct,
    ).toBe(true);
    expect(checkAnswer({ fr: "l'école" } as Word, "l’école").correct).toBe(
      true,
    );
  });
});
describe("theme quizzes", () => {
  it("keeps every prompt and option inside the chosen theme and alternates direction", () => {
    const words = data.vocabulary.filter((w) =>
      w.categories.includes("Food & Drinks"),
    );
    const questions = vocabularyQuiz(words, 20, () => 0.42);
    expect(questions).toHaveLength(20);
    questions.forEach((q, i) => {
      expect(words.some((w) => w.id === q.word.id)).toBe(true);
      expect(q.direction).toBe(
        i % 2 === 0 ? "French → English" : "English → French",
      );
      expect(new Set(q.options.map(normalize)).size).toBe(4);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
      q.options.forEach((o) =>
        expect(words.some((w) => (i % 2 === 0 ? w.en : w.fr) === o)).toBe(true),
      );
    });
  });
  it("skips small pools and overlapping meanings", () => {
    const words = ["vite", "rapidement", "promptement", "prestement"].map(
      (fr, i) => ({ id: String(i), fr, en: "quickly", pos: "adverb" }) as Word,
    );
    expect(vocabularyQuiz(words, 10)).toEqual([]);
    expect(vocabularyQuiz(data.vocabulary.slice(0, 2), 10)).toEqual([]);
  });
  it("handles every theme without duplicate or missing options", () => {
    for (const theme of new Set(data.vocabulary.map((w) => w.category))) {
      const words = data.vocabulary.filter((w) => w.categories.includes(theme));
      for (const q of vocabularyQuiz(words, 30, () => 0.6)) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options.map(normalize)).size).toBe(4);
      }
    }
  });
});
describe("conjugation quizzes", () => {
  it("uses actual selected-tense forms and distinct wrong answers", () => {
    const questions = verbQuiz(
      data.verbs,
      conjugations,
      "indicatif.present",
      20,
      () => 0.4,
    );
    expect(questions).toHaveLength(20);
    for (const q of questions) {
      expect(q.direction).toBe("Indicatif · présent");
      expect(new Set(q.options).size).toBe(4);
      const all = (q.word.conjugation_refs || []).flatMap((r) =>
        Object.values(
          conjugations.paradigms[r].tables.indicatif.present || {},
        ).flatMap((v) => v?.split(";") || []),
      );
      expect(all).toContain(q.answer);
    }
  });
  it("supports imperative quizzes with their smaller person sets", () => {
    const questions = verbQuiz(
      data.verbs,
      conjugations,
      "imperatif.present",
      10,
      () => 0.4,
    );
    expect(questions.length).toBe(10);
    expect(questions.every((q) => q.options.length === 4)).toBe(true);
  });
  it("skips unavailable imperative forms such as pouvoir", () => {
    expect(
      verbQuiz(
        data.verbs.filter((w) => w.fr === "pouvoir"),
        conjugations,
        "imperatif.present",
        10,
      ),
    ).toEqual([]);
  });
});

describe("exported source examples", () => {
  it("includes bilingual Anki examples for vocabulary entries", () => {
    const lesson = data.vocabulary.find((w) => w.fr === "une leçon")!;
    expect(lesson.examples).toContainEqual(
      expect.objectContaining({
        fr: "Merci pour la leçon.",
        en: "Thank you for the lesson.",
      }),
    );
    expect(
      data.vocabulary.filter((w) => w.examples?.length).length,
    ).toBeGreaterThan(700);
  });
  it("does not transfer money examples to the silver sense of argent", () => {
    const silver = data.vocabulary.find(
      (w) => w.fr === "de l'argent" && w.en === "silver",
    )!;
    expect(silver).toBeDefined();
    expect(silver.examples?.some((ex) => /silver/i.test(ex.en))).toBe(true);
  });
});

describe("complete bilingual example coverage", () => {
  it("provides complete pairs for every vocabulary entry and verb card", () => {
    const words = [...data.vocabulary, ...data.verbs];
    expect(words).toHaveLength(4401);
    for (const word of words) {
      expect(word.examples?.length, word.fr).toBeGreaterThan(0);
      for (const ex of word.examples || []) {
        expect(ex.fr.trim(), word.fr).not.toBe("");
        expect(ex.en.trim(), word.fr).not.toBe("");
      }
    }
  });
});

it("groups the combined course band under A1 only", () => {
  expect(studyLevel("A1-A2")).toBe("A1");
  expect(studyLevel("A2")).toBe("A2");
  expect(studyLevel("All levels")).toBe("All levels");
});
