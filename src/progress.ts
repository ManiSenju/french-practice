import type { Attempt, Question } from "./types";
export type SavedSession = {
  mode: "read" | "typing" | "quiz";
  cardIds: string[];
  questions: (Omit<Question, "word"> & { wordId: string })[];
  theme: string;
  level: string;
  search: string;
  size: number;
  tense: string;
  index: number;
  flipped: boolean;
  answer: string;
  result: { correct: boolean; spellingNote?: boolean } | null;
  assisted: boolean;
  attempts: Attempt[];
  finished: boolean;
  reviewOnly: boolean;
};
export type Backup = {
  version: 1;
  history: Attempt[];
  difficult: string[];
  session: SavedSession | null;
};
const obj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");
const attempts = (v: unknown): v is Attempt[] =>
  Array.isArray(v) &&
  v.length <= 5000 &&
  v.every(
    (x) =>
      obj(x) &&
      typeof x.id === "string" &&
      typeof x.correct === "boolean" &&
      typeof x.assisted === "boolean",
  );
export function validateBackup(raw: unknown, known: Set<string>): Backup {
  if (
    !obj(raw) ||
    raw.version !== 1 ||
    !attempts(raw.history) ||
    !strings(raw.difficult) ||
    raw.difficult.some((id) => !known.has(id))
  )
    throw Error("Invalid backup or vocabulary version mismatch.");
  const s = raw.session;
  if (s !== null) {
    if (
      !obj(s) ||
      !["read", "typing", "quiz"].includes(String(s.mode)) ||
      !strings(s.cardIds) ||
      !s.cardIds.length ||
      s.cardIds.length > 100 ||
      s.cardIds.some((id) => !known.has(id)) ||
      !Number.isInteger(s.index) ||
      Number(s.index) < 0 ||
      Number(s.index) >= s.cardIds.length ||
      !Array.isArray(s.questions) ||
      !attempts(s.attempts) ||
      s.attempts.length > s.cardIds.length ||
      !["theme", "level", "search", "tense", "answer"].every(
        (k) => typeof s[k] === "string",
      ) ||
      !["flipped", "assisted", "finished", "reviewOnly"].every(
        (k) => typeof s[k] === "boolean",
      ) ||
      ![10, 20, 30, 50, 100].includes(Number(s.size))
    )
      throw Error("Invalid saved session.");
    if (
      s.result !== null &&
      (!obj(s.result) ||
        typeof s.result.correct !== "boolean" ||
        (s.result.spellingNote !== undefined &&
          typeof s.result.spellingNote !== "boolean"))
    )
      throw Error("Invalid saved answer.");
    if (s.mode === "quiz") {
      if (s.questions.length !== s.cardIds.length)
        throw Error("Incomplete quiz.");
      const ids = s.cardIds;
      s.questions.forEach((q, i) => {
        if (
          !obj(q) ||
          q.wordId !== ids[i] ||
          !["id", "prompt", "direction", "answer", "audio"].every(
            (k) => typeof q[k] === "string",
          ) ||
          !strings(q.options) ||
          q.options.length !== 4 ||
          new Set(q.options).size !== 4 ||
          !q.options.includes(String(q.answer))
        )
          throw Error("Invalid quiz question.");
      });
    } else if (s.questions.length) throw Error("Unexpected quiz questions.");
  }
  return raw as unknown as Backup;
}
export function difficultFromHistory(history: Attempt[]): string[] {
  const ids = new Set<string>();
  for (const a of history) {
    const id = a.id.split(":")[0];
    if (a.correct && !a.assisted) ids.delete(id);
    else ids.add(id);
  }
  return [...ids];
}
