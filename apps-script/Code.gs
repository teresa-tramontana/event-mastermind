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
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Event Mastermind")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** Wer ist gerade angemeldet? (nur die E-Mail-Adresse, für das Benutzer-Menü) */
function holeBenutzer() {
  return { email: Session.getActiveUser().getEmail() || "" };
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
