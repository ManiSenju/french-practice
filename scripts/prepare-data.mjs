import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const read = async (name) =>
  JSON.parse(await readFile(new URL("../vocab/" + name, import.meta.url), "utf8"));
const fields = [
  "fr",
  "en",
  "pos",
  "category",
  "categories",
  "level",
  "levels",
  "gender",
  "gender_note",
  "respelling",
  "examples",
  "verb_ids",
  "conjugation_refs",
  "meanings",
  "fr_variants",
];
function compact(row) {
  const result = Object.fromEntries(
    fields.filter((k) => row[k] !== undefined).map((k) => [k, row[k]]),
  );
  result.id =
    row.id ||
    "word-" +
      createHash("sha256")
        .update(JSON.stringify([row.fr, row.en, row.pos]))
        .digest("hex")
        .slice(0, 16);
  return result;
}
const vocabulary = (await read("topic_vocab.json")).map(compact);
const verbs = (await read("verbs_vocab.json")).map(compact);
const exampleEntries = (await read("vocabulary_examples.json")).entries;
const allWords = [...vocabulary, ...verbs];
if (Object.keys(exampleEntries).length !== allWords.length)
  throw Error("Example manifest contains missing or obsolete entries.");
for (const word of allWords) {
  const entry = exampleEntries[word.id];
  if (
    !entry ||
    entry.fr !== word.fr ||
    entry.en !== word.en ||
    !entry.examples?.length ||
    entry.examples.some((ex) => !ex.fr?.trim() || !ex.en?.trim())
  )
    throw Error(`Missing or mismatched bilingual examples: ${word.id}`);
  word.examples = entry.examples;
}
console.log(`Bilingual examples available for all ${allWords.length} entries.`);
if (vocabulary.length !== 4354 || verbs.length !== 47)
  throw Error("Unexpected dataset counts; review export.");
const out = new URL("../public/data/", import.meta.url);
await mkdir(out, { recursive: true });
await writeFile(
  new URL("vocabulary.json", out),
  JSON.stringify({ vocabulary, verbs }),
);
await writeFile(
  new URL("conjugations.json", out),
  JSON.stringify(await read("verbs_conjugations_full.json")),
);
console.log(
  `Prepared ${vocabulary.length} vocabulary entries and ${verbs.length} conjugation cards.`,
);
