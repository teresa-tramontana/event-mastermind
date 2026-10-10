# Event Mastermind 🗓️

Ein **klickbarer Prototyp** für die Event-Planung im Community-Team von Impact Hub.
Die Oberfläche ist **auf Englisch**, diese Anleitung auf Deutsch.

> ⚠️ **Alle Daten sind erfunden.** Keine echten Namen, keine echten E-Mail-Adressen, keine echten Teilnehmenden.

## Was ist das?

Eine kleine Website, die zeigt, wie ein Event-Manager später aussehen könnte:

| Ansicht | Was du siehst |
|---|---|
| **Year** (Jahr) | 12 Monatskacheln. Je kräftiger die Farbe, desto stärker weicht der Monat vom Plan ab. Klick auf einen Monat öffnet ihn. |
| **Quarter** (Quartal) | Balken pro Kategorie: Wie viele Events gab es (Ist) und wie viele waren geplant (Soll)? |
| **Month** (Monat) | Kalender mit allen Events und einem Hinweis-Kasten, wenn etwas nicht passt. |
| **Week** (Woche) | Jeder Tag mit Details: Status, Summary, Description, Anmeldungen, Aufgaben zum Abhaken, Reminder-Hinweis, Social-Post- und Mail-Vorschlag. |
| **Search** (Suche) | Sucht in Titeln, Summaries, Descriptions, Tags, Orten, Verantwortlichen, Aufgaben und Daten. Filter für Kategorie, Status und „nur kommende“. Das Suchfeld oben ist von jeder Seite aus erreichbar (Tastenkürzel: `/`). |
| **Deviations** (Abweichungen) | Liste aller Monate und Quartale, die vom Plan abweichen. Die Schwelle (Standard 20 %) kannst du mit einem Regler ändern. |
| **Templates** (Vorlagen) | Eine Vorlage pro Kategorie, mit Titel-Ideen, Summary-Vorlage und der Tag-Liste. Mit „New event from template“ entsteht ein Entwurf. |
| **Connections** (Verbindungen) | Platzhalter für Notion, Eventbrite, Gmail und Google Calendar (noch nicht verbunden). |

**Status** eines Events: Idea (Idee) → Planned (geplant) → Published (veröffentlicht) → Done (durchgeführt).

**Tags** (feste Liste): Small groups, Formal, Informal, Peer feedback/exchange, Group work, Coaching/consulting, Workshop, Skillshare, Expert guidance, Practical exercises, Community/Gathering, 1:1 sessions, Guided networking, Matchmaking, Keynote/panel, Collaboration, Unwind. Im Formular klickst du sie einfach an.

**Aufbau der Description** (Event-Beschreibung), immer in diesen Abschnitten:
- *What is it about?*: Inhalt und Stimmung, dazu Setting/Framework (Format, Ort, Größe) und Frequency (wie oft)
- *Why are we doing this?*: was das Event bewirken soll
- *For whom is it?*: Zielgruppe
- *Outcome for members & goals*: was Mitglieder mitnehmen, dazu *What's on the agenda?* (Ablauf mit Uhrzeiten)
- *Ticket info*: Preis, Plätze, Anmeldung
- *Attended by / responsibility (team)*: wer leitet, welche Teams vor Ort sind

**Fehlende Infos werden sofort sichtbar:** Ist ein Abschnitt leer, erscheint ein ⚠-Hinweis: in der Wochenansicht, als ⚠ im Kalender, als Abzeichen in der Suche, als rote Kennzahl in der Jahresansicht und als orangener Zähler im Menü bei „Deviations“. Auf der Seite **Deviations** gibt es eine Liste „Missing event information“ mit allen betroffenen Events (kommende zuerst) und einem Knopf „Fill in“ (ausfüllen). In der Suche filtert „⚠ Missing description info“ genau diese Events.

**Vorschläge für Titel, Description und Summary:** Im Event-Formular gibst du ein Thema ein (z. B. „crowdfunding“), wählst Tags und klickst auf **„✨ Suggest title, description & summary“**. Du bekommst mehrere Titel-Ideen, eine Kurzbeschreibung (Summary) und eine komplette Description mit allen Abschnitten. Mit „Fill missing sections only“ werden nur die leeren Abschnitte gefüllt, was du schon geschrieben hast, bleibt stehen. Mit „Replace all sections“ wird alles ersetzt. Danach kannst du alles frei ändern. Die Vorschläge entstehen aus der Vorlage der Kategorie und aus den gewählten Tags. Es ist noch keine KI dabei, das kommt laut Fahrplan später.

Die 5 Kategorien sind: Workshop, Networking, Talk, Community Lunch, Pitch Night. Jede hat eine eigene Farbe.

**Absichtlich eingebaute Probleme** (damit man sieht, wie Warnungen aussehen):
- Januar bis März (Q1): überbucht, also mehr Anmeldungen als Plätze
- Mai: ein Talk mehr als geplant
- November: gar keine Workshops (geplant waren 2)

## Wie öffne ich es auf meinem Computer?

1. Auf GitHub oben auf den grünen Knopf **„Code“** klicken und dann **„Download ZIP“** wählen.
2. Die ZIP-Datei entpacken (Doppelklick darauf).
3. Im entpackten Ordner auf **`index.html`** doppelklicken. Die Seite öffnet sich im Browser.

Das war's. Du brauchst keine Installation und kein Internet (nur die Schriftart wird aus dem Internet geladen; ohne Internet nimmt der Browser eine ähnliche).

## Kann ich etwas kaputt machen?

Nein. 🙂 Wenn du Events anlegst, änderst oder Aufgaben abhakst, wird das **nur in deinem Browser** gespeichert. Niemand sonst sieht es.
Unten auf der Seite gibt es den Knopf **„Reset demo data“** (Demo-Daten zurücksetzen). Er stellt alles wieder auf den Anfang.

## Wie veröffentliche ich es auf GitHub Pages? (Klick für Klick)

Mit GitHub Pages bekommt die Seite eine Internet-Adresse, die du teilen kannst.

1. Öffne das Projekt auf GitHub: `https://github.com/teresa-tramontana/event-mastermind`
2. Klicke oben rechts im Projekt auf **⚙️ Settings** (Einstellungen).
3. Klicke links in der Liste auf **Pages**.
4. Unter **„Build and deployment“** → **„Source“** wählst du **„Deploy from a branch“**.
5. Unter **„Branch“** wählst du **`main`** und daneben **`/ (root)`**.
6. Klicke auf **Save** (Speichern).
7. Warte 1–2 Minuten und lade die Seite neu. Oben erscheint dann: *„Your site is live at …“*
8. Die Adresse ist: **https://teresa-tramontana.github.io/event-mastermind/**

> 💡 Falls „Pages“ ausgegraut ist: Bei **privaten** Projekten braucht GitHub Pages einen bezahlten GitHub-Plan. Alternativ das Projekt unter Settings → General → ganz unten („Danger Zone“) auf **Public** stellen. Das ist hier unproblematisch, weil alle Daten erfunden sind.

Jede neue Änderung, die auf `main` hochgeladen wird, erscheint nach 1–2 Minuten automatisch auf der Seite.

## Welche Datei macht was?

```
index.html          Das Gerüst der Seite (Kopfzeile, Menü, Platz für Inhalte)
style.css           Das Aussehen: Farben, Schriften, Abstände
app.js              Die Logik: berechnet Abweichungen und zeichnet die Ansichten
data-layer.js       Die EINZIGE Stelle, die Daten lädt und speichert
data/events.json    Die erfundenen Events (61 Stück)
data/templates.json Die Vorlagen pro Kategorie (inkl. Titel-Ideen und Summary-Vorlage)
data/tags.json      Die feste Tag-Liste (mit Stichwort und Satz für die Vorschläge)
data/model.json     Der Plan (Soll): wie viele Events pro Monat/Quartal, Ziel-Auslastung
data/demo-daten.js  Automatische Kopie der vier JSON-Dateien (nötig für den Doppelklick)
tools/              Zwei kleine Hilfsprogramme, um die Demo-Daten neu zu erzeugen
CLAUDE.md           Regeln und Fahrplan für die Arbeit mit Claude
```

**Warum gibt es die Daten doppelt?** Öffnet man die Seite per Doppelklick, darf der Browser aus Sicherheitsgründen keine `.json`-Dateien lesen, eine `.js`-Datei aber schon. Deshalb gibt es `data/demo-daten.js` als Kopie.
Wenn du eine JSON-Datei änderst, bitte Claude: *„Bitte demo-daten.js neu bauen“*. (Technisch: `python3 tools/baue-demo-daten.py`)

## Wie geht es weiter?

Der Fahrplan für die echten Anbindungen (Notion, Eventbrite, Google, KI) steht in [`CLAUDE.md`](CLAUDE.md).
