# CLAUDE.md – Regeln für dieses Projekt

## Projektziel

**Event Mastermind** ist ein Event-Manager für die Community-Managerin bei Impact Hub.
Er soll später Notion, Eventbrite, Gmail und Google Calendar verbinden und zeigen, ob die Events dem Jahresplan (Modell) entsprechen.

**Aktueller Stand:** klickbarer Prototyp mit erfundenen Daten, gehostet als **Google-Apps-Script-Web-App** (nur mit Impact-Hub-Konto erreichbar). Jeder Push auf `main` wird automatisch veröffentlicht (`.github/workflows/apps-script.yml`, Details in `VEROEFFENTLICHUNG.md`). GitHub Pages ist abgeschaltet.

**Live-Adresse:** https://script.google.com/a/macros/impacthub.net/s/AKfycbxXyZ0SBbdb66GGk5xvwkSBpH5E4tyorEO39IZf_TcGuVETJ-517MTZ9OTGk1xKJABw/exec

Die Person, die hier weiterarbeitet, hat **noch nie programmiert**.

## Regeln (bitte immer einhalten)

1. **Nur synthetische Daten.** Keine echten Namen, E-Mail-Adressen, Telefonnummern oder Teilnehmerdaten, weder in Dateien noch in Commits oder Beispielen. Verantwortliche werden als Rollen angegeben („Community Lead“, „Host-Team“ …).
2. **Daten nur über `data-layer.js`.** `app.js` darf niemals selbst `fetch`, `localStorage` oder eine API aufrufen. Alles läuft über `window.DataLayer`. Neue Datenquellen werden nur in `data-layer.js` eingebaut; die Funktionsnamen dort bleiben gleich.
3. **Oberfläche auf Englisch, Erklärungen auf Deutsch.** Alles, was im Browser sichtbar ist (Menü, Knöpfe, Meldungen, Demo-Inhalte, Vorlagen), ist Englisch. Gespräche mit der Nutzerin, README und Code-Kommentare bleiben Deutsch. Die Feldnamen in den JSON-Dateien bleiben wie bisher (deutsch), damit die Datenschnittstelle stabil bleibt.
4. **Erkläre Änderungen in einfachem Deutsch.** Kurz, ohne Fachjargon. Fachbegriffe, wenn nötig, in einem Halbsatz erklären. Nach jeder Änderung sagen, wie man sie im Browser ansieht.
5. **Kein Build-Tool, kein Framework, kein eigenes Backend.** Nur HTML, CSS und JavaScript. Die Seite muss per Doppelklick auf `index.html` **und** als Apps-Script-Web-App laufen. (`tools/baue-apps-script.py` fügt für Apps Script nur die Dateien zusammen; das macht die GitHub Action automatisch.) Keine Abhängigkeiten von weiteren lokalen Dateien einbauen, die das Bau-Skript nicht kennt.
6. **Nach Änderungen an `data/*.json`** immer `python3 tools/baue-demo-daten.py` ausführen und `data/demo-daten.js` mit committen (die App liest nur diese Datei). `apps-script/Index.html` **nicht** committen, sie steht in `.gitignore` und wird von der Action gebaut. Zum Prüfen lokal `python3 tools/baue-apps-script.py` ausführen.
7. **Design:** warme Impact-Hub-Töne (Terrakotta, Safran, Pflaume, Rosé, Zimt, Creme). **Kein Grün, kein Blau.** Farben nur über die Variablen oben in `style.css` ändern. Eine Farbe pro Kategorie.
8. **Tags nur aus der festen Liste** in `data/tags.json`. Neue Tags dort ergänzen (mit `kurz` und `satz`), nicht frei erfinden.
9. Commits mit verständlichen deutschen Nachrichten. Standard: direkt auf `main`.
10. **Nach jedem Push auf `main`** der Nutzerin die Live-Adresse als Link mitgeben (siehe oben, „Live-Adresse“) und sagen, dass die Änderung nach ca. 1 Minute dort zu sehen ist. Wenn möglich prüfen, ob die Action „Apps Script veröffentlichen“ grün ist.

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
data/demo-daten.js    AUTOMATISCH erzeugt aus den JSON-Dateien (das liest data-layer.js)
tools/erzeuge-demodaten.py   würfelt die Demo-Daten neu (fester Zufall, immer gleiches Ergebnis)
tools/baue-demo-daten.py     kopiert JSON -> data/demo-daten.js
tools/baue-apps-script.py    packt alles in apps-script/Index.html (eine Datei für Apps Script)
apps-script/Code.gs          Apps-Script-"Server": liefert die Seite aus (doGet), Benutzer, Test-Mail, Ask AI (Gemini, Anweisung KI_ANWEISUNG inkl. Format der Änderungs-Vorschläge)
apps-script/Geheim.gs        AUTOMATISCH von der Action erzeugt (nicht im Repo, .gitignore): Gemini-Schlüssel
apps-script/Index.html       AUTOMATISCH erzeugt (nicht im Repo, .gitignore): komplette App in einer Datei
apps-script/appsscript.json  Apps-Script-Einstellungen (Zeitzone, Zugriff "DOMAIN" = nur Impact-Hub-Konten, "USER_ACCESSING" = läuft als die zugreifende Person)
bilder/favicon.svg / .png   Icon im Browser-Tab (SVG für Doppelklick, PNG für Apps Script über raw.githubusercontent.com – klappt nur, solange das Repo öffentlich ist)
.github/workflows/apps-script.yml  veröffentlicht bei jedem Push auf main automatisch zu Apps Script (clasp)
VEROEFFENTLICHUNG.md         Wie die Seite live geht, Fehlerhilfe, Neu-Einrichtung
.gitignore                   hält erzeugte Dateien aus dem Repo
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

`ladeAlles() → {events, templates, model, tags}` · `speichereEvent(event) → event` · `loescheEvent(id)` · `setzeDemoZurueck()` · `hatEigeneAenderungen()` · `ladeEinstellungen()` / `speichereEinstellungen(obj)` · `ladeVerbindungen()` · `ladeBenutzer() → {angemeldet, email, mailMoeglich, kiMoeglich}` · `sendeTestMail(betreff, text) → {an, rest}` · `frageKI(frage, verlauf, kontext) → {antwort, modell}` · Eigenschaft `quelle` (Text für die Fußzeile). Alle Lade-/Speicherfunktionen geben ein Promise zurück.

`ladeBenutzer` liefert zusätzlich `kiMoeglich` (Schlüssel vorhanden). `ladeBenutzer`, `sendeTestMail` und `frageKI` funktionieren nur in der Apps-Script-Version (sie rufen Funktionen aus `apps-script/Code.gs` über `google.script.run` auf). Per Doppelklick gibt es kein Benutzer-Menü, keinen Test-Mail-Knopf und kein „Ask AI“.

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
| `GEMINI_API_KEY` | Gemini-API-Schlüssel (Google AI Studio) für „Ask AI“ | **in Benutzung**: Action schreibt ihn in `apps-script/Geheim.gs` (nur bei Google, nie im Repo/Browser) |

Regeln:
- Secrets erst verwenden, wenn die Nutzerin den jeweiligen Roadmap-Punkt **ausdrücklich** startet.
- Ausnahme: `GEMINI_API_KEY` (für „Ask AI“, von der Nutzerin ausdrücklich gestartet) und die drei Apps-Script-Secrets nutzt die Action `.github/workflows/apps-script.yml` (von der Nutzerin ausdrücklich gewünscht). Sie werden nur dort verwendet.
- Ein Repo-Secret ist nur in **GitHub Actions** lesbar, nie im Browser. Werte niemals in ausgelieferte Dateien (`data-layer.js`, `app.js`, `data/*`), Logs, Commits oder den Chat schreiben.
- Der Eventbrite Private Token hat **alle Rechte** des Kontos (nicht einschränkbar). Darum später nur **Entwürfe** anlegen; Veröffentlichen macht immer ein Mensch.
- Nach einem Umzug zu Google Cloud wandern die Secrets in den **Google Secret Manager** (siehe IT-Abschnitt unten).

## Roadmap für die echten Anbindungen (noch NICHT bauen)

1. **Notion als Datenquelle:** API-Token, zunächst nur lesen. Notion-Datenbank mit denselben Feldern wie `events.json`. Achtung: Ein Token darf nie im Code oder auf GitHub landen, die Abfrage läuft serverseitig in `apps-script/Code.gs` (`UrlFetchApp`), der Token liegt in den **Script Properties**; `data-layer.js` ruft das per `google.script.run` auf.
   - Zugang: Secret `NOTION_PAT` (siehe oben, noch nicht nutzen).
2. **Soll-Ist-Abgleich mit echten Modell-Daten:** Modell (Soll je Monat/Kategorie, Ziel-Auslastung) ebenfalls aus Notion lesen.
3. **Eventbrite:** Entwürfe aus Vorlagen anlegen, Anmeldezahlen zurücklesen (`eventbriteId`). Zugang: Secret `EVENTBRITE_PRIVATE_TOKEN` (noch nicht nutzen). Die Organisations-ID ist nicht geheim und wird per API abgefragt.
4. **Google Calendar und Gmail:** Login mit Google (OAuth), minimale Rechte; Kalendereinträge anlegen (`kalenderId`), Mails nur als **Entwurf**, nie automatisch senden.
5. **Social-Vorschläge und Mail-Intelligenz via Gemini:** Vorlagentexte als Grundlage, KI verfeinert sie; Mensch gibt immer frei.
   - **Schon eingebaut: „Ask AI“** (Knopf unten rechts, Chat-Fenster; an jeder Event-Karte Knopf „Complete/Improve with AI“). `app.js` (`kiKontext`) schickt alle Daten der App plus die eigenen Auswertungen (Soll/Ist je Monat/Quartal, fehlende Infos) über `DataLayer.frageKI` an `frageKI` in `Code.gs`, das Gemini per `UrlFetchApp` fragt (Modelle `KI_MODELLE`: erst `gemini-flash-latest`, bei 403/404/429/5xx automatisch `gemini-flash-lite-latest`; Free Tier von Google AI Studio). Das „Nachdenken“ ist auf `KI_DENK_BUDGET` (1024 Tokens) begrenzt, damit Antworten schneller kommen; lehnt ein Modell das ab (HTTP 400), wird ohne Grenze wiederholt. Dauer und Token-Zahlen stehen im Apps-Script-Editor unter „Ausführungen“, die Sekunden auch unter jeder Antwort. Gemini bekommt keine Werkzeuge zum Ändern.
   - **Änderungs-Vorschläge (von der Nutzerin ausdrücklich gewünscht):** Gemini darf in der Antwort ```` ```change ```` -Blöcke schreiben (JSON: `{id?, grund, felder{titel, zusammenfassung, tags, beschreibung{…}, datum, startzeit, ort, kapazität, status, kategorie, verantwortlich}}`; ohne `id` = neues Event). `app.js` (`kiPruefeVorschlag`) lässt nur erlaubte Felder/Werte durch (Tags nur aus `tags.json`, Datum nur im Modell-Jahr) und zeigt eine Karte „alt → neu“ mit **Apply** / **Edit first** (bzw. „Open as draft“ für neue Events) / **Dismiss**, nach Apply auch **Undo**. Gespeichert wird **nur nach Klick eines Menschen**, über `DataLayer.speichereEvent`. Neue Events werden nie direkt angelegt, nur als Formular-Entwurf geöffnet.
   - Später (nach Roadmap 1) sieht die KI automatisch auch die Notion-Daten, weil sie alles bekommt, was die App geladen hat.
   - **Datenschutz:** Der Schlüssel stammt aus Google AI Studio. Ohne hinterlegte Bezahlung darf Google Eingaben zur Produktverbesserung nutzen → **nur Demo-Daten**. Vor echten Daten: Vertex AI in einem EU-Cloud-Projekt (IT-Leitfaden, Punkt 6).

## Gesprächsleitfaden für die IT

*Zweck: Grundlage für ein Gespräch mit der IT, bevor echte Daten angeschlossen werden. Pro Thema: Stand heute, Vorschlag, offene Fragen.*

### 1. App-Idee, technischer Aufbau und Datenschutz

**Idee:** Ein Event-Manager für das Community-Team. Er zeigt, ob die Events dem Jahresplan entsprechen (Anzahl je Kategorie, Auslastung), warnt bei Abweichungen und hilft bei Titeln, Beschreibungen, Social Posts und Reminder-Mails. Quelle der Wahrheit soll Notion sein; Eventbrite, Gmail und Google Calendar werden angebunden.

**Stand heute:** Klickbarer Prototyp, reines HTML/CSS/JavaScript, **nur erfundene Daten**, gehostet als Google-Apps-Script-Web-App (Login mit Impact-Hub-Google-Konto). Eigene Änderungen bleiben im Browser (localStorage). Keine personenbezogenen Daten.

**Geplanter Aufbau:**
```
Browser (Oberfläche: index.html, app.js)
   │  fragt nur ── data-layer.js (einzige Datenschnittstelle)
   ▼
Backend: Google Apps Script (Code.gs), später ggf. Google Cloud Run in der EU
   │  hält die Zugangsschlüssel (Script Properties bzw. Secret Manager), Login über Google
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
- Hinweis: Alte Links auf das Repo werden von GitHub weitergeleitet. Die Apps-Script-Secrets (`CLASPRC_JSON`, `APPS_SCRIPT_ID`, `APPS_SCRIPT_DEPLOYMENT_ID`) müssen ggf. neu angelegt werden.

**Offene Fragen:** Name der Organisation? Wer bekommt Schreibrechte? Sollen Code-Änderungen geprüft werden, bevor sie live gehen?

### 3. Hosting: Google Apps Script (aktuell) und ggf. später Cloud Run

**Stand heute:** Die App läuft als **Google-Apps-Script-Web-App** im Projekt der Community-Managerin, aber **als die zugreifende Person** (`executeAs: USER_ACCESSING`, jede Person erlaubt beim ersten Öffnen einmal den Zugriff). Zugriff nur mit Impact-Hub-Google-Konto. Veröffentlicht wird automatisch aus GitHub (GitHub Action mit dem Google-Werkzeug `clasp`). GitHub Pages ist abgeschaltet.

**Vorteile:**
- Login und Zugriffsschutz über Google Workspace, ohne eigene Programmierung.
- Zugangsschlüssel können in den **Script Properties** liegen (nicht im Browser).
- Gmail (Entwürfe) und Kalender direkt nutzbar (`GmailApp`, `CalendarApp`); Notion/Eventbrite über `UrlFetchApp`.
- Keine eigene Infrastruktur, keine Kosten.

**Grenzen / zu prüfen:**
- **Region:** Bei Apps Script lässt sich nicht festlegen, dass es nur in der EU läuft; es fällt unter den Google-Workspace-Vertrag → Datenschutz prüfen.
- Das Projekt gehört einem **persönlichen Konto**; der clasp-Schlüssel (`CLASPRC_JSON`) hat weitreichende Rechte → besser ein **Team-/Funktionskonto**.
- Grenzen: max. 6 Minuten pro Aufruf, Tageskontingente (für ein Team ausreichend).

**Falls die IT strengere Vorgaben hat:** Umzug zu **Google Cloud Run** in `europe-west3` (Frankfurt), mit Identity-Aware Proxy (Login), Secret Manager und automatischem Deployment bei Push auf `main`. Die Oberfläche bleibt gleich, nur `data-layer.js` spricht dann mit dem anderen Backend.

**Offene Fragen:** Ist Apps Script für echte Daten freigegeben? Unter welchem Konto soll es laufen? Gibt es Vorgaben zu Region, Logging, Backups?

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
  - **Schon eingebaut (Test):** Knopf „Send test to me“ im Reminder-Dialog. Schickt die Mail per `MailApp` **nur an die angemeldete Person selbst** (Betreff mit „[TEST]“), Absender ist die angemeldete Person selbst (Web-App läuft als zugreifende Person). Keine Empfänger-Adressen eingeben oder speichern; echte Reminder an Teilnehmende erst mit Roadmap-Punkt 4.
- Die Workspace-Admins müssen die App ggf. freigeben (interne App in der Google Admin Console).
- „Mail-Intelligenz“ (Roadmap 5, KI liest Mails) bräuchte **Leserechte auf Postfächer**. Das ist datenschutzrechtlich heikel → eigene Entscheidung mit Datenschutz, ggf. Folgenabschätzung, eher auf ein Funktionspostfach beschränken.
- KI (Gemini): Prüfen, ob über Google Workspace/Vertex AI in der EU mit AVV nutzbar. **Stand heute:** „Ask AI“ nutzt einen Google-AI-Studio-Schlüssel, nur mit Demo-Daten. Für echte Daten: Vertex AI in einem Cloud-Projekt der Firma (Region EU, keine Nutzung zum Training, Login über das Google-Konto statt Schlüssel). In der App ändert sich dafür nur `frageKI` in `Code.gs`.

**Offene Fragen:** Persönliche Postfächer oder ein Team-Postfach? Welcher Kalender? Darf KI Inhalte von Mails sehen?
