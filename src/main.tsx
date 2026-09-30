import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Word, Conjugations, Question, Attempt } from "./types";
import {
  normalize,
  shuffle,
  checkAnswer,
  vocabularyQuiz,
  verbQuiz,
  tenseOptions,
  personLabel,
} from "./logic";
import "./style.css";
import {
  validateBackup,
  difficultFromHistory,
  type Backup,
  type SavedSession,
} from "./progress";

function ExampleSentence({
  example: ex,
}: {
  example: NonNullable<Word["examples"]>[number];
}) {
  const [visible, setVisible] = useState(false);
  return (
    <p>
      <strong lang="fr">{ex.fr}</strong>
      <br />
      <button
        type="button"
        className="translation-toggle"
        aria-expanded={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? "Hide translation" : "Show translation"}
      </button>
      {visible && (
        <span className="example-translation" lang="en">
          {ex.en}
        </span>
      )}
      {ex.usage_note && (
        <>
          <br />
          <em>{ex.usage_note}</em>
        </>
      )}
      {ex.kind === "original" && (
        <>
          <br />
          <small className="muted">
            Original practice example (AI-assisted)
            {ex.level_target ? ` · Target ${ex.level_target} (estimated)` : ""}
          </small>
        </>
      )}
      {ex.kind === "tatoeba" && (
        <>
          <br />
          <small className="muted">
            Tatoeba via OPUS ·{" "}
            {Object.entries(ex.attribution || {}).map(([lang, credit]) => (
              <span key={lang}>
                <a href={credit.url} target="_blank" rel="noreferrer">
                  {lang === "fra" ? "French" : "English"}: {credit.author}
                </a>
                {" · "}
              </span>
            ))}
            <a href={ex.license_url} target="_blank" rel="noreferrer">
              CC BY 2.0 FR
            </a>
          </small>
        </>
      )}
    </p>
  );
}

const DATA = `${import.meta.env.BASE_URL}data/`;
type Mode = "read" | "typing" | "quiz";
type Session = {
  mode: Mode;
  cards: Word[];
  questions: Question[];
  theme: string;
};
function loadProgress(): Attempt[] {
  try {
    const p = JSON.parse(localStorage.getItem("french-practice-v1") || "[]");
    return Array.isArray(p)
      ? p.filter(
          (x) =>
            typeof x.id === "string" &&
            typeof x.correct === "boolean" &&
            typeof x.assisted === "boolean",
        )
      : [];
  } catch {
    return [];
  }
}
function loadAudioSettings(): { voice: string; rate: number } {
  try {
    const saved = JSON.parse(localStorage.getItem("french-audio-v1") || "{}");
    return {
      voice: typeof saved.voice === "string" ? saved.voice : "",
      rate: saved.rate === 0.75 ? 0.75 : 1,
    };
  } catch {
    return { voice: "", rate: 1 };
  }
}
function App() {
  const [data, setData] = useState<{
    vocabulary: Word[];
    verbs: Word[];
  } | null>(null);
  const [conjugations, setConjugations] = useState<Conjugations | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [screen, setScreen] = useState<"browse" | "practice">("browse");
  const [theme, setTheme] = useState("All topics");
  const [level, setLevel] = useState("All levels");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("read");
  const [size, setSize] = useState(10);
  const [tense, setTense] = useState("indicatif.present");
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{
    correct: boolean;
    spellingNote?: boolean;
  } | null>(null);
  const [assisted, setAssisted] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [history, setHistory] = useState(loadProgress);
  const [finished, setFinished] = useState(false);
  const [difficult, setDifficult] = useState<string[]>(() =>
    difficultFromHistory(loadProgress()),
  );
  const [reviewOnly, setReviewOnly] = useState(false);
  const [restored, setRestored] = useState(false);
  const [pendingImport, setPendingImport] = useState<Backup | null>(null);
  function restoreSession(saved: SavedSession | null) {
    if (!saved) {
      setSession(null);
      setFinished(false);
      return;
    }
    const words = new Map(
      [...(data?.vocabulary || []), ...(data?.verbs || [])].map((w) => [
        w.id,
        w,
      ]),
    );
    setSession({
      mode: saved.mode,
      cards: saved.cardIds.map((id) => words.get(id)!),
      questions: saved.questions.map((q) => ({
        ...q,
        word: words.get(q.wordId)!,
      })),
      theme: saved.theme,
    });
    setMode(saved.mode);
    setTheme(saved.theme);
    setLevel(saved.level);
    setSearch(saved.search);
    setSize(saved.size);
    setTense(saved.tense);
    setIndex(saved.index);
    setFlipped(saved.flipped);
    setAnswer(saved.answer);
    setResult(saved.result);
    setAssisted(saved.assisted);
    setAttempts(saved.attempts);
    setFinished(saved.finished);
    setReviewOnly(saved.reviewOnly);
    setScreen("practice");
  }
  function backup(): Backup {
    return {
      version: 1,
      history: history.slice(-5000),
      difficult,
      session: session
        ? {
            mode: session.mode,
            cardIds: session.cards.map((w) => w.id),
            questions: session.questions.map(({ word, ...q }) => ({
              ...q,
              wordId: word.id,
            })),
            theme,
            level,
            search,
            size,
            tense,
            index,
            flipped,
            answer,
            result,
            assisted,
            attempts,
            finished,
            reviewOnly,
          }
        : null,
    };
  }
  function downloadBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup(), null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `french-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function readBackup(file: File) {
    try {
      if (file.size > 5_000_000)
        throw Error("Backup is too large (maximum 5 MB).");
      const known = new Set(
        [...(data?.vocabulary || []), ...(data?.verbs || [])].map((w) => w.id),
      );
      setPendingImport(validateBackup(JSON.parse(await file.text()), known));
    } catch (e) {
      setPendingImport(null);
      setNotice(e instanceof Error ? e.message : "Could not read backup.");
    }
  }
  useEffect(() => {
    if (!data || restored) return;
    try {
      const raw = localStorage.getItem("french-progress-v2");
      if (raw) {
        const saved = validateBackup(
          JSON.parse(raw),
          new Set([...data.vocabulary, ...data.verbs].map((w) => w.id)),
        );
        setHistory(saved.history);
        setDifficult(saved.difficult);
        restoreSession(saved.session);
      }
    } catch {
      setNotice(
        "Saved session could not be restored. Existing answer history is still available.",
      );
    }
    setRestored(true);
  }, [data, restored]);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem("french-progress-v2", JSON.stringify(backup()));
    } catch {
      setNotice(
        "Could not save progress. Export a backup to keep this session.",
      );
    }
  }, [
    restored,
    history,
    difficult,
    session,
    theme,
    level,
    search,
    size,
    tense,
    index,
    flipped,
    answer,
    result,
    assisted,
    attempts,
    finished,
    reviewOnly,
  ]);

  const [audioSettings, setAudioSettings] = useState(loadAudioSettings);
  const [frenchVoices, setFrenchVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioSupported = "speechSynthesis" in window;
  const automaticVoice =
    frenchVoices.find(
      (v) => v.lang.replace("_", "-").toLowerCase() === "fr-fr" && v.default,
    ) ||
    frenchVoices.find(
      (v) => v.lang.replace("_", "-").toLowerCase() === "fr-fr",
    ) ||
    frenchVoices[0];
  const selectedVoice =
    frenchVoices.find((v) => v.voiceURI === audioSettings.voice) ||
    automaticVoice;
  useEffect(() => {
    try {
      localStorage.setItem("french-audio-v1", JSON.stringify(audioSettings));
    } catch {
      setNotice(
        "Audio preferences could not be saved on this device. They still apply for this session.",
      );
    }
  }, [audioSettings]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [v, c] = await Promise.all(
          ["vocabulary.json", "conjugations.json"].map(async (name) => {
            const r = await fetch(DATA + name, { signal: controller.signal });
            if (!r.ok) throw Error(`Could not load ${name} (${r.status})`);
            return r.json();
          }),
        );
        setData(v);
        setConjugations(c);
      } catch (e) {
        if (!controller.signal.aborted) setError(String(e));
      }
    }
    void load();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        "french-practice-v1",
        JSON.stringify(history.slice(-5000)),
      );
    } catch {
      setNotice(
        "Progress could not be saved on this device. You can still practise.",
      );
    }
  }, [history]);
  const themes = useMemo(
    () =>
      data
        ? [...new Set(data.vocabulary.map((w) => w.category))]
            .sort()
            .concat("Verbs")
        : [],
    [data],
  );
  const filtered = useMemo(() => {
    if (!data) return [];
    const source =
      theme === "Verbs"
        ? data.verbs
        : reviewOnly && theme === "All topics"
          ? [...data.vocabulary, ...data.verbs]
          : data.vocabulary;
    return source.filter(
      (w) =>
        (!reviewOnly || difficult.includes(w.id)) &&
        (theme === "All topics" ||
          theme === "Verbs" ||
          w.categories.includes(theme)) &&
        (level === "All levels" ||
          [w.level, ...(w.levels || [])].some(
            (l) =>
              l === level ||
              (l === "A1-A2" && (level === "A1" || level === "A2")),
          )) &&
        (!search || normalize(w.fr + " " + w.en).includes(normalize(search))),
    );
  }, [data, theme, level, search, reviewOnly, difficult]);
  const word = session?.cards[index];
  const question = session?.questions[index];
  function speak(text: string, reveals = false) {
    if (!("speechSynthesis" in window)) {
      setNotice(
        "French audio is not supported in this browser. Use the pronunciation hint on the back.",
      );
      return;
    }
    const voice = selectedVoice;
    if (!voice) {
      setNotice(
        "No French voice is available yet. Enable a French voice in your device settings or try another browser.",
      );
      return;
    }
    if (reveals && !result) setAssisted(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice.lang;
    utterance.rate = audioSettings.rate;
    utterance.voice = voice;
    utterance.onerror = (e) => {
      if (!["interrupted", "canceled"].includes(e.error))
        setNotice(
          "Audio could not play. Try again or use the pronunciation hint.",
        );
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }
  // Some browsers populate the voices asynchronously; request them early.
  useEffect(() => {
    if ("speechSynthesis" in window) {
      const ready = () =>
        setFrenchVoices(
          window.speechSynthesis
            .getVoices()
            .filter((v) => /^fr(?:[-_]|$)/i.test(v.lang))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      ready();
      window.speechSynthesis.addEventListener("voiceschanged", ready);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", ready);
        window.speechSynthesis.cancel();
      };
    }
  }, []);
  function clearCard() {
    setFlipped(false);
    setAnswer("");
    setResult(null);
    setAssisted(false);
  }
  function reset() {
    setSession(null);
    setFinished(false);
    setPage(0);
    setExpanded(null);
  }
  function start(retry = false) {
    if (!conjugations) return;
    let questions: Question[] = [];
    let cards: Word[] = [];
    if (retry && session) {
      const missed = new Set(
        attempts.filter((a) => !a.correct || a.assisted).map((a) => a.id),
      );
      if (session.mode === "quiz") {
        questions = session.questions.filter((q) => missed.has(q.id));
        cards = questions.map((q) => q.word);
      } else cards = session.cards.filter((w) => missed.has(w.id));
    } else if (mode === "quiz") {
      questions =
        theme === "Verbs"
          ? verbQuiz(filtered, conjugations, tense, size)
          : vocabularyQuiz(filtered, size);
      cards = questions.map((q) => q.word);
    } else cards = shuffle(filtered).slice(0, size);
    if (!cards.length) {
      setNotice(
        mode === "quiz"
          ? "There are not enough distinct answers for a fair quiz in this selection. Try another theme or level."
          : "No words match these filters.",
      );
      return;
    }
    setNotice("");
    setSession({
      mode: retry && session ? session.mode : mode,
      cards,
      questions,
      theme,
    });
    setIndex(0);
    setAttempts([]);
    setFinished(false);
    clearCard();
  }
  function submit(choice = answer) {
    if (!word || result || !session) return;
    const checked =
      session.mode === "quiz"
        ? { correct: choice === question!.answer }
        : checkAnswer(word, choice);
    setAnswer(choice);
    setResult(checked);
    const attempt = {
      id: session.mode === "quiz" ? question!.id : word.id,
      correct: checked.correct,
      assisted,
    };
    setAttempts((a) => [...a, attempt]);
    setHistory((a) => [...a, attempt].slice(-5000));
    setDifficult((ids) =>
      checked.correct && !assisted
        ? ids.filter((id) => id !== word.id)
        : [...new Set([...ids, word.id])],
    );
  }
  function next() {
    if (!session) return;
    if (index + 1 === session.cards.length) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    clearCard();
  }
  function flip() {
    if (session?.mode !== "read" && !result) setAssisted(true);
    setFlipped((f) => !f);
  }
  const streak = attempts.reduce(
    (n, a) => (a.correct && !a.assisted ? n + 1 : 0),
    0,
  );
  const score = attempts.filter((a) => a.correct && !a.assisted).length;
  const misses = attempts.filter((a) => !a.correct || a.assisted).length;
  function examplesFor(w: Word) {
    if (w.examples?.length) return w.examples;
    return (
      data?.verbs
        .filter((v) => w.verb_ids?.includes(v.id))
        .flatMap((v) => v.examples || []) || []
    );
  }
  function details(w: Word) {
    const related = data?.verbs.filter((v) => w.verb_ids?.includes(v.id)) || [];
    const examples = examplesFor(w);
    const refs =
      w.conjugation_refs || related.flatMap((v) => v.conjugation_refs || []);
    return (
      <div className="details">
        <button
          className="review-toggle"
          onClick={() =>
            setDifficult((ids) =>
              ids.includes(w.id)
                ? ids.filter((id) => id !== w.id)
                : [...ids, w.id],
            )
          }
        >
          {difficult.includes(w.id)
            ? "Remove from Needs practice"
            : "Add to Needs practice"}
        </button>
        <div className="meaning">{w.en}</div>
        <p className="pronunciation">
          {w.respelling} <span>· pronunciation hint</span>
        </p>
        <div className="badges">
          <span>{w.pos}</span>
          {w.gender && <span>{w.gender}</span>}
          <span>
            {w.level || w.levels?.join(" / ") || "Level not assigned"}
          </span>
        </div>
        {w.gender_note && <p>{w.gender_note}</p>}
        {examples?.length ? (
          <section className="examples">
            <h3>Example sentences</h3>
            {examples.map((ex, i) => (
              <ExampleSentence key={`${w.id}-${i}-${ex.fr}`} example={ex} />
            ))}
          </section>
        ) : (
          <p className="muted small">No example available for this entry.</p>
        )}
        {refs.length > 0 && conjugations && (
          <details className="conjugations">
            <summary>Conjugation tables</summary>
            <p className="small muted">
              Forms omit subject pronouns. Agreement depends on context.
            </p>
            {[...new Set(refs)].map((ref) => {
              const p = conjugations.paradigms[ref];
              return p ? (
                <div key={ref}>
                  <h3>
                    {p.lemma} ·{" "}
                    {p.voice === "voix_prono"
                      ? "reflexive"
                      : p.voice.endsWith("etre")
                        ? "être auxiliary"
                        : "avoir auxiliary"}
                  </h3>
                  {Object.entries(p.tables).map(([mood, tenses]) => (
                    <details key={mood}>
                      <summary>{mood}</summary>
                      {Object.entries(tenses).map(([time, forms]) => (
                        <section key={time}>
                          <h4>
                            {tenseOptions[mood + "." + time] ||
                              time.replaceAll("_", " ")}
                          </h4>
                          {typeof forms === "string" ? (
                            <p lang="fr">{forms}</p>
                          ) : forms && Object.keys(forms).length ? (
                            <dl className="forms">
                              {Object.entries(forms).map(([person, form]) => (
                                <React.Fragment key={person}>
                                  <dt>{personLabel(person)}</dt>
                                  <dd lang="fr">
                                    {form?.replaceAll(";", " / ") ||
                                      "Unavailable"}
                                  </dd>
                                </React.Fragment>
                              ))}
                            </dl>
                          ) : (
                            <p className="muted">Unavailable</p>
                          )}
                        </section>
                      ))}
                    </details>
                  ))}
                </div>
              ) : null;
            })}
          </details>
        )}
      </div>
    );
  }
  if (error)
    return (
      <main className="loading">
        <h1>Couldn’t load the vocabulary</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (!data || !conjugations)
    return (
      <main className="loading" role="status">
        Loading your French vocabulary…
      </main>
    );
  return (
    <div className="app">
      <header className="header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setScreen("browse");
          }}
        >
          <span className="logo">é</span>
          <span>
            French <strong>practice</strong>
            <small>A little French, every day.</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={screen === "browse" ? "active" : ""}
            onClick={() => setScreen("browse")}
          >
            Vocabulary
          </button>
          <button
            className={screen === "practice" ? "active" : ""}
            onClick={() => setScreen("practice")}
          >
            Practice
          </button>
        </nav>
        <span className="saved">{history.length} answers practised</span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR FRENCH NOTEBOOK</p>
            <h1>
              {screen === "browse"
                ? "Explore your vocabulary."
                : "Make the words your own."}
            </h1>
            <p className="muted">
              {screen === "browse"
                ? "Browse 4,354 entries, or explore the 47-verb collection."
                : "Read, recall, and test yourself—one card at a time."}
            </p>
          </div>
          <span className="count-pill">{themes.length} study categories</span>
        </div>
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        <section className="progress-tools" aria-label="Progress and backups">
          <button
            className={reviewOnly ? "primary" : ""}
            onClick={() => {
              setReviewOnly(!reviewOnly);
              reset();
            }}
          >
            Needs practice ({difficult.length}){reviewOnly ? " · On" : ""}
          </button>
          <button onClick={downloadBackup}>Export progress</button>
          <label className="import-label">
            Import progress
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void readBackup(f);
                e.target.value = "";
              }}
            />
          </label>
          <p className="small muted">
            Mistakes and assisted answers stay here until you answer correctly
            without hints. Filters still apply.
          </p>
          {pendingImport && (
            <div className="notice">
              <span>
                Backup: {pendingImport.history.length} answers,{" "}
                {pendingImport.difficult.length} difficult words
                {pendingImport.session ? ", with a saved session" : ""}. Replace
                this device’s progress? Your current progress will download as a
                safety backup.
              </span>
              <button
                onClick={() => {
                  downloadBackup();
                  setHistory(pendingImport.history);
                  setDifficult(pendingImport.difficult);
                  restoreSession(pendingImport.session);
                  setPendingImport(null);
                  setPage(0);
                  setExpanded(null);
                  setNotice("Progress imported.");
                }}
              >
                Replace progress
              </button>
              <button onClick={() => setPendingImport(null)}>
                Cancel import
              </button>
            </div>
          )}
        </section>
        <details className="audio-settings">
          <summary>
            ♫ Audio settings · {audioSettings.rate === 1 ? "Normal" : "Slow"}
          </summary>
          {!audioSupported ? (
            <p className="muted">
              Speech playback is not supported in this browser.
            </p>
          ) : (
            <>
              <div className="audio-controls">
                <label>
                  French voice
                  <select
                    aria-label="French voice"
                    value={audioSettings.voice}
                    disabled={!frenchVoices.length}
                    onChange={(e) =>
                      setAudioSettings((s) => ({ ...s, voice: e.target.value }))
                    }
                  >
                    <option value="">
                      Automatic
                      {automaticVoice
                        ? ` — ${automaticVoice.name}`
                        : " — waiting for French voices"}
                    </option>
                    {audioSettings.voice &&
                      !frenchVoices.some(
                        (v) => v.voiceURI === audioSettings.voice,
                      ) && (
                        <option value={audioSettings.voice}>
                          Saved voice unavailable — using automatic
                        </option>
                      )}
                    {frenchVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} · {v.lang} ·{" "}
                        {v.localService ? "device" : "online"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Playback speed
                  <select
                    aria-label="Playback speed"
                    value={audioSettings.rate}
                    onChange={(e) =>
                      setAudioSettings((s) => ({
                        ...s,
                        rate: Number(e.target.value),
                      }))
                    }
                  >
                    <option value={1}>Normal</option>
                    <option value={0.75}>Slow</option>
                  </select>
                </label>
                <button
                  disabled={!selectedVoice}
                  onClick={() =>
                    speak("Bonjour ! Bienvenue. Comment allez-vous ?")
                  }
                >
                  Preview voice
                </button>
              </div>
              <p className="small muted">
                {frenchVoices.length
                  ? "Choose the voice you find clearest. Device voices can work offline; online voices need a connection."
                  : "No French voices are available yet. Enable a French voice on your device or try another browser."}
              </p>
            </>
          )}
        </details>
        <section className="filters" aria-label="Vocabulary filters">
          <label>
            Theme
            <select
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                reset();
              }}
            >
              <option>All topics</option>
              {themes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Level
            <select
              value={level}
              onChange={(e) => {
                setLevel(e.target.value);
                reset();
              }}
            >
              {["All levels", "A1", "A2", "A1-A2", "B1", "B2"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="search">
            Search words
            <input
              value={search}
              placeholder="French or English…"
              onChange={(e) => {
                setSearch(e.target.value);
                reset();
              }}
            />
          </label>
          <span className="muted match-count">
            {filtered.length.toLocaleString()} entries
          </span>
        </section>
        {screen === "browse" ? (
          <section className="vocabulary">
            <div className="section-bar">
              <h2>{theme === "All topics" ? "All vocabulary" : theme}</h2>
              <button
                className="primary"
                disabled={!filtered.length}
                onClick={() => {
                  setScreen("practice");
                  setMode("read");
                  reset();
                }}
              >
                Read as cards →
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">French</th>
                    <th scope="col">Meaning</th>
                    <th scope="col">Type / level</th>
                    <th scope="col">Examples</th>
                    <th scope="col">
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(page * 30, (page + 1) * 30).map((w) => (
                    <React.Fragment key={w.id}>
                      <tr>
                        <td>
                          <button
                            className="word-button"
                            onClick={() =>
                              setExpanded(expanded === w.id ? null : w.id)
                            }
                            aria-expanded={expanded === w.id}
                            lang="fr"
                          >
                            {w.fr}
                          </button>
                          <button
                            className="audio small-audio"
                            aria-label={`Play ${w.fr}`}
                            onClick={() => speak(w.fr)}
                          >
                            ♫
                          </button>
                        </td>
                        <td>{w.en}</td>
                        <td>
                          <span className="type">{w.pos}</span>
                          <small>
                            {w.level || w.levels?.join(", ") || "—"}
                          </small>
                        </td>
                        <td>
                          {examplesFor(w).length ? (
                            <button
                              className="example-link"
                              aria-label={`View examples for ${w.fr}`}
                              aria-expanded={expanded === w.id}
                              onClick={() =>
                                setExpanded(expanded === w.id ? null : w.id)
                              }
                            >
                              View{" "}
                              {examplesFor(w).length === 1
                                ? "example"
                                : `${examplesFor(w).length} examples`}
                            </button>
                          ) : (
                            <span className="muted small">Not available</span>
                          )}
                        </td>
                        <td>
                          <button
                            aria-label={`Details for ${w.fr}`}
                            aria-expanded={expanded === w.id}
                            onClick={() =>
                              setExpanded(expanded === w.id ? null : w.id)
                            }
                          >
                            {expanded === w.id ? "−" : "+"}
                          </button>
                        </td>
                      </tr>
                      {expanded === w.id && (
                        <tr className="expanded">
                          <td colSpan={5}>{details(w)}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <p className="empty">
                No entries match. Try another theme, level, or search.
              </p>
            )}
            <div className="pagination">
              <span>
                Page {page + 1} of{" "}
                {Math.max(1, Math.ceil(filtered.length / 30))}
              </span>
              <button
                disabled={page === 0}
                onClick={() => {
                  setPage((p) => p - 1);
                  setExpanded(null);
                }}
              >
                Previous
              </button>
              <button
                disabled={(page + 1) * 30 >= filtered.length}
                onClick={() => {
                  setPage((p) => p + 1);
                  setExpanded(null);
                }}
              >
                Next
              </button>
            </div>
          </section>
        ) : (
          <section className="practice">
            <div className="practice-settings">
              <div className="segmented" aria-label="Practice activity">
                {(["read", "typing", "quiz"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    className={mode === m ? "selected" : ""}
                    onClick={() => {
                      setMode(m);
                      reset();
                    }}
                  >
                    {m === "read"
                      ? "Read / Flashcards"
                      : m === "typing"
                        ? "Typing"
                        : "Theme quiz"}
                  </button>
                ))}
              </div>
              <label>
                Session
                <select
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    reset();
                  }}
                >
                  {[10, 20, 30].map((n) => (
                    <option key={n} value={n}>
                      {n} cards
                    </option>
                  ))}
                </select>
              </label>
              {mode === "quiz" && theme === "Verbs" && (
                <label>
                  Tense
                  <select
                    value={tense}
                    onChange={(e) => {
                      setTense(e.target.value);
                      reset();
                    }}
                  >
                    {Object.entries(tenseOptions).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {!session ? (
              <div className="start-panel">
                <span className="large-symbol">
                  {mode === "read" ? "Aa" : mode === "typing" ? "é →" : "?"}
                </span>
                <h2>
                  {mode === "read"
                    ? "Meet your next words."
                    : mode === "typing"
                      ? "Recall it in French."
                      : "A quiz for your theme."}
                </h2>
                <p>
                  {mode === "read"
                    ? "French on the front. Flip for the meaning, pronunciation, and examples."
                    : mode === "typing"
                      ? "Read the English meaning and type the French word. Flip whenever you need a hint."
                      : theme === "Verbs"
                        ? "Practise conjugation forms for your selected tense."
                        : "A mix of French → English and English → French, using only your selected theme."}
                </p>
                {mode === "quiz" && theme === "All topics" && (
                  <p className="hint">
                    Choose one theme above to start a quiz.
                  </p>
                )}
                <button
                  className="primary"
                  disabled={
                    !filtered.length ||
                    (mode === "quiz" && theme === "All topics")
                  }
                  onClick={() => start()}
                >
                  Start{" "}
                  {mode === "read"
                    ? "reading"
                    : mode === "typing"
                      ? "typing"
                      : "quiz"}{" "}
                  →
                </button>
                <p className="small muted">
                  Up to {Math.min(size, filtered.length)} cards · progress saved
                  on this device
                </p>
              </div>
            ) : finished ? (
              <div className="start-panel" role="status">
                <span className="large-symbol">✓</span>
                <h2>Session complete.</h2>
                {session.mode === "read" ? (
                  <p>You explored {session.cards.length} cards.</p>
                ) : (
                  <>
                    <p className="result-score">
                      {score} / {attempts.length}
                    </p>
                    <p>
                      Unaided correct ·{" "}
                      {attempts.filter((a) => a.assisted).length} assisted ·{" "}
                      {attempts.filter((a) => !a.correct).length} incorrect
                    </p>
                  </>
                )}
                <div className="button-row">
                  {misses > 0 && (
                    <button className="primary" onClick={() => start(true)}>
                      Retry mistakes & hints
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSession(null);
                      setFinished(false);
                    }}
                  >
                    New session
                  </button>
                </div>
              </div>
            ) : (
              word && (
                <>
                  <div className="card-progress">
                    <span>
                      {session.theme} ·{" "}
                      {session.mode === "quiz"
                        ? question!.direction
                        : session.mode === "typing"
                          ? "English → French"
                          : "Read & discover"}
                    </span>
                    <strong>
                      Card {index + 1} / {session.cards.length}
                    </strong>
                  </div>
                  <progress value={index} max={session.cards.length} />
                  <div className="card-stack">
                    <article className={`study-card ${flipped ? "back" : ""}`}>
                      <div className="card-top">
                        <span className="eyebrow">
                          {flipped
                            ? "THE FULL PICTURE"
                            : session.mode === "quiz"
                              ? "CHOOSE THE ANSWER"
                              : session.mode === "typing"
                                ? "HOW DO YOU SAY…"
                                : "EN FRANÇAIS"}
                        </span>
                        <button
                          className="audio"
                          aria-label="Play French pronunciation"
                          onClick={() =>
                            speak(
                              word.fr,
                              session.mode === "typing" ||
                                (session.mode === "quiz" &&
                                  question!.direction === "English → French"),
                            )
                          }
                        >
                          ♫
                        </button>
                      </div>
                      {flipped ? (
                        <>
                          <h2 lang="fr">{word.fr}</h2>
                          {details(word)}
                        </>
                      ) : (
                        <>
                          <h2 lang={session.mode === "read" ? "fr" : undefined}>
                            {session.mode === "read"
                              ? word.fr
                              : session.mode === "typing"
                                ? word.en
                                : question!.prompt}
                          </h2>
                          <p className="muted">
                            {word.pos}
                            {word.level ? " · " + word.level : ""}
                          </p>
                          {session.mode === "read" ? (
                            <p className="flip-instruction">
                              Say it out loud. Flip when you’re ready.
                            </p>
                          ) : session.mode === "typing" ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                if (result) next();
                                else submit();
                              }}
                            >
                              <label className="sr-only" htmlFor="answer">
                                French answer
                              </label>
                              <input
                                id="answer"
                                autoFocus
                                autoComplete="off"
                                value={answer}
                                readOnly={!!result}
                                placeholder="Type the French word…"
                                onChange={(e) => setAnswer(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && result) {
                                    e.preventDefault();
                                    next();
                                  }
                                }}
                                className={
                                  result
                                    ? result.correct
                                      ? "correct"
                                      : "incorrect"
                                    : ""
                                }
                              />
                              <button
                                className="primary check"
                                type="submit"
                                disabled={!answer.trim() || !!result}
                              >
                                {result ? "Checked" : "Check answer"}
                              </button>
                            </form>
                          ) : (
                            <div className="options">
                              {question!.options.map((option, i) => (
                                <button
                                  key={option}
                                  disabled={!!result}
                                  className={
                                    result
                                      ? option === question!.answer
                                        ? "right"
                                        : option === answer
                                          ? "wrong"
                                          : ""
                                      : ""
                                  }
                                  onClick={() => submit(option)}
                                >
                                  <span>{i + 1}</span>
                                  {option}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {result && (
                        <div
                          className={`feedback ${result.correct ? "success" : "failure"}`}
                          role="status"
                        >
                          {result.correct
                            ? assisted
                              ? "Correct with a hint."
                              : result.spellingNote
                                ? "Correct—check the spelling below."
                                : "Correct!"
                            : "Keep practising."}
                          <strong lang="fr">
                            {session.mode === "quiz"
                              ? question!.answer
                              : word.fr}
                          </strong>
                          {result.spellingNote && (
                            <span>Remember the accents and punctuation.</span>
                          )}
                        </div>
                      )}
                      {assisted && !result && (
                        <p className="hint" role="status">
                          Hint used · this answer will count as assisted.
                        </p>
                      )}
                      <div className="card-actions">
                        <button
                          onClick={flip}
                          aria-label={
                            flipped ? "Flip to front" : "Flip to back"
                          }
                        >
                          ↻ {flipped ? "Back to question" : "Flip card"}
                        </button>
                        {session.mode === "read" ? (
                          <>
                            <button
                              disabled={index === 0}
                              onClick={() => {
                                setIndex((i) => i - 1);
                                clearCard();
                              }}
                            >
                              Previous
                            </button>
                            <button className="primary" onClick={next}>
                              {index + 1 === session.cards.length
                                ? "Finish"
                                : "Next →"}
                            </button>
                          </>
                        ) : (
                          <button
                            className="primary"
                            disabled={!result}
                            onClick={next}
                          >
                            {index + 1 === session.cards.length
                              ? "Finish"
                              : "Next →"}
                          </button>
                        )}
                      </div>
                    </article>
                  </div>
                  <div className="score-bar">
                    <span>
                      {session.mode === "read"
                        ? "Read at your own pace"
                        : `Score: ${score} / ${attempts.length}`}
                    </span>
                    {session.mode !== "read" && <span>Streak: {streak}</span>}
                    <button
                      className="text-button"
                      onClick={() => setSession(null)}
                    >
                      End session
                    </button>
                  </div>
                </>
              )
            )}
          </section>
        )}
      </main>
      <footer>
        Built for practice, not perfection.{" "}
        <span>English-style pronunciation hints are approximate.</span>
      </footer>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("sw.js", document.baseURI))
      .catch(() => {
        // Online use remains available when private browsing blocks offline storage.
        console.info("Offline caching is unavailable in this browser session.");
      });
  });
}
