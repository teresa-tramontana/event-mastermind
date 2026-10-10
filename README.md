# Event Mastermind 🗓️

Ein **klickbarer Prototyp** für die Event-Planung im Community-Team von Impact Hub.

> ⚠️ **Alle Daten sind erfunden.** Keine echten Namen, keine echten E-Mail-Adressen, keine echten Teilnehmenden.

## Was ist das?

Eine kleine Website, die zeigt, wie ein Event-Manager später aussehen könnte:

| Ansicht | Was du siehst |
|---|---|
| **Jahr** | 12 Monatskacheln. Je kräftiger die Farbe, desto stärker weicht der Monat vom Plan ab. Klick auf einen Monat öffnet ihn. |
| **Quartal** | Balken pro Kategorie: Wie viele Events gab es (Ist) und wie viele waren geplant (Soll)? |
| **Monat** | Kalender mit allen Events und einem Hinweis-Kasten, wenn etwas nicht passt. |
| **Woche** | Jeder Tag mit Details: Status, Anmeldungen, Aufgaben zum Abhaken, Reminder-Hinweis, Social-Post- und Mail-Vorschlag. |
| **Abweichungen** | Liste aller Monate und Quartale, die vom Plan abweichen. Die Schwelle (Standard 20 %) kannst du mit einem Regler ändern. |
| **Vorlagen** | Eine Vorlage pro Kategorie. Mit „Neues Event aus Vorlage“ entsteht ein Entwurf. |
| **Verbindungen** | Platzhalter für Notion, Eventbrite, Gmail und Google Calendar (noch nicht verbunden). |

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
Unten auf der Seite gibt es den Knopf **„Demo-Daten zurücksetzen“**. Er stellt alles wieder auf den Anfang.

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
data/templates.json Die Vorlagen pro Kategorie
data/model.json     Der Plan (Soll): wie viele Events pro Monat/Quartal, Ziel-Auslastung
data/demo-daten.js  Automatische Kopie der drei JSON-Dateien (nötig für den Doppelklick)
tools/              Zwei kleine Hilfsprogramme, um die Demo-Daten neu zu erzeugen
CLAUDE.md           Regeln und Fahrplan für die Arbeit mit Claude
```

**Warum gibt es die Daten doppelt?** Öffnet man die Seite per Doppelklick, darf der Browser aus Sicherheitsgründen keine `.json`-Dateien lesen, eine `.js`-Datei aber schon. Deshalb gibt es `data/demo-daten.js` als Kopie.
Wenn du eine JSON-Datei änderst, bitte Claude: *„Bitte demo-daten.js neu bauen“*. (Technisch: `python3 tools/baue-demo-daten.py`)

## Wie geht es weiter?

Der Fahrplan für die echten Anbindungen (Notion, Eventbrite, Google, KI) steht in [`CLAUDE.md`](CLAUDE.md).
