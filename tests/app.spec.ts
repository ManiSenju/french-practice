import { test, expect } from "@playwright/test";
test("table loads full data, expands details, and filters to 47 verbs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("4,354 entries", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Details for bonjour", exact: true })
    .click();
  await expect(page.getByText("bohn-ZHOOR", { exact: false })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("Verbs");
  await expect(page.getByText("47 entries", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Details for aller", exact: true })
    .click();
  await page.getByText("Conjugation tables", { exact: true }).click();
  await page.getByText("indicatif", { exact: true }).click();
  await expect(page.getByText("suis allée", { exact: true })).toBeVisible();
  await page.getByLabel("Search words").fill("zzzz-no-match");
  await expect(page.getByText(/No entries match/)).toBeVisible();
});
test("read cards flip and reveal their meaning without typing", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Search words").fill("une leçon");
  await page.getByRole("button", { name: "Read as cards" }).click();
  await page.getByRole("button", { name: "Start reading" }).click();
  await expect(page.locator(".study-card h2")).toHaveText("une leçon");
  await expect(page.locator(".study-card input")).toHaveCount(0);
  await page.getByRole("button", { name: "Flip to back" }).click();
  await expect(page.locator(".meaning")).toHaveText("a lesson");
  const exampleTranslation = page.getByText("Thank you for the lesson.", { exact: true });
  await expect(exampleTranslation).not.toBeVisible();
  await page.locator(".examples").getByRole("button", { name: "Show translation", exact: true }).first().click();
  await expect(exampleTranslation).toBeVisible();

  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByText("Session complete.")).toBeVisible();
});
test("typing retains input through flips, counts assistance, and persists progress", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Search words").fill("une leçon");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await page.getByRole("button", { name: "Start typing" }).click();
  await page.getByLabel("French answer").fill("une leçon");
  await page.getByRole("button", { name: "Flip to back" }).click();
  await page.getByRole("button", { name: "Flip to front" }).click();
  await expect(page.getByLabel("French answer")).toHaveValue("une leçon");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Correct with a hint.")).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByText(/1 assisted/)).toBeVisible();
  await page.reload();
  await expect(page.getByText("1 answers practised")).toBeVisible();
});
test("quiz requires theme and delivers four options with feedback", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Theme quiz" }).click();
  await expect(page.getByRole("button", { name: "Start quiz" })).toBeDisabled();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("Food & Drinks");
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.locator(".options button")).toHaveCount(4);
  await page.locator(".options button").first().click();
  await expect(page.locator(".feedback")).toBeVisible();
  await expect(page.locator(".options button.right")).toHaveCount(1);
  await page.getByRole("button", { name: "Next →", exact: true }).click();
  await expect(page.locator(".card-progress")).toContainText(
    "English → French",
  );
});
test("mobile layout has no document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByText("4,354 entries", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Read as cards" }).click();
  await page.getByRole("button", { name: "Start reading" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("verb quiz supports tense selection and retries revealed answers", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("Verbs");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Theme quiz" }).click();
  await page
    .getByRole("combobox", { name: "Tense", exact: true })
    .selectOption("imperatif.present");
  await page.getByRole("button", { name: "Start quiz" }).click();
  await expect(page.locator(".card-progress")).toContainText(
    "Impératif · présent",
  );
  await page.getByRole("button", { name: "Flip to back" }).click();
  await expect(page.getByText(/Hint used/)).toBeVisible();
  await page.getByRole("button", { name: "Flip to front" }).click();
  for (let i = 0; i < 10; i++) {
    await page.locator(".options button").first().click();
    await page.locator(".card-actions .primary").click();
  }
  await expect(page.getByText("Session complete.")).toBeVisible();
  await page.getByRole("button", { name: "Retry mistakes & hints" }).click();
  await expect(page.locator(".options button")).toHaveCount(4);
});

test("capture desktop and mobile screens without runtime errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByText("4,354 entries", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/vocabulary-desktop.png" });
  await page.getByLabel("Search words").fill("une leçon");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await page.getByRole("button", { name: "Start typing" }).click();
  await page.screenshot({ path: "test-results/typing-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Flip to back" }).click();
  await page.screenshot({
    path: "test-results/card-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("production app reloads offline after initial caching", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("4,354 entries", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("4,354 entries", { exact: true })).toBeVisible();
  await context.setOffline(false);
});

test("table exposes vocabulary examples through a labelled column", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("columnheader", { name: "Examples", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search words").fill("une leçon");
  await page
    .getByRole("button", { name: "View examples for une leçon", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Example sentences" }),
  ).toBeVisible();
  await expect(
    page.getByText("Merci pour la leçon.", { exact: true }),
  ).toBeVisible();
  const translation = page.getByText("Thank you for the lesson.", {
    exact: true,
  });
  await expect(translation).not.toBeVisible();
  await page
    .locator(".examples")
    .getByRole("button", { name: "Show translation", exact: true })
    .first()
    .click();
  await expect(translation).toBeVisible();
  await page
    .locator(".examples")
    .getByRole("button", { name: "Hide translation", exact: true })
    .first()
    .click();
  await expect(translation).not.toBeVisible();
});

test("voice picker handles delayed voices, previews settings and remembers them", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        text: string;
        constructor(text: string) {
          this.text = text;
        }
      },
    });
    const speech = new EventTarget();
    const state = window as unknown as {
      audioCalls: { text: string; voice: string; rate: number }[];
      loadTestVoices: () => void;
    };
    state.audioCalls = [];
    let voices: object[] = [];
    Object.assign(speech, {
      getVoices: () => voices,
      cancel: () => {},
      speak: (u: SpeechSynthesisUtterance) =>
        state.audioCalls.push({
          text: u.text,
          voice: u.voice!.voiceURI,
          rate: u.rate,
        }),
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: speech,
      configurable: true,
    });
    state.loadTestVoices = () => {
      voices = [
        {
          name: "Test French",
          voiceURI: "fr-test",
          lang: "fr-FR",
          default: false,
          localService: true,
        },
        {
          name: "Test Canadian",
          voiceURI: "ca-test",
          lang: "fr-CA",
          default: false,
          localService: false,
        },
        {
          name: "English",
          voiceURI: "en-test",
          lang: "en-US",
          default: true,
          localService: true,
        },
      ];
      speech.dispatchEvent(new Event("voiceschanged"));
    };
  });
  await page.goto("/");
  await page.getByText(/Audio settings ·/).click();
  await expect(
    page.getByRole("button", { name: "Preview voice" }),
  ).toBeDisabled();
  await page.evaluate(() =>
    (window as unknown as { loadTestVoices: () => void }).loadTestVoices(),
  );
  await expect(
    page.getByRole("combobox", { name: "French voice" }).locator("option"),
  ).toHaveCount(3);
  await page
    .getByRole("combobox", { name: "French voice" })
    .selectOption("ca-test");
  await page
    .getByRole("combobox", { name: "Playback speed" })
    .selectOption("0.75");
  await page.getByRole("button", { name: "Preview voice" }).click();
  await page.getByRole("button", { name: "Play bonjour", exact: true }).click();
  const calls = await page.evaluate(
    () => (window as unknown as { audioCalls: unknown[] }).audioCalls,
  );
  expect(calls).toEqual([
    {
      text: "Bonjour ! Bienvenue. Comment allez-vous ?",
      voice: "ca-test",
      rate: 0.75,
    },
    { text: "bonjour", voice: "ca-test", rate: 0.75 },
  ]);
  await page.reload();
  await page.evaluate(() =>
    (window as unknown as { loadTestVoices: () => void }).loadTestVoices(),
  );
  await page.getByText(/Audio settings ·/).click();
  await expect(
    page.getByRole("combobox", { name: "French voice" }),
  ).toHaveValue("ca-test");
  await expect(
    page.getByRole("combobox", { name: "Playback speed" }),
  ).toHaveValue("0.75");
});

test("unsupported speech displays a helpful message", async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis;
  });
  await page.goto("/");
  await page.getByText(/Audio settings ·/).click();
  await expect(
    page.getByText("Speech playback is not supported in this browser."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play bonjour", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "French audio is not supported",
  );
});

test("session resumes typed text, and difficult words survive reload and clear on success", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Search words").fill("une leçon");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Typing", exact: true }).click();
  await page.getByRole("button", { name: "Start typing" }).click();
  await page.getByLabel("French answer").fill("unfinished");
  await page.reload();
  await expect(page.getByLabel("French answer")).toHaveValue("unfinished");
  await page.getByRole("button", { name: "Check answer" }).click();
  await page.reload();
  await expect(page.locator(".feedback")).toContainText("Keep practising.");
  await expect(
    page.getByRole("button", { name: "Needs practice (1)", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Needs practice (1)", exact: true })
    .click();
  await page.getByRole("button", { name: "Start typing" }).click();
  await page.getByLabel("French answer").fill("une leçon");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(
    page.getByRole("button", { name: "Needs practice (0) · On", exact: true }),
  ).toBeVisible();
});

test("backup export/import restores progress; invalid input leaves progress intact", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Details for bonjour", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add to Needs practice", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export progress", exact: true })
    .click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page
    .getByRole("button", { name: "Remove from Needs practice", exact: true })
    .click();
  await page.getByLabel("Import progress").setInputFiles(path!);
  await expect(page.getByText(/Replace this device’s progress/)).toBeVisible();
  await page
    .getByRole("button", { name: "Replace progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Needs practice (1)", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Import progress").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":55}'),
  });
  await expect(page.getByRole("status")).toContainText("Invalid backup");
  await expect(
    page.getByRole("button", { name: "Needs practice (1)", exact: true }),
  ).toBeVisible();
});

test("quiz resume preserves choices and does not count an answered question twice", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("Food & Drinks");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Theme quiz" }).click();
  await page.getByRole("button", { name: "Start quiz" }).click();
  const prompt = await page.locator(".study-card h2").textContent();
  const choices = await page.locator(".options button").allTextContents();
  await page.locator(".options button").first().click();
  const feedback = await page.locator(".feedback").textContent();
  await page.reload();
  await expect(page.locator(".study-card h2")).toHaveText(prompt!);
  expect(await page.locator(".options button").allTextContents()).toEqual(
    choices,
  );
  await expect(page.locator(".feedback")).toHaveText(feedback!);
  await expect(page.locator(".options button").first()).toBeDisabled();
  await expect(page.getByText("1 answers practised")).toBeVisible();
  await page.locator(".card-actions .primary").click();
  await expect(page.locator(".card-progress")).toContainText("Card 2 /");
});

test("newly filled examples appear with their translation and provenance", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Search words").fill("une consonne");
  await page
    .getByRole("button", {
      name: "View examples for une consonne",
      exact: true,
    })
    .click();
  await expect(page.locator(".examples strong").first()).not.toBeEmpty();
  await expect(page.locator(".examples")).toContainText(
    "Original practice example",
  );
  await expect(page.locator(".example-translation")).toHaveCount(0);
  await page
    .locator(".examples")
    .getByRole("button", { name: "Show translation", exact: true })
    .first()
    .click();
  await expect(page.locator(".example-translation")).toContainText("consonant");
});
