# Event Mastermind als Google-Apps-Script-Web-App 🚀

Diese Anleitung zeigt Klick für Klick, wie du die Demo als **Google-Apps-Script-Web-App** veröffentlichst.
Das ist eine Webseite, die auf Google-Servern läuft und nur von Leuten mit Impact-Hub-Google-Konto geöffnet werden kann (wenn du das so einstellst).

> ⚠️ Auch hier gilt: **nur erfundene Daten.** Die Web-App zeigt dieselbe Demo wie GitHub Pages.
> Notion, Eventbrite usw. sind noch **nicht** angeschlossen, und es werden **keine** Zugangsschlüssel gebraucht.

**Zeitbedarf:** ca. 15 Minuten beim ersten Mal, danach 2 Minuten pro Update.

---

## Teil A: Einmalig einrichten (von Hand)

### Was du brauchst

Im Ordner [`apps-script/`](apps-script/) dieses Repos liegen drei Dateien:

| Datei | Was sie macht | Brauchst du für Teil A? |
|---|---|---|
| `Code.gs` | Der „Server-Teil“: liefert die Seite aus, wenn jemand die Adresse öffnet. | ✅ ja |
| `Index.html` | Die **komplette** App in einer einzigen Datei (Aussehen, Daten, Oberfläche). | ✅ ja |
| `appsscript.json` | Einstellungen; nur für die Automatik in Teil C. | ❌ nein |

> 💡 `Index.html` ist **automatisch erzeugt**. Nicht von Hand ändern, sonst geht die Änderung beim nächsten Bauen verloren.

### Schritt 1: Prüfen, ob Apps Script erlaubt ist

1. Öffne [script.google.com](https://script.google.com) mit deinem **Impact-Hub-Google-Konto**.
2. Siehst du eine Fehlermeldung wie „Apps Script ist deaktiviert“? Dann hat die IT es gesperrt → bei der IT nachfragen. Sonst weiter.

### Schritt 2: Neues Projekt anlegen

1. Links oben auf **„Neues Projekt“** (bzw. „New project“) klicken.
2. Oben links auf **„Unbenanntes Projekt“** klicken und den Namen **`Event Mastermind`** eintippen → **Umbenennen**.

### Schritt 3: `Code.gs` einfügen

1. Links unter **„Dateien“** ist schon eine Datei `Code.gs` geöffnet. Darin steht `function myFunction() { … }`.
2. Alles darin markieren (Strg+A bzw. ⌘+A) und löschen.
3. Auf GitHub die Datei [`apps-script/Code.gs`](apps-script/Code.gs) öffnen.
4. Rechts oben über dem Code auf das **Kopieren-Symbol** (zwei Kästchen, „Copy raw file“) klicken.
5. Zurück in Apps Script: einfügen (Strg+V bzw. ⌘+V).
6. Speichern: **Strg+S** bzw. **⌘+S** (oder das Disketten-Symbol).

### Schritt 4: `Index.html` anlegen und einfügen

1. Links neben **„Dateien“** auf das **＋** klicken → **„HTML“** wählen.
2. Als Namen genau **`Index`** eintippen (großes I, **ohne** „.html“, das ergänzt Google selbst) → Enter.
3. Den vorhandenen Inhalt der neuen Datei komplett löschen.
4. Auf GitHub [`apps-script/Index.html`](apps-script/Index.html) öffnen und wieder auf **„Copy raw file“** klicken.
   (Die Datei ist groß, GitHub zeigt evtl. „View raw“ statt des Inhalts. Der Kopieren-Knopf funktioniert trotzdem.)
5. In Apps Script einfügen und **speichern**.

> ✅ Kontrolle: Links stehen jetzt genau zwei Dateien: `Code.gs` und `Index.html`.

### Schritt 5: Einmal testen

1. Oben rechts auf **„Bereitstellen“ → „Bereitstellungen testen“** („Deploy → Test deployments“) klicken.
2. Unter **„Web-App“** auf den Link (endet auf `/dev`) klicken.
3. Die App öffnet sich in einem neuen Tab. Du siehst die Jahresansicht „Year 2026“. 🎉

> Der `/dev`-Link funktioniert **nur für dich** und zeigt immer den letzten gespeicherten Stand. Gut zum Ausprobieren.

### Schritt 6: Richtig veröffentlichen

1. **„Bereitstellen“ → „Neue Bereitstellung“** („Deploy → New deployment“).
2. Links neben „Typ auswählen“ auf das **Zahnrad ⚙** → **„Web-App“**.
3. Ausfüllen:
   - **Beschreibung:** z. B. `Demo v1`
   - **Ausführen als:** **„Ich“** (dein Konto)
   - **Wer hat Zugriff:** **„Jeder in Impact Hub“** (bzw. „Anyone within …“). Nur Leute mit Firmenkonto kommen rein.
     Zum Üben geht auch **„Nur ich“**.
     ❌ **Nicht** „Jeder“ wählen. Das wäre öffentlich wie GitHub Pages.
4. **„Bereitstellen“** klicken.
5. Beim ersten Mal fragt Google nach **Berechtigungen** („Zugriff autorisieren“) → dein Konto wählen → erlauben.
   (Die Demo greift auf nichts zu. Google fragt trotzdem einmal nach.)
6. Du bekommst eine **Web-App-URL** (endet auf `/exec`). **Das ist die Adresse für dein Team.** Kopieren und z. B. als Lesezeichen speichern.

---

## Teil B: Updates einspielen (wenn sich die App geändert hat)

Wenn Claude (oder jemand anderes) die App geändert hat, steht der neue Stand auf GitHub in `apps-script/Index.html`.

1. Auf GitHub `apps-script/Index.html` öffnen → **„Copy raw file“**.
2. In Apps Script die Datei `Index.html` öffnen, alles löschen, einfügen, **speichern**.
3. (Nur wenn sich `Code.gs` geändert hat: dasselbe für `Code.gs`.)
4. **„Bereitstellen“ → „Bereitstellungen verwalten“** („Manage deployments“).
5. Deine Bereitstellung auswählen → **Stift-Symbol ✏ (Bearbeiten)**.
6. Bei **„Version“** → **„Neue Version“** wählen → **„Bereitstellen“**.

> 💡 So **bleibt die Adresse (`/exec`) gleich.** Würdest du stattdessen „Neue Bereitstellung“ wählen, gäbe es eine neue Adresse.

---

## Teil C (optional, später): Automatisch aus GitHub veröffentlichen

Statt Teil B von Hand zu machen, kann GitHub das bei jeder Änderung selbst erledigen. Dafür gibt es das Google-Werkzeug **clasp** („Command Line Apps Script Projects“, ein Programm zum Hochladen von Apps-Script-Code).

**So würde es ablaufen:**
1. Einmalig auf einem Computer clasp installieren und sich mit dem Google-Konto anmelden. Dabei entsteht eine Datei mit einem Zugangsschlüssel (`.clasprc.json`).
2. Den Inhalt dieser Datei als **Repo-Secret** auf GitHub ablegen (z. B. `CLASPRC_JSON`), dazu die **Script-ID** des Projekts (steht in Apps Script unter ⚙ „Projekteinstellungen“; sie ist nicht geheim).
3. Eine **GitHub Action** (ein kleiner Automatik-Ablauf) lädt bei jedem Push auf `main` den Ordner `apps-script/` hoch und erzeugt eine neue Version.

**Warum noch nicht?**
- Der Schlüssel in `.clasprc.json` darf **alles** mit den Apps-Script-Projekten deines Kontos machen. Das gehört vorher ins Gespräch mit der IT (siehe `CLAUDE.md`, Gesprächsleitfaden).
- Besser wäre ein **Team- oder Funktionskonto** statt deines persönlichen Kontos.
- Am Anfang sind die Updates selten, Teil B reicht völlig.

Sag Claude Bescheid, wenn du Teil C angehen willst. Dann wird das Schritt für Schritt eingerichtet.

---

## Häufige Fragen

**Bleiben meine Änderungen gespeichert?**
Ja, wie bei GitHub Pages: nur in **deinem Browser**. Andere sehen sie nicht. „Reset demo data“ setzt alles zurück.

**Oben steht ein grauer Balken „Diese Anwendung wurde von einem Google Apps Script-Nutzer erstellt“.**
Das blendet Google ein, wenn jemand ohne Firmenkonto die Seite öffnet. Mit Firmenkonto und „Jeder in Impact Hub“ erscheint er normalerweise nicht.

**Die Seite lädt langsamer als auf GitHub Pages.**
Normal. Google startet die App bei jedem Aufruf kurz. Ein bis drei Sekunden sind üblich.

**„Seite nicht gefunden“ oder „Script function not found: doGet“**
`Code.gs` wurde nicht richtig eingefügt oder nicht gespeichert → Schritt 3 wiederholen.

**„Keine HTML-Datei mit dem Namen Index gefunden“**
Die HTML-Datei heißt anders (z. B. `index` klein oder `Index.html.html`) → links umbenennen in `Index`.

**Ich sehe noch die alte Version.**
Nach dem Einfügen speichern **und** eine neue Version bereitstellen (Teil B, Schritte 4–6). Danach die Seite neu laden.

---

## Für Claude / Technik-Notizen

- `apps-script/Index.html` wird mit `python3 tools/baue-apps-script.py` erzeugt. Es packt `index.html`, `style.css`, `data/demo-daten.js`, `data-layer.js` und `app.js` in eine Datei.
- Reihenfolge nach Änderungen an Daten: erst `python3 tools/baue-demo-daten.py`, dann `python3 tools/baue-apps-script.py`.
- Das Skript setzt `window.APPS_SCRIPT = true`. `data-layer.js` versucht dann keine JSON-Dateien zu laden, sondern nimmt direkt die Demo-Daten.
- Später (Roadmap): Echte Daten holt `Code.gs` serverseitig (`UrlFetchApp` für Notion/Eventbrite, `GmailApp`/`CalendarApp` für Google). `data-layer.js` ruft das über `google.script.run` auf. Schlüssel liegen in den **Script Properties**, nie im Code.
