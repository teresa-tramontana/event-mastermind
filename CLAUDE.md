# CLAUDE.md – Regeln für dieses Projekt

## Projektziel

**Event Mastermind** ist ein Event-Manager für die Community-Managerin bei Impact Hub.
Er soll später Notion, Eventbrite, Gmail und Google Calendar verbinden und zeigen, ob die Events dem Jahresplan (Modell) entsprechen.

**Aktueller Stand:** klickbarer Prototyp mit erfundenen Daten, gehostet auf GitHub Pages (Branch `main`, Ordner `/`).

Die Person, die hier weiterarbeitet, hat **noch nie programmiert**.

## Regeln (bitte immer einhalten)

1. **Nur synthetische Daten.** Keine echten Namen, E-Mail-Adressen, Telefonnummern oder Teilnehmerdaten, weder in Dateien noch in Commits oder Beispielen. Verantwortliche werden als Rollen angegeben („Community Lead“, „Host-Team“ …).
2. **Daten nur über `data-layer.js`.** `app.js` darf niemals selbst `fetch`, `localStorage` oder eine API aufrufen. Alles läuft über `window.DataLayer`. Neue Datenquellen werden nur in `data-layer.js` eingebaut; die Funktionsnamen dort bleiben gleich.
3. **Oberfläche auf Englisch, Erklärungen auf Deutsch.** Alles, was im Browser sichtbar ist (Menü, Knöpfe, Meldungen, Demo-Inhalte, Vorlagen), ist Englisch. Gespräche mit der Nutzerin, README und Code-Kommentare bleiben Deutsch. Die Feldnamen in den JSON-Dateien bleiben wie bisher (deutsch), damit die Datenschnittstelle stabil bleibt.
4. **Erkläre Änderungen in einfachem Deutsch.** Kurz, ohne Fachjargon. Fachbegriffe, wenn nötig, in einem Halbsatz erklären. Nach jeder Änderung sagen, wie man sie im Browser ansieht.
5. **Kein Build-Tool, kein Framework, kein Backend.** Nur HTML, CSS und JavaScript. Die Seite muss per Doppelklick auf `index.html` **und** auf GitHub Pages laufen.
6. **Nach Änderungen an `data/*.json`** immer `python3 tools/baue-demo-daten.py` ausführen, sonst sieht man die Änderung beim Doppelklick nicht. **Nach jeder Änderung** an `index.html`, `style.css`, `app.js`, `data-layer.js` oder den Daten danach `python3 tools/baue-apps-script.py` ausführen (Apps-Script-Version, siehe `ANLEITUNG-APPS-SCRIPT.md`).
7. **Design:** warme Impact-Hub-Töne (Terrakotta, Safran, Pflaume, Rosé, Zimt, Creme). **Kein Grün, kein Blau.** Farben nur über die Variablen oben in `style.css` ändern. Eine Farbe pro Kategorie.
8. **Tags nur aus der festen Liste** in `data/tags.json`. Neue Tags dort ergänzen (mit `kurz` und `satz`), nicht frei erfinden.
9. Commits mit verständlichen deutschen Nachrichten. Standard: direkt auf `main`.

## Dateistruktur

```
index.html            Gerüst: Kopf (mit Suchfeld), Navigation, Werkzeugleiste, Dialog
style.css             Aussehen (Farb-Variablen ganz oben)
app.js                Oberfläche + Auswertung (Ist gegen Soll) + Vorschläge + Suche; Abschnitte 1–7 siehe Kopfkommentar
data-layer.js         Einzige Datenschnittstelle (window.DataLayer)
data/events.json      Events (Quelle)
data/templates.json   Vorlagen je Kategorie (Quelle)
data/tags.json        feste Tag-Liste mit Summary-Stichwort und Description-Satz (Quelle)
data/model.json       Soll-Modell je Monat/Quartal + Ziel-Auslastung + demoHeute (Quelle)
data/demo-daten.js    AUTOMATISCH erzeugt aus den JSON-Dateien (für Doppelklick/file://)
tools/erzeuge-demodaten.py   würfelt die Demo-Daten neu (fester Zufall, immer gleiches Ergebnis)
tools/baue-demo-daten.py     kopiert JSON -> data/demo-daten.js
tools/baue-apps-script.py    packt alles in apps-script/Index.html (eine Datei für Apps Script)
apps-script/Code.gs          Apps-Script-"Server": liefert die Seite aus (doGet)
apps-script/Index.html       AUTOMATISCH erzeugt: komplette App in einer Datei
apps-script/appsscript.json  Apps-Script-Einstellungen (für spätere Automatik mit clasp)
ANLEITUNG-APPS-SCRIPT.md     Klick-für-Klick-Anleitung Apps-Script-Web-App
.github/workflows/apps-script.yml  veröffentlicht bei jedem Push auf main automatisch zu Apps Script
.nojekyll             sagt GitHub Pages: Dateien unverändert ausliefern
```

### Datenmodell

- **Event:** `id, titel, datum (JJJJ-MM-TT), startzeit (HH:MM), kategorie, status (Idea | Planned | Published | Done), ort, kapazität, anmeldungen, verantwortlich, eventbriteId, kalenderId, tags[], zusammenfassung (Summary), beschreibung (Description, gegliedert – siehe unten)`, zusätzlich `aufgaben[] ({text, erledigt})` für die Wochenansicht.
- **Description (`beschreibung`)** ist ein Objekt mit festen Abschnitten (Reihenfolge = Anzeige):
  `worum` (What is it about?) · `rahmen` (Setting/framework) · `haeufigkeit` (Frequency) · `warum` (Why are we doing this? / Outcome) · `zielgruppe` (For whom is it? / Target group) · `ergebnis` (Outcome for members & goals) · `agenda` (What's on the agenda?, eine Zeile pro Punkt) · `tickets` (Ticket info) · `betreuung` (Attended by / responsibility – welches Team leitet/betreut).
  Leere Abschnitte = fehlende Info → werden **überall deutlich markiert** (Woche, Kalender, Suche, Jahres-Kennzahl, Abweichungs-Seite, Navigations-Zähler). Fehlende Infos nie still mit erfundenem Text füllen, sondern sichtbar lassen, bis ein Mensch sie ergänzt oder einen Vorschlag übernimmt.
- **Vorlage:** `kategorie, titelVorlage, titelIdeen[], beschreibung, summaryVorlage, tags[], socialText, mailText`. `beschreibung` hat dieselben Abschnitte wie beim Event; `agenda` ist dort eine Liste `[Minuten ab Start, Programmpunkt]`. Platzhalter: `{thema}` (Thema), `{merkmale}` (Tag-Stichworte), `{ort}`, `{kapazitaet}`, `{verantwortlich}`. In `socialText`/`mailText`: `{titel} {datum} {uhrzeit} {ort} {kategorie} {summary} {tickets} {agenda}`.
- **Tag:** `tag, kurz (Stichwort für die Summary), satz (Satz für die Description)`.
- **Modell:** `jahr, demoHeute, kategorien[], monate[] ({monat, name, soll{Kategorie: Anzahl}, zielAuslastung})`, `quartale[]` (gleich aufgebaut).

### DataLayer-Schnittstelle (nicht umbenennen)

`ladeAlles() → {events, templates, model, tags}` · `speichereEvent(event) → event` · `loescheEvent(id)` · `setzeDemoZurueck()` · `hatEigeneAenderungen()` · `ladeEinstellungen()` / `speichereEinstellungen(obj)` · `ladeVerbindungen()` · Eigenschaft `quelle` (Text für die Fußzeile). Alle Lade-/Speicherfunktionen geben ein Promise zurück.

### Rechenregeln

- Abweichung Anzahl = (Ist − Soll) / Soll je Kategorie; Soll 0 und Ist > 0 gilt als „nicht eingeplant“.
- Auslastung = Anmeldungen / Kapazität, **nur** für Events mit Status „Done“.
- Auffällig, wenn |Abweichung| > Schwelle (Standard 20 %, einstellbar, gespeichert im Browser).
- Suche: jedes eingegebene Wort muss irgendwo im Event vorkommen (Titel, Summary, Description, Tags, Kategorie, Status, Ort, Verantwortlich, Aufgaben, Datum, IDs).
- Fehlende Infos: ein Event gilt als unvollständig, sobald ein Description-Abschnitt leer ist; „keine Description“, wenn alle leer sind.
- Vorschläge: werden ohne KI aus Vorlage + Tags gebaut (`baueVorschlaege` in app.js); später kann Gemini sie verfeinern.
- „Heute“ ist in der Demo fest `model.demoHeute` (2026-10-10), damit die Daten stimmig bleiben.

## Vorbereitete Zugangsdaten (GitHub Repo Secrets) – NOCH NICHT VERWENDEN

| Secret | Wofür | Status |
|---|---|---|
| `NOTION_PAT` | Notion-Zugangsschlüssel (Internal Integration Token) | angelegt, **nicht nutzen** |
| `EVENTBRITE_PRIVATE_TOKEN` | Eventbrite Private Token: der eigentliche Schlüssel für Lesen **und** Schreiben | angelegt, **nicht nutzen** |
| `EVENTBRITE_API_KEY` | Eventbrite API Key, nur für einen Mehrbenutzer-Login (OAuth) nötig, für uns überflüssig | angelegt, wird nicht gebraucht |
| `CLASPRC_JSON` | Google-Login für clasp (Hochladen zu Apps Script); Rechte auf **alle** Apps-Script-Projekte des Kontos | **in Benutzung** durch `.github/workflows/apps-script.yml` |
| `APPS_SCRIPT_ID` | Script-ID des Apps-Script-Projekts (nicht geheim) | in Benutzung (Action) |
| `APPS_SCRIPT_DEPLOYMENT_ID` | ID der Web-App-Bereitstellung (nicht geheim) | in Benutzung (Action) |

Regeln:
- Secrets erst verwenden, wenn die Nutzerin den jeweiligen Roadmap-Punkt **ausdrücklich** startet.
- Ausnahme: Die drei Apps-Script-Secrets nutzt die Action `.github/workflows/apps-script.yml` (von der Nutzerin ausdrücklich gewünscht). Sie werden nur dort verwendet.
- Ein Repo-Secret ist nur in **GitHub Actions** lesbar, nie im Browser. Werte niemals in ausgelieferte Dateien (`data-layer.js`, `app.js`, `data/*`), Logs, Commits oder den Chat schreiben.
- Der Eventbrite Private Token hat **alle Rechte** des Kontos (nicht einschränkbar). Darum später nur **Entwürfe** anlegen; Veröffentlichen macht immer ein Mensch.
- Nach einem Umzug zu Google Cloud wandern die Secrets in den **Google Secret Manager** (siehe IT-Abschnitt unten).

## Roadmap für die echten Anbindungen (noch NICHT bauen)

1. **Notion als Datenquelle:** API-Token, zunächst nur lesen. Notion-Datenbank mit denselben Feldern wie `events.json`. Achtung: Ein Token darf nie im Code oder auf GitHub landen, eine kleine Server-Funktion (Proxy) ist dafür nötig, weil GitHub Pages nur statische Dateien ausliefert.
   - Zugang: Secret `NOTION_PAT` (siehe oben, noch nicht nutzen).
2. **Soll-Ist-Abgleich mit echten Modell-Daten:** Modell (Soll je Monat/Kategorie, Ziel-Auslastung) ebenfalls aus Notion lesen.
3. **Eventbrite:** Entwürfe aus Vorlagen anlegen, Anmeldezahlen zurücklesen (`eventbriteId`). Zugang: Secret `EVENTBRITE_PRIVATE_TOKEN` (noch nicht nutzen). Die Organisations-ID ist nicht geheim und wird per API abgefragt.
4. **Google Calendar und Gmail:** Login mit Google (OAuth), minimale Rechte; Kalendereinträge anlegen (`kalenderId`), Mails nur als **Entwurf**, nie automatisch senden.
5. **Social-Vorschläge und Mail-Intelligenz via Gemini:** Vorlagentexte als Grundlage, KI verfeinert sie; Mensch gibt immer frei.

## Gesprächsleitfaden für die IT

*Zweck: Grundlage für ein Gespräch mit der IT, bevor echte Daten angeschlossen werden. Pro Thema: Stand heute, Vorschlag, offene Fragen.*

### 1. App-Idee, technischer Aufbau und Datenschutz

**Idee:** Ein Event-Manager für das Community-Team. Er zeigt, ob die Events dem Jahresplan entsprechen (Anzahl je Kategorie, Auslastung), warnt bei Abweichungen und hilft bei Titeln, Beschreibungen, Social Posts und Reminder-Mails. Quelle der Wahrheit soll Notion sein; Eventbrite, Gmail und Google Calendar werden angebunden.

**Stand heute:** Klickbarer Prototyp, reines HTML/CSS/JavaScript, **nur erfundene Daten**, gehostet auf GitHub Pages. Eigene Änderungen bleiben im Browser (localStorage). Kein Server, keine Logins, keine personenbezogenen Daten.

**Geplanter Aufbau:**
```
Browser (Oberfläche: index.html, app.js)
   │  fragt nur ── data-layer.js (einzige Datenschnittstelle)
   ▼
kleines Backend in der EU (z. B. Google Cloud Run, Frankfurt)
   │  hält die Zugangsschlüssel (Secret Manager), prüft Login
   ├──► Notion API      (Events, Vorlagen, Soll-Modell)
   ├──► Eventbrite API  (Entwürfe anlegen, Anmeldezahlen)
   ├──► Google Calendar (Termine eintragen)
   ├──► Gmail           (nur Entwürfe)
   └──► Gemini          (Textvorschläge, später)
```
Ein Backend ist nötig, weil Zugangsschlüssel nie im Browser liegen dürfen.

**Datenschutz (DSGVO), Vorschlag:**
- **Datensparsamkeit:** Von Eventbrite nur **Anmeldezahlen** holen, keine Namen/Mails der Teilnehmenden speichern.
- **Rechtsgrundlage & Zweck** für jede Datenart festhalten (Verzeichnis von Verarbeitungstätigkeiten).
- **Auftragsverarbeitung (AVV/DPA)** mit allen Anbietern prüfen: Notion, Eventbrite, Google (Workspace/Cloud), ggf. KI-Anbieter, GitHub.
- **Drittlandtransfer:** Notion und Eventbrite sind US-Anbieter → Datenschutzrahmen (EU-US Data Privacy Framework / Standardvertragsklauseln) prüfen.
- **Zugriff** nur für das Community-Team (Login mit Firmen-Google-Konto).
- Ggf. **Datenschutz-Folgenabschätzung**, falls Gmail-Inhalte von einer KI gelesen werden sollen (siehe Punkt 6).

**Offene Fragen an die IT:** Wer ist Ansprechperson Datenschutz? Gibt es bereits AVVs mit Notion/Eventbrite/Google? Welche Daten dürfen in welche Systeme?

### 2. Git-Repository ins Organisations-Konto übertragen

**Stand heute:** Privates Konto `teresa-tramontana/event-mastermind`.

**Vorschlag:** Auf GitHub → **Settings → General → Danger Zone → Transfer ownership** in die Organisation verschieben (dafür braucht die Person Rechte zum Anlegen von Repos in der Organisation). Danach:
- Repo **privat** halten, Zugriff über ein Team regeln.
- Prüfen, ob die **Secrets** (`NOTION_PAT`, `EVENTBRITE_PRIVATE_TOKEN`, `EVENTBRITE_API_KEY`) nach dem Umzug noch vorhanden sind; sonst neu anlegen, besser direkt als Organisations-Secrets oder gleich im Google Secret Manager.
- Branch-Schutz für `main` (Änderungen nur per Pull Request mit Freigabe) besprechen.
- Hinweis: Alte Links auf das Repo werden von GitHub weitergeleitet; die GitHub-Pages-Adresse ändert sich aber.

**Offene Fragen:** Name der Organisation? Wer bekommt Schreibrechte? Sollen Code-Änderungen geprüft werden, bevor sie live gehen?

### 3. Hosting in der EU statt GitHub Pages

**Warum:** GitHub Pages liegt außerhalb der EU-Kontrolle, ist öffentlich erreichbar (kein Login) und kann keine Zugangsschlüssel geschützt verwenden. Für den Prototyp mit erfundenen Daten ist das ok, **für echte Daten nicht**.

**Vorschlag (Google Cloud, da Google Workspace vermutlich schon im Einsatz ist):**
- **Region:** `europe-west3` (Frankfurt) oder `europe-west1` (Belgien).
- **Cloud Run** für Oberfläche + kleines Backend (ein Container, läuft nur bei Bedarf, geringe Kosten).
- **Identity-Aware Proxy (IAP)** oder Google-Login: nur Konten der eigenen Workspace-Domain kommen rein.
- **Secret Manager** für Notion- und Eventbrite-Schlüssel.
- Deployment automatisch aus dem Git-Repo (z. B. Cloud Build bei jedem Push auf `main`).
- Hinweis: Die Oberfläche bleibt gleich; nur `data-layer.js` spricht dann mit dem Backend statt mit den Demo-Dateien.

**Offene Fragen:** Gibt es ein Google-Cloud-Projekt / Abrechnungskonto? Wer betreut es? Gibt es Vorgaben zu Regionen, Logging, Backups? Alternative Cloud gewünscht?

### 4. Coding-Tool: Antigravity oder Claude Code?

**Stand heute:** Der Prototyp wurde mit **Claude Code** gebaut. Die Regeln für die KI stehen in dieser `CLAUDE.md`.

**Einschätzung:** Technisch ist beides möglich, der Code ist einfaches HTML/CSS/JavaScript ohne besondere Werkzeuge. Bei einem Wechsel zu **Antigravity** (Google) die Regeln aus dieser Datei in dessen Regel-/Anweisungsdatei übernehmen.

**Entscheidungskriterien für die IT:**
- Welche Verträge / Datenschutzbedingungen gelten (Firmenkonto, Datenverarbeitung in der EU, keine Nutzung der Inhalte zum Training)?
- Welches Tool ist in der Organisation bereits freigegeben bzw. lizenziert?
- Zugriff des Tools auf das Repo und die Secrets: so wenig wie möglich (die KI braucht die echten Schlüssel nie).
- Grundregel unabhängig vom Tool: **keine echten personenbezogenen Daten im Repo**.

### 5. Integration Notion und Eventbrite

**Notion (Roadmap 1 + 2):**
- Eine *Internal Integration* in Notion anlegen, **nur die Event-Datenbank** damit teilen, zunächst **nur Leserechte**.
- Datenbank-Felder wie in `data/events.json`; Soll-Modell (`model.json`) ebenfalls als Notion-Datenbank.
- Zugang: `NOTION_PAT` (liegt schon als Secret bereit).

**Eventbrite (Roadmap 3):**
- Zugang: `EVENTBRITE_PRIVATE_TOKEN` hat **volle Kontorechte** (nicht einschränkbar) → Backend legt nur **Entwürfe** an, Veröffentlichen macht ein Mensch.
- Gelesen werden nur **Anmeldezahlen**, keine Teilnehmerdaten.
- Prüfen: Wem gehört das Eventbrite-Konto (persönlich oder Organisation)? Token besser an ein Funktions-/Teamkonto binden statt an eine Person.

**Offene Fragen:** Lesen *und* Schreiben in Notion gewünscht (z. B. Status zurückschreiben)? Wie oft synchronisieren (stündlich, auf Knopfdruck)?

### 6. Integration Gmail und Google Calendar

**Vorschlag:**
- Login über Google (OAuth) mit **minimalen Rechten**:
  - Calendar: nur Termine anlegen/ändern (`calendar.events`), am besten in einem eigenen Team-Kalender.
  - Gmail: nur **Entwürfe erstellen** (`gmail.compose`), **kein Lesen**, kein automatisches Senden.
- Die Workspace-Admins müssen die App ggf. freigeben (interne App in der Google Admin Console).
- „Mail-Intelligenz“ (Roadmap 5, KI liest Mails) bräuchte **Leserechte auf Postfächer**. Das ist datenschutzrechtlich heikel → eigene Entscheidung mit Datenschutz, ggf. Folgenabschätzung, eher auf ein Funktionspostfach beschränken.
- KI (Gemini): Prüfen, ob über Google Workspace/Vertex AI in der EU mit AVV nutzbar.

**Offene Fragen:** Persönliche Postfächer oder ein Team-Postfach? Welcher Kalender? Darf KI Inhalte von Mails sehen?
