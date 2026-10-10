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

## Teil B: Updates von Hand einspielen (nur ohne Teil C nötig)

Wenn Claude (oder jemand anderes) die App geändert hat, steht der neue Stand auf GitHub in `apps-script/Index.html`.

1. Auf GitHub `apps-script/Index.html` öffnen → **„Copy raw file“**.
2. In Apps Script die Datei `Index.html` öffnen, alles löschen, einfügen, **speichern**.
3. (Nur wenn sich `Code.gs` geändert hat: dasselbe für `Code.gs`.)
4. **„Bereitstellen“ → „Bereitstellungen verwalten“** („Manage deployments“).
5. Deine Bereitstellung auswählen → **Stift-Symbol ✏ (Bearbeiten)**.
6. Bei **„Version“** → **„Neue Version“** wählen → **„Bereitstellen“**.

> 💡 So **bleibt die Adresse (`/exec`) gleich.** Würdest du stattdessen „Neue Bereitstellung“ wählen, gäbe es eine neue Adresse.

---

## Teil C: Automatisch aus GitHub veröffentlichen

Danach musst du nichts mehr kopieren: Bei **jeder Änderung auf `main`** lädt GitHub die App selbst zu Apps Script hoch und veröffentlicht eine neue Version. Die Adresse (`/exec`) bleibt gleich.

Dafür gibt es im Repo schon einen fertigen **Automatik-Ablauf** (GitHub Action): `.github/workflows/apps-script.yml`. Er benutzt das Google-Werkzeug **clasp** (ein Programm zum Hochladen von Apps-Script-Code). Solange die Einrichtung unten fehlt, überspringt er sich einfach.

**Voraussetzung:** Teil A ist erledigt (Projekt und Bereitstellung mit `/exec`-Adresse gibt es).

**Zeitbedarf:** ca. 20 Minuten, einmalig.

### C1: Apps-Script-Schnittstelle einschalten

1. Öffne [script.google.com/home/usersettings](https://script.google.com/home/usersettings).
2. Bei **„Google Apps Script API“** den Schalter auf **„An“** stellen.

### C2: Zwei Nummern aus Apps Script notieren

Diese Nummern sind **nicht geheim**, kommen aber trotzdem zu den Secrets (das ist einfacher).

1. **Script-ID:** In deinem Apps-Script-Projekt links auf das **Zahnrad ⚙ („Projekteinstellungen“)** → unter **„IDs“** die **Script-ID** kopieren und in einer Notiz ablegen.
2. **Bereitstellungs-ID:** **„Bereitstellen“ → „Bereitstellungen verwalten“** → deine Web-App anklicken → die **Bereitstellungs-ID** (lange Zeichenkette, beginnt meist mit `AKfycb`) kopieren und ebenfalls notieren.

### C3: Einmal auf deinem Computer bei Google anmelden

Das geht nur auf deinem eigenen Computer, weil sich dabei dein Browser öffnet.

1. **Node.js installieren** (ein Programm, das clasp zum Laufen braucht): [nodejs.org](https://nodejs.org) → großen Knopf **„LTS“** herunterladen → installieren wie jedes Programm.
2. **Terminal öffnen** (ein Fenster, in das man Befehle tippt):
   - **Mac:** ⌘+Leertaste → `Terminal` tippen → Enter.
   - **Windows:** Start-Knopf → `PowerShell` tippen → Enter.
3. Diesen Befehl hineinkopieren und Enter drücken:
   ```
   npx -y @google/clasp@3.4.1 login
   ```
4. Der Browser öffnet sich → dein **Impact-Hub-Konto** wählen → alles **erlauben**.
5. Im Terminal steht danach etwas wie **„You are logged in as …“**. 🎉
   Dabei ist auf deinem Computer eine versteckte Datei `.clasprc.json` entstanden. Sie enthält den **Zugangsschlüssel**.

### C4: Den Zugangsschlüssel in die Zwischenablage kopieren

Im selben Terminal-Fenster eintippen und Enter:

- **Mac:**
  ```
  cat ~/.clasprc.json | pbcopy
  ```
- **Windows (PowerShell):**
  ```
  Get-Content $HOME\.clasprc.json | Set-Clipboard
  ```

Es passiert scheinbar nichts. Der Inhalt ist aber jetzt in der Zwischenablage.

> 🔒 Diesen Inhalt **nirgendwo anders einfügen** als im nächsten Schritt bei GitHub: nicht in den Chat, nicht in eine Datei, nicht in eine Mail.

### C5: Drei Secrets bei GitHub hinterlegen

1. Auf GitHub im Repo oben auf **„Settings“** → links **„Secrets and variables“** → **„Actions“**.
2. **„New repository secret“** klicken und nacheinander diese drei anlegen (Name **genau so** schreiben):

| Name | Inhalt |
|---|---|
| `CLASPRC_JSON` | einfügen (Strg+V / ⌘+V), was du in C4 kopiert hast |
| `APPS_SCRIPT_ID` | die Script-ID aus C2 |
| `APPS_SCRIPT_DEPLOYMENT_ID` | die Bereitstellungs-ID aus C2 |

### C6: Ausprobieren

1. Auf GitHub oben auf **„Actions“** → links **„Apps Script veröffentlichen“** → rechts **„Run workflow“** → grünen Knopf **„Run workflow“**.
2. Nach ca. einer Minute erscheint ein **grüner Haken** ✅. Bei einem **roten Kreuz** ❌: draufklicken, den roten Schritt öffnen und Claude einen Screenshot zeigen.
3. Deine `/exec`-Adresse neu laden. Fertig!

Ab jetzt läuft das bei jeder Änderung auf `main` von allein. **Teil B brauchst du nicht mehr.**

### Gut zu wissen

- **Änderungen direkt im Apps-Script-Editor werden überschrieben**, sobald GitHub das nächste Mal hochlädt. Änderungen also immer über GitHub/Claude machen.
- **Wer Zugriff hat, steht jetzt in `apps-script/appsscript.json`** (`"access": "DOMAIN"` = „Jeder in Impact Hub“). Für „Nur ich“ müsste dort `"MYSELF"` stehen. Sag Claude Bescheid, wenn du das ändern willst.
- **Wie mächtig ist der Schlüssel?** `CLASPRC_JSON` erlaubt, **alle** Apps-Script-Projekte deines Kontos zu ändern, und hat weitere Google-Rechte (u. a. für Google Cloud). GitHub zeigt Secrets nie wieder an, auch nicht in Protokollen. Trotzdem: später besser auf ein **Team-/Funktionskonto** umstellen (Thema fürs IT-Gespräch).
- **Schlüssel sperren**, falls nötig: [myaccount.google.com/permissions](https://myaccount.google.com/permissions) → **„clasp“** → Zugriff entfernen. Danach funktioniert die Automatik nicht mehr, bis du C3–C5 wiederholst.

### Wenn es nicht klappt

| Meldung (im roten Schritt) | Was tun |
|---|---|
| `User has not enabled the Apps Script API` | Schritt C1 machen, dann C6 wiederholen. |
| `invalid_grant` oder `Unauthorized` | Der Schlüssel ist abgelaufen oder gesperrt → C3 bis C5 wiederholen (Secret `CLASPRC_JSON` mit dem neuen Inhalt **aktualisieren**). Passiert das oft, hat die IT evtl. eine Ablaufzeit eingestellt → IT fragen. |
| Beim Anmelden in C3: „Zugriff blockiert“ / „This app is blocked“ | Die IT hat clasp für euer Google-Konto gesperrt → IT fragen. |
| `Requested entity was not found` | Script-ID oder Bereitstellungs-ID falsch kopiert → in C5 das Secret aktualisieren. |
| Haken ist grün, aber im Protokoll steht „übersprungen“ | Eines der drei Secrets fehlt oder ist falsch benannt → C5 prüfen. |

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
- Die GitHub Action `.github/workflows/apps-script.yml` baut beides selbst neu, lädt mit clasp 3.4.1 hoch (`push --force`) und aktualisiert die bestehende Bereitstellung (`update-deployment`, erzeugt automatisch eine neue Version). Secrets: `CLASPRC_JSON`, `APPS_SCRIPT_ID`, `APPS_SCRIPT_DEPLOYMENT_ID`. Fehlen sie, wird übersprungen.
- Lokale clasp-Version beim Login muss zur Version in der Action passen (3.4.1), weil sich das Format von `.clasprc.json` zwischen Hauptversionen unterscheidet.
- Das Skript setzt `window.APPS_SCRIPT = true`. `data-layer.js` versucht dann keine JSON-Dateien zu laden, sondern nimmt direkt die Demo-Daten.
- Später (Roadmap): Echte Daten holt `Code.gs` serverseitig (`UrlFetchApp` für Notion/Eventbrite, `GmailApp`/`CalendarApp` für Google). `data-layer.js` ruft das über `google.script.run` auf. Schlüssel liegen in den **Script Properties**, nie im Code.
