/**
 * Code.gs – der "Server-Teil" der Apps-Script-Version.
 *
 * doGet() wird aufgerufen, wenn jemand die Web-App-Adresse öffnet,
 * und liefert die Seite aus (Datei "Index", erzeugt von tools/baue-apps-script.py).
 *
 * Später (Roadmap) kommen hier die Abrufe von Notion, Eventbrite, Gmail und
 * Kalender hinzu. Zugangsschlüssel liegen dann in den "Script Properties",
 * NIE in dieser Datei.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Event Mastermind")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}
