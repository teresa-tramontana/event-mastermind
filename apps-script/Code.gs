/**
 * Code.gs – der "Server-Teil" der Apps-Script-Version.
 *
 * doGet() wird aufgerufen, wenn jemand die Web-App-Adresse öffnet,
 * und liefert die Seite aus (Datei "Index", erzeugt von tools/baue-apps-script.py).
 *
 * Die anderen Funktionen ruft data-layer.js über google.script.run auf.
 * Zugangsschlüssel (später Notion, Eventbrite) liegen in den "Script Properties",
 * NIE in dieser Datei.
 */
// Icon im Browser-Tab. Apps Script braucht dafür eine Internet-Adresse (PNG aus dem öffentlichen Repo).
const FAVICON_URL =
  "https://raw.githubusercontent.com/teresa-tramontana/event-mastermind/main/bilder/favicon.png";

function doGet() {
  const seite = HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Event Mastermind")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
  try {
    seite.setFaviconUrl(FAVICON_URL);
  } catch (fehler) {
    // Ohne Icon weitermachen – die Seite soll deswegen nie ausfallen
  }
  return seite;
}

/** Wer ist gerade angemeldet? (E-Mail für das Benutzer-Menü) und ist die KI eingerichtet? */
function holeBenutzer() {
  return { email: Session.getActiveUser().getEmail() || "", kiBereit: !!kiSchluessel_() };
}

/**
 * Test-Reminder: schickt die Mail NUR an die Person, die gerade angemeldet ist.
 * Die Web-App läuft "als die Person, die sie benutzt" (appsscript.json: USER_ACCESSING),
 * darum ist Absender immer die angemeldete Person selbst.
 * Echte Reminder an Teilnehmende gibt es (noch) nicht – laut Roadmap später nur als Entwurf.
 */
function sendeTestReminder(betreff, text) {
  const an = Session.getActiveUser().getEmail();
  if (!an) throw new Error("Could not determine your email address.");
  betreff = String(betreff || "").trim().slice(0, 200) || "Reminder";
  text = String(text || "").slice(0, 20000);
  if (!text.trim()) throw new Error("The email text is empty.");
  MailApp.sendEmail({
    to: an,
    subject: "[TEST] " + betreff,
    body: text,
    name: "Event Mastermind (test)",
  });
  return { an: an, rest: MailApp.getRemainingDailyQuota() };
}

// ======================================================================
// Ask AI (Gemini): Gemini bekommt die Daten der App und beantwortet Fragen dazu.
// Es kann selbst NICHTS speichern. Es darf aber Änderungen VORSCHLAGEN (als
// "change"-Block im Text). Die App zeigt den Vorschlag an, und erst wenn ein
// Mensch auf "Apply" klickt, wird gespeichert (über data-layer.js).
// ======================================================================

// Modelle in dieser Reihenfolge probieren (Free Tier von Google AI Studio):
// "…-latest" zeigt immer auf das aktuelle Flash- bzw. Flash-Lite-Modell. Ist das erste gesperrt,
// ausgelastet oder unbekannt, wird automatisch das nächste gefragt.
const KI_MODELLE = ["gemini-flash-latest", "gemini-flash-lite-latest"];
// "Nachdenken" vor der Antwort ausschalten – das kostet sonst die meiste Zeit.
// Gemini 3.x versteht thinkingLevel, ältere Modelle (2.5) thinkingBudget. Lehnt ein Modell
// eine Einstellung ab (HTTP 400), wird die nächste probiert, zuletzt ganz ohne.
const KI_DENK_EINSTELLUNGEN = [{ thinkingLevel: "minimal" }, { thinkingBudget: 0 }, null];

/**
 * Der Schlüssel kommt aus dem GitHub-Secret GEMINI_API_KEY. Die GitHub Action schreibt ihn
 * beim Hochladen in die Datei Geheim.gs (nur bei Google, nie im Repo, nie im Browser).
 * Ersatzweise: Script Property "GEMINI_API_KEY" im Apps-Script-Projekt.
 * Der Unterstrich am Ende sorgt dafür, dass der Browser diese Funktion nicht aufrufen kann.
 */
function kiSchluessel_() {
  if (typeof GEMINI_API_KEY_GEHEIM !== "undefined" && GEMINI_API_KEY_GEHEIM) return GEMINI_API_KEY_GEHEIM;
  return PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "";
}

const KI_ANWEISUNG = [
  "You are the assistant inside 'Event Mastermind', the event planning app of the Impact Hub community team.",
  "You cannot save, send or publish anything yourself. But you CAN SUGGEST changes to events (title, summary, tags,",
  "description sections incl. ticket info, date, time, place, capacity, status) and new events. The app shows each",
  "suggestion with an 'Apply' button – a human always reviews and decides. Never claim that you changed something.",
  "",
  "HOW TO SUGGEST: write one fenced block per event, exactly like this (valid JSON, double quotes):",
  "```change",
  '{"id": "evt-012", "grund": "Fills the 3 missing description sections", "felder": {"titel": "…", "zusammenfassung": "…",',
  ' "tags": ["…"], "beschreibung": {"worum": "…", "tickets": "…"}}}',
  "```",
  "- 'id' = id of an existing event. For a NEW event leave out 'id' and give at least titel, datum (YYYY-MM-DD),",
  "  startzeit (HH:MM) and kategorie in 'felder'.",
  "- Only include the fields you want to change. Allowed fields: titel, zusammenfassung, tags, beschreibung, datum,",
  "  startzeit, ort, kapazität, status, kategorie, verantwortlich.",
  "- 'beschreibung' sections: worum, rahmen, haeufigkeit, warum, zielgruppe, ergebnis, agenda (one line per item,",
  "  e.g. '18:00 – Welcome'), tickets, betreuung. Only include the sections you change.",
  "- tags: the COMPLETE new tag list (it replaces the old one), ONLY tags from the 'tags' list in the data (exact",
  "  spelling). kategorie: Community Monthlies, Community Weeklies, Academy, Drops of Inspiration, Winedowns,",
  "  Town Hall, Group-Specific, Collaboration, Idea Starter Pack, Cross-Community, Community Quarterlies,",
  "  Partner Deliverable, Community Summer, Community, HiveMind, Morning Spark. status: Idea, Planned, Published, Done.",
  "- verantwortlich and betreuung are ROLES or teams (e.g. 'Community Lead', 'Host team'), never names of people.",
  "- Write texts in English, in the style of the category template ('vorlagen'). Use the event's own data, the",
  "  template of its category (replace placeholders like {thema}, {ort}, {kapazitaet}) and the 'satz' of its tags.",
  "- Never invent facts (prices, speakers, partners, numbers). If a fact is not in the event or its template,",
  "  leave that section out and say in one sentence what a human still has to add.",
  "- Before the block(s), write one short sentence what you suggest. Max. 10 blocks per answer.",
  "Only suggest changes when the user asks for them (e.g. 'fill in', 'write', 'improve', 'create', 'change').",
  "",
  "For questions: answer ONLY from the JSON data below. If something is not in the data, say so – never invent",
  "events, numbers or people.",
  "Use the precomputed values in 'auswertungMonate', 'auswertungQuartale', 'auslastungJeKategorie',",
  "'eventsMitFehlendenInfos', 'eventsMitWenigAnmeldungen' (sign-ups below 'mindestAnmeldungProzent') and",
  "'terminKonflikte' (weeks/days with too many events) for plan deviations, occupancy, sign-up warnings,",
  "scheduling and missing information, so your numbers match the app. The plan (target) is a blueprint:",
  "'modell.basisMonat' applies to every month (with 'ausnahmen' per month), 'modell.basisQuartal' is added per quarter;",
  "the resulting targets are in 'blueprintSollMonate' and 'blueprintSollQuartale'.",
  "Never calculate these numbers yourself. Keep answers short: no long lists unless the user asks for details.",
  "Answer in the language of the question (texts inside change blocks are always English). Be short and concrete.",
  "Mention dates as e.g. 'Tue, 14 Oct' and refer to events by their title.",
  "All data is fictional demo data.",
  "",
  "Glossary of German field names: titel=title, datum=date, startzeit=start time, kategorie=category, ort=place,",
  "kapazität=capacity, anmeldungen=registrations, verantwortlich=responsible role, zusammenfassung=summary,",
  "beschreibung=description sections (worum=what is it about, rahmen=setting, haeufigkeit=frequency, warum=why,",
  "zielgruppe=target group, ergebnis=outcome, agenda, tickets, betreuung=attended by), aufgaben=tasks (erledigt=done),",
  "soll=planned/target number, ist=actual number, zielAuslastung=target occupancy in %, heute=today's date in the demo.",
  "Occupancy only counts events with status Done.",
].join("\n");

/**
 * Frage an Gemini stellen.
 * frage: Text der Frage · verlauf: bisherige Nachrichten [{rolle: "user"|"model", text}]
 * kontextJson: alle Daten der App als JSON-Text (kommt aus dem Browser, inkl. eigener Änderungen)
 */
function frageKI(frage, verlauf, kontextJson) {
  const schluessel = kiSchluessel_();
  if (!schluessel) throw new Error("The AI is not set up yet (GEMINI_API_KEY is missing).");
  frage = String(frage || "").trim().slice(0, 2000);
  if (!frage) throw new Error("Please type a question.");
  kontextJson = String(kontextJson || "").slice(0, 600000);

  const inhalte = (Array.isArray(verlauf) ? verlauf : []).slice(-12)
    .filter(function (n) { return n && (n.rolle === "user" || n.rolle === "model") && n.text; })
    .map(function (n) { return { role: n.rolle, parts: [{ text: String(n.text).slice(0, 8000) }] }; });
  inhalte.push({ role: "user", parts: [{ text: frage }] });

  // denken = Eintrag aus KI_DENK_EINSTELLUNGEN (null = Gemini entscheidet selbst)
  const baueAnfrage = function (denken) {
    const einstellungen = { maxOutputTokens: 16384 };
    if (denken) einstellungen.thinkingConfig = denken;
    return JSON.stringify({
      systemInstruction: { parts: [{ text: KI_ANWEISUNG + "\n\nDATA (JSON):\n" + kontextJson }] },
      contents: inhalte,
      // KEINE eigene Temperatur setzen: Google warnt, dass Gemini 3.x bei Werten unter 1.0
      // in Endlosschleifen geraten kann. maxOutputTokens begrenzt eine zu lange Antwort.
      generationConfig: einstellungen,
    });
  };
  const start = Date.now();

  let code = 0;
  let daten = {};
  let modell = "";
  for (let i = 0; i < KI_MODELLE.length; i++) {
    modell = KI_MODELLE[i];
    let ergebnis;
    for (let d = 0; d < KI_DENK_EINSTELLUNGEN.length; d++) {
      ergebnis = sendeAnGemini_(modell, baueAnfrage(KI_DENK_EINSTELLUNGEN[d]), schluessel, start);
      // 400 = Anfrage abgelehnt (Modell kennt diese Denk-Einstellung nicht) → nächste probieren
      if (ergebnis.code !== 400) break;
    }
    code = ergebnis.code;
    daten = ergebnis.daten;
    // 403 = kein Zugriff, 404 = Modell unbekannt, 429 = Kontingent erschöpft, 503 = überlastet → nächstes Modell
    if (code === 200 || !(code === 403 || code === 404 || code === 429 || code === 503)) break;
  }
  if (code !== 200) {
    const grund = (daten.error && daten.error.message) || ("HTTP " + code);
    if (code === 429) throw new Error("Too many questions right now – please wait a minute and try again.");
    throw new Error("Gemini error (" + code + "): " + grund);
  }
  const kandidat = (daten.candidates || [])[0];
  const text = kandidat && kandidat.content && (kandidat.content.parts || [])
    .map(function (teil) { return teil.text || ""; }).join("").trim();
  if (!text) {
    const grund = (kandidat && kandidat.finishReason) || "unknown";
    console.warn("Ask AI: leere Antwort, finishReason " + grund);
    throw new Error("Gemini did not return an answer (" + grund + "). Please rephrase your question.");
  }
  return { antwort: text, modell: daten.modelVersion || modell, sekunden: Math.round((Date.now() - start) / 1000) };
}

/** Eine Anfrage an ein Gemini-Modell schicken → { code, daten }. Protokolliert Dauer und Token-Zahlen. */
function sendeAnGemini_(modell, anfrage, schluessel, start) {
  let antwort;
  try {
    antwort = UrlFetchApp.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + modell + ":generateContent",
      {
        method: "post",
        contentType: "application/json",
        headers: { "x-goog-api-key": schluessel },
        muteHttpExceptions: true,
        payload: anfrage,
      });
  } catch (fehler) {
    // z. B. Zeitüberschreitung: Google wartet höchstens ca. 60 Sekunden auf Gemini
    console.warn("Ask AI: " + modell + " ohne Antwort nach " + (Date.now() - start) + " ms: " + fehler);
    throw new Error("Gemini took too long to answer. Please try again or ask a shorter question.");
  }
  const code = antwort.getResponseCode();
  let daten = {};
  try { daten = JSON.parse(antwort.getContentText()); } catch (e) { /* bleibt leer */ }
  // Protokoll (sichtbar im Apps-Script-Editor unter "Ausführungen"), ohne Schlüssel und ohne Inhalte.
  // Daran sieht man, wo die Zeit hingeht: viel "Nachdenken" oder eine lange Antwort.
  const n = daten.usageMetadata || {};
  console.log("Ask AI: " + modell + " → HTTP " + code + " nach " + (Date.now() - start) + " ms" +
    " · Tokens: Eingabe " + (n.promptTokenCount || 0) + " (Cache " + (n.cachedContentTokenCount || 0) + ")" +
    ", Nachdenken " + (n.thoughtsTokenCount || 0) + ", Antwort " + (n.candidatesTokenCount || 0));
  return { code: code, daten: daten };
}
