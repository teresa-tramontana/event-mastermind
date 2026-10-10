# CLAUDE.md – Regeln für dieses Projekt

## Projektziel

**Event Mastermind** ist ein Event-Manager für die Community-Managerin bei Impact Hub.
Er soll später Notion, Eventbrite, Gmail und Google Calendar verbinden und zeigen, ob die Events dem Jahresplan (Modell) entsprechen.

**Aktueller Stand:** klickbarer Prototyp mit erfundenen Daten, gehostet auf GitHub Pages (Branch `main`, Ordner `/`).

Die Person, die hier weiterarbeitet, hat **noch nie programmiert**.

## Regeln (bitte immer einhalten)

1. **Nur synthetische Daten.** Keine echten Namen, E-Mail-Adressen, Telefonnummern oder Teilnehmerdaten, weder in Dateien noch in Commits oder Beispielen. Verantwortliche werden als Rollen angegeben („Community Lead“, „Host-Team“ …).
2. **Daten nur über `data-layer.js`.** `app.js` darf niemals selbst `fetch`, `localStorage` oder eine API aufrufen. Alles läuft über `window.DataLayer`. Neue Datenquellen werden nur in `data-layer.js` eingebaut; die Funktionsnamen dort bleiben gleich.
3. **Erkläre Änderungen in einfachem Deutsch.** Kurz, ohne Fachjargon. Fachbegriffe, wenn nötig, in einem Halbsatz erklären. Nach jeder Änderung sagen, wie man sie im Browser ansieht.
4. **Kein Build-Tool, kein Framework, kein Backend.** Nur HTML, CSS und JavaScript. Die Seite muss per Doppelklick auf `index.html` **und** auf GitHub Pages laufen.
5. **Nach Änderungen an `data/*.json`** immer `python3 tools/baue-demo-daten.py` ausführen, sonst sieht man die Änderung beim Doppelklick nicht.
6. **Design:** warme Impact-Hub-Töne (Terrakotta, Safran, Pflaume, Rosé, Zimt, Creme). **Kein Grün, kein Blau.** Farben nur über die Variablen oben in `style.css` ändern. Eine Farbe pro Kategorie.
7. Commits mit verständlichen deutschen Nachrichten. Standard: direkt auf `main`.

## Dateistruktur

```
index.html            Gerüst: Kopf, Navigation, Werkzeugleiste, Dialog
style.css             Aussehen (Farb-Variablen ganz oben)
app.js                Oberfläche + Auswertung (Ist gegen Soll); Abschnitte 1–6 siehe Kopfkommentar
data-layer.js         Einzige Datenschnittstelle (window.DataLayer)
data/events.json      Events (Quelle)
data/templates.json   Vorlagen je Kategorie (Quelle)
data/model.json       Soll-Modell je Monat/Quartal + Ziel-Auslastung + demoHeute (Quelle)
data/demo-daten.js    AUTOMATISCH erzeugt aus den JSON-Dateien (für Doppelklick/file://)
tools/erzeuge-demodaten.py   würfelt die Demo-Daten neu (fester Zufall, immer gleiches Ergebnis)
tools/baue-demo-daten.py     kopiert JSON -> data/demo-daten.js
.nojekyll             sagt GitHub Pages: Dateien unverändert ausliefern
```

### Datenmodell

- **Event:** `id, titel, datum (JJJJ-MM-TT), startzeit (HH:MM), kategorie, status (Idee | Geplant | Veröffentlicht | Durchgeführt), ort, kapazität, anmeldungen, verantwortlich, eventbriteId, kalenderId, tags[]`, zusätzlich `aufgaben[] ({text, erledigt})` für die Wochenansicht.
- **Vorlage:** `kategorie, titelVorlage, beschreibung, tags[], socialText, mailText`. Platzhalter `{titel} {datum} {uhrzeit} {ort} {kategorie}`.
- **Modell:** `jahr, demoHeute, kategorien[], monate[] ({monat, name, soll{Kategorie: Anzahl}, zielAuslastung})`, `quartale[]` (gleich aufgebaut).

### DataLayer-Schnittstelle (nicht umbenennen)

`ladeAlles() → {events, templates, model}` · `speichereEvent(event) → event` · `loescheEvent(id)` · `setzeDemoZurueck()` · `hatEigeneAenderungen()` · `ladeEinstellungen()` / `speichereEinstellungen(obj)` · `ladeVerbindungen()` · Eigenschaft `quelle` (Text für die Fußzeile). Alle Lade-/Speicherfunktionen geben ein Promise zurück.

### Rechenregeln

- Abweichung Anzahl = (Ist − Soll) / Soll je Kategorie; Soll 0 und Ist > 0 gilt als „nicht eingeplant“.
- Auslastung = Anmeldungen / Kapazität, **nur** für Events mit Status „Durchgeführt“.
- Auffällig, wenn |Abweichung| > Schwelle (Standard 20 %, einstellbar, gespeichert im Browser).
- „Heute“ ist in der Demo fest `model.demoHeute` (2026-10-10), damit die Daten stimmig bleiben.

## Roadmap für die echten Anbindungen (noch NICHT bauen)

1. **Notion als Datenquelle:** API-Token, zunächst nur lesen. Notion-Datenbank mit denselben Feldern wie `events.json`. Achtung: Ein Token darf nie im Code oder auf GitHub landen, eine kleine Server-Funktion (Proxy) ist dafür nötig, weil GitHub Pages nur statische Dateien ausliefert.
2. **Soll-Ist-Abgleich mit echten Modell-Daten:** Modell (Soll je Monat/Kategorie, Ziel-Auslastung) ebenfalls aus Notion lesen.
3. **Eventbrite:** Entwürfe aus Vorlagen anlegen, Anmeldezahlen zurücklesen (`eventbriteId`).
4. **Google Calendar und Gmail:** Login mit Google (OAuth), minimale Rechte; Kalendereinträge anlegen (`kalenderId`), Mails nur als **Entwurf**, nie automatisch senden.
5. **Social-Vorschläge und Mail-Intelligenz via Gemini:** Vorlagentexte als Grundlage, KI verfeinert sie; Mensch gibt immer frei.
