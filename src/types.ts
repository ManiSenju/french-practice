export type Word = {
  id: string;
  fr: string;
  en: string;
  pos: string;
  category: string;
  categories: string[];
  level?: string;
  levels?: string[];
  gender?: string;
  gender_note?: string;
  respelling: string;
  examples?: {
    fr: string;
    en: string;
    kind?: string;
    source?: string;
    level_target?: string;
    usage_note?: string;
    license_url?: string;
    attribution?: Record<string, { author: string; url: string }>;
  }[];
  verb_ids?: string[];
  conjugation_refs?: string[];
  meanings?: string[];
  fr_variants?: string[];
};
export type Paradigm = {
  lemma: string;
  voice: string;
  tables: Record<
    string,
    Record<string, string | null | Record<string, string | null>>
  >;
};
export type Conjugations = { paradigms: Record<string, Paradigm> };
export type Question = {
  id: string;
  word: Word;
  prompt: string;
  direction: string;
  options: string[];
  answer: string;
  audio: string;
};
export type Attempt = { id: string; correct: boolean; assisted: boolean };
