# Event Mastermind 🗓️

Ein **klickbarer Prototyp** für die Event-Planung im Community-Team von Impact Hub.
Die Oberfläche ist **auf Englisch**, diese Anleitung auf Deutsch.

**👉 Live (nur mit Impact-Hub-Google-Konto):** https://script.google.com/a/macros/impacthub.net/s/AKfycbxXyZ0SBbdb66GGk5xvwkSBpH5E4tyorEO39IZf_TcGuVETJ-517MTZ9OTGk1xKJABw/exec

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

**Benutzer-Menü (nur online):** Oben rechts der runde Knopf mit deinem Anfangsbuchstaben. Ein Klick zeigt, mit welcher E-Mail-Adresse du angemeldet bist.

**Test-Reminder-Mail (nur online):** In der Wochenansicht bei einem Event auf **„✉️ Reminder email suggestion“** klicken. Betreff und Text kannst du ändern. **„Send test to me“** schickt die Mail **nur an dich selbst** (Betreff beginnt mit „[TEST]“). An Teilnehmende geht nichts.

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

## Wie kommen Änderungen auf die Live-Seite?

Von allein. 🙂 Sobald eine Änderung auf GitHub im Branch `main` landet, lädt GitHub sie automatisch zu **Google Apps Script** hoch. Nach ca. 1 Minute ist sie live (Seite neu laden).
Die Adresse bleibt immer gleich. Wie das genau funktioniert und was bei Problemen hilft: **[VEROEFFENTLICHUNG.md](VEROEFFENTLICHUNG.md)**.

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
data/demo-daten.js  Automatische Kopie der vier JSON-Dateien (das liest die App)
apps-script/        Teile für Google Apps Script (Code.gs = liefert die Seite aus)
.github/workflows/  Der Automatik-Ablauf, der die Seite zu Google hochlädt
tools/              Kleine Hilfsprogramme (Demo-Daten erzeugen, App für Google zusammenbauen)
VEROEFFENTLICHUNG.md  Wie die Seite live geht, Fehlerhilfe, Neu-Einrichtung
CLAUDE.md           Regeln und Fahrplan für die Arbeit mit Claude
```

**Warum gibt es die Daten doppelt?** Die JSON-Dateien sind gut lesbar und zum Bearbeiten da. Der Browser darf sie beim Doppelklick aber aus Sicherheitsgründen nicht lesen, eine `.js`-Datei schon. Deshalb liest die App `data/demo-daten.js`, eine automatische Kopie.
Wenn du eine JSON-Datei änderst, bitte Claude: *„Bitte demo-daten.js neu bauen“*. (Technisch: `python3 tools/baue-demo-daten.py`)

## Wie geht es weiter?

Der Fahrplan für die echten Anbindungen (Notion, Eventbrite, Google, KI) steht in [`CLAUDE.md`](CLAUDE.md).
