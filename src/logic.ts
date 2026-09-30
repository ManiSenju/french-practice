import type { Word, Question, Conjugations } from "./types";
export const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/œ/g, "oe")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ");
export const shuffle = <T>(a: T[], rng = Math.random): T[] => {
  const result = [...a];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
export const frenchAnswers = (w: Word) => [
  ...new Set(
    [w.fr, ...(w.fr_variants || [])]
      .flatMap((s) => s.split(/\s*\/\s*/))
      .filter(Boolean),
  ),
];
export function checkAnswer(w: Word, answer: string) {
  const accepted = frenchAnswers(w).find(
    (s) => normalize(s) === normalize(answer),
  );
  return {
    correct: !!accepted,
    spellingNote:
      !!accepted &&
      accepted.trim().toLowerCase() !== answer.trim().toLowerCase(),
  };
}
function meanings(w: Word) {
  return [w.en, ...(w.meanings || [])]
    .flatMap((s) => s.split(/[;,/]/))
    .map((s) =>
      normalize(s)
        .replace(/^to /, "")
        .replace(/\([^)]*\)/g, "")
        .trim(),
    )
    .filter(Boolean);
}
function overlaps(a: Word, b: Word) {
  return (
    normalize(a.fr) === normalize(b.fr) ||
    meanings(a).some((x) => meanings(b).includes(x))
  );
}
export function vocabularyQuiz(
  words: Word[],
  count: number,
  rng = Math.random,
): Question[] {
  const questions: Question[] = [];
  for (const word of shuffle(words, rng)) {
    const distractors: Word[] = [];
    for (const candidate of shuffle(
      words.filter((w) => w.pos === word.pos && !overlaps(w, word)),
      rng,
    )) {
      if (distractors.every((w) => !overlaps(w, candidate)))
        distractors.push(candidate);
      if (distractors.length === 3) break;
    }
    if (distractors.length < 3) continue;
    const frenchFirst = questions.length % 2 === 0;
    const answer = frenchFirst ? word.en : word.fr;
    const options = shuffle(
      [answer, ...distractors.map((w) => (frenchFirst ? w.en : w.fr))],
      rng,
    );
    if (new Set(options.map(normalize)).size !== 4) continue;
    questions.push({
      id: word.id,
      word,
      prompt: frenchFirst ? word.fr : word.en,
      direction: frenchFirst ? "French → English" : "English → French",
      answer,
      options,
      audio: word.fr,
    });
    if (questions.length === count) break;
  }
  return questions;
}
export const tenseOptions: Record<string, string> = {
  "indicatif.present": "Indicatif · présent",
  "indicatif.imparfait": "Indicatif · imparfait",
  "indicatif.futur_simple": "Indicatif · futur simple",
  "indicatif.passe_compose": "Indicatif · passé composé",
  "indicatif.plus_que_parfait": "Indicatif · plus-que-parfait",
  "indicatif.passe_simple": "Indicatif · passé simple",
  "indicatif.passe_anterieur": "Indicatif · passé antérieur",
  "indicatif.futur_anterieur": "Indicatif · futur antérieur",
  "conditionnel.present": "Conditionnel · présent",
  "conditionnel.passe": "Conditionnel · passé",
  "subjonctif.present": "Subjonctif · présent",
  "subjonctif.imparfait": "Subjonctif · imparfait",
  "subjonctif.passe": "Subjonctif · passé",
  "subjonctif.plus_que_parfait": "Subjonctif · plus-que-parfait",
  "imperatif.present": "Impératif · présent",
  "imperatif.passe": "Impératif · passé",
};
export const personNames: Record<string, string> = {
  "1sm": "je (m.)",
  "1sf": "je (f.)",
  "2sm": "tu (m.)",
  "2sf": "tu (f.)",
  "3sm": "il",
  "3sf": "elle",
  "1pm": "nous (m.)",
  "1pf": "nous (f.)",
  "2pm": "vous (m.)",
  "2pf": "vous (f.)",
  "3pm": "ils",
  "3pf": "elles",
  sm: "masculin singulier",
  sf: "féminin singulier",
  pm: "masculin pluriel",
  pf: "féminin pluriel",
};
export const personLabel = (code: string) =>
  code
    .split(";")
    .map((c) => personNames[c] || c.replace("compound_", "composé · "))
    .join(" / ");
export function verbQuiz(
  words: Word[],
  data: Conjugations,
  tense: string,
  count: number,
  rng = Math.random,
): Question[] {
  const [mood, time] = tense.split(".");
  const result: Question[] = [];
  for (const word of shuffle(words, rng)) {
    for (const ref of word.conjugation_refs || []) {
      const table = data.paradigms[ref]?.tables[mood]?.[time];
      if (!table || typeof table === "string") continue;
      const entries = Object.entries(table).filter(
        (p): p is [string, string] => !!p[1],
      );
      for (const [code, form] of shuffle(entries, rng)) {
        const alternatives = form.split(";").map((s) => s.trim());
        // Add forms from other selected verbs in this tense when a verb has
        // fewer than four distinct forms (especially the imperative).
        const sameTenseForms = words.flatMap((w) =>
          (w.conjugation_refs || []).flatMap((r) => {
            const forms = data.paradigms[r]?.tables[mood]?.[time];
            return forms && typeof forms !== "string"
              ? Object.values(forms).flatMap(
                  (v) => v?.split(";").map((s) => s.trim()) || [],
                )
              : [];
          }),
        );
        const accepted = (word.conjugation_refs || []).flatMap((r) => {
          const forms = data.paradigms[r]?.tables[mood]?.[time];
          return forms && typeof forms !== "string"
            ? Object.entries(forms)
                .filter(([c]) =>
                  c.split(";").some((p) => code.split(";").includes(p)),
                )
                .flatMap(([, v]) => v?.split(";").map((s) => s.trim()) || [])
            : [];
        });
        const pool = [
          ...new Map(
            [
              ...entries.flatMap(([, v]) => v.split(";").map((s) => s.trim())),
              ...sameTenseForms,
            ].map((v) => [normalize(v), v]),
          ).values(),
        ].filter((v) => !accepted.some((a) => normalize(a) === normalize(v)));
        const wrong = shuffle(pool, rng).slice(0, 3);
        if (wrong.length < 3) continue;
        const answer = alternatives[0];
        result.push({
          id: word.id + ":" + ref + ":" + tense + ":" + code,
          word,
          prompt: `${word.fr} · ${personLabel(code)}`,
          direction: tenseOptions[tense],
          answer,
          options: shuffle([answer, ...wrong], rng),
          audio: word.fr,
        });
        break;
      }
      if (result.at(-1)?.word.id === word.id) break;
    }
    if (result.length === count) break;
  }
  return result;
}
