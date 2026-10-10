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
// Ask AI (Gemini) – NUR LESEND: Gemini bekommt die Daten der App und
// beantwortet Fragen dazu. Es kann nichts anlegen, ändern oder löschen.
// ======================================================================

// Modelle in dieser Reihenfolge probieren (Free Tier von Google AI Studio):
// "…-latest" zeigt immer auf das aktuelle Flash- bzw. Flash-Lite-Modell. Ist das erste gesperrt,
// ausgelastet oder unbekannt, wird automatisch das nächste gefragt.
const KI_MODELLE = ["gemini-flash-latest", "gemini-flash-lite-latest"];

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
  "You can ONLY READ. You cannot create, change, delete, send or publish anything. If the user asks for that,",
  "explain briefly where in the app they can do it themselves (e.g. 'open the event and click Edit').",
  "Answer ONLY from the JSON data below. If something is not in the data, say so – never invent events, numbers or people.",
  "Use the precomputed values in 'auswertungMonate', 'auswertungQuartale' and 'eventsMitFehlendenInfos' for plan deviations",
  "and missing information, so your numbers match the app.",
  "Answer in the language of the question. Be short and concrete: a sentence or a short bullet list.",
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

  const anfrage = JSON.stringify({
    systemInstruction: { parts: [{ text: KI_ANWEISUNG + "\n\nDATA (JSON):\n" + kontextJson }] },
    contents: inhalte,
    generationConfig: { temperature: 0.2 },
  });

  let code = 0;
  let daten = {};
  let modell = "";
  for (let i = 0; i < KI_MODELLE.length; i++) {
    modell = KI_MODELLE[i];
    const antwort = UrlFetchApp.fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + modell + ":generateContent",
      {
        method: "post",
        contentType: "application/json",
        headers: { "x-goog-api-key": schluessel },
        muteHttpExceptions: true,
        payload: anfrage,
      });
    code = antwort.getResponseCode();
    daten = {};
    try { daten = JSON.parse(antwort.getContentText()); } catch (e) { /* bleibt leer */ }
    // 403 = kein Zugriff, 404 = Modell unbekannt, 429 = Kontingent erschöpft, 5xx = überlastet → nächstes Modell
    if (code === 200 || !(code === 403 || code === 404 || code === 429 || code >= 500)) break;
  }
  if (code !== 200) {
    const grund = (daten.error && daten.error.message) || ("HTTP " + code);
    if (code === 429) throw new Error("Too many questions right now – please wait a minute and try again.");
    throw new Error("Gemini error (" + code + "): " + grund);
  }
  const kandidat = (daten.candidates || [])[0];
  const text = kandidat && kandidat.content && (kandidat.content.parts || [])
    .map(function (teil) { return teil.text || ""; }).join("").trim();
  if (!text) throw new Error("Gemini did not return an answer. Please rephrase your question.");
  return { antwort: text, modell: daten.modelVersion || modell };
}
