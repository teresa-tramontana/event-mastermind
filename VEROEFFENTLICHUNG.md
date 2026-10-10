# Veröffentlichung über Google Apps Script 🚀

**Live-Adresse (nur mit Impact-Hub-Google-Konto):**
👉 https://script.google.com/a/macros/impacthub.net/s/AKfycbxXyZ0SBbdb66GGk5xvwkSBpH5E4tyorEO39IZf_TcGuVETJ-517MTZ9OTGk1xKJABw/exec

Die App läuft als **Google-Apps-Script-Web-App**. Das ist eine Webseite auf Google-Servern, die nur Leute mit Impact-Hub-Konto öffnen können. (GitHub Pages wird nicht mehr genutzt.)

---

## So kommt eine Änderung auf die Seite

```
Änderung auf GitHub (Branch main)
        │  startet automatisch
        ▼
GitHub Action „Apps Script veröffentlichen“
        │  1. baut alles zu einer Datei zusammen (apps-script/Index.html)
        │  2. lädt sie mit „clasp“ zu Google hoch
        │  3. veröffentlicht eine neue Version
        ▼
Live-Adresse zeigt den neuen Stand (Adresse bleibt immer gleich)
```

**Du musst nichts tun.** Ca. 1 Minute nach jeder Änderung auf `main` ist sie live. Danach die Seite neu laden.

> 💡 **clasp** ist ein Google-Werkzeug zum Hochladen von Apps-Script-Code. Eine **GitHub Action** ist ein kleiner Automatik-Ablauf auf GitHub.

### Nachsehen, ob es geklappt hat

1. Auf GitHub im Repo oben auf **„Actions“** klicken.
2. Links **„Apps Script veröffentlichen“** wählen.
3. Oben steht der letzte Lauf: **grüner Haken ✅** = live. **Rotes Kreuz ❌** = siehe „Wenn es nicht klappt“ unten.

### Von Hand neu veröffentlichen

Auf **Actions** → **„Apps Script veröffentlichen“** → rechts **„Run workflow“** → grüner Knopf **„Run workflow“**.

---

## Beim ersten Öffnen: Zugriff erlauben (jede Person einmal)

Die App läuft **als die Person, die sie gerade benutzt**. Darum fragt Google **jede Person beim ersten Öffnen** einmal, ob die App
- ihre **E-Mail-Adresse sehen** darf (für das Benutzer-Menü oben rechts) und
- **Mails in ihrem Namen senden** darf (für „Send test to me“).

So geht's: Live-Adresse öffnen → **„Zugriff überprüfen“ / „Review permissions“** → eigenes Konto wählen → **„Zulassen“**.
(Erscheint „Google hat diese App nicht überprüft“: **„Erweitert“** → **„Zu Event Mastermind wechseln“**. Die App gehört Impact Hub.)

Danach fragt Google nicht mehr, außer eine neue Funktion braucht weitere Rechte. Claude sagt dann Bescheid.

> 📨 **Absender** einer Test-Mail ist immer die Person selbst. Die Mail geht von der eigenen Adresse an die eigene Adresse und liegt danach auch in „Gesendet“. Google erlaubt mit einem Workspace-Konto ca. 1.500 Mails pro Tag und Person.

## Gut zu wissen

- **Nicht im Apps-Script-Editor ändern.** Beim nächsten Hochladen wird alles mit dem Stand von GitHub überschrieben. Änderungen immer über GitHub/Claude.
- **Wer Zugriff hat**, steht in `apps-script/appsscript.json`:
  `"access": "DOMAIN"` = alle mit Impact-Hub-Konto. (`"MYSELF"` wäre „nur ich“. Bitte nie `"ANYONE"`.)
- **Eigene Änderungen in der App** (neue Events, abgehakte Aufgaben) bleiben nur im eigenen Browser. Andere sehen sie nicht. „Reset demo data“ setzt alles zurück.
- **Etwas langsamer als eine normale Webseite:** Google startet die App bei jedem Aufruf kurz, 1–3 Sekunden sind normal.

### Die drei Secrets auf GitHub

Unter **Settings → Secrets and variables → Actions**:

| Name | Was es ist |
|---|---|
| `CLASPRC_JSON` | 🔒 Google-Zugangsschlüssel für clasp. Darf **alle** Apps-Script-Projekte deines Kontos ändern und hat weitere Google-Rechte. Nie in Chat, Dateien oder Mails kopieren. |
| `APPS_SCRIPT_ID` | Nummer des Apps-Script-Projekts (nicht geheim) |
| `APPS_SCRIPT_DEPLOYMENT_ID` | Nummer der Veröffentlichung, steckt auch in der Live-Adresse (nicht geheim) |

**Schlüssel sperren**, falls nötig: [myaccount.google.com/permissions](https://myaccount.google.com/permissions) → **„clasp“** → Zugriff entfernen. Danach muss Schritt 4–5 der Neu-Einrichtung (unten) wiederholt werden.

---

## Wenn es nicht klappt

Im roten Lauf auf den roten Schritt klicken und die Meldung lesen:

| Meldung | Was tun |
|---|---|
| `invalid_grant` oder `Unauthorized` | Der Schlüssel ist abgelaufen oder gesperrt → Neu-Einrichtung Schritt 4–5 (neuen Schlüssel holen, Secret `CLASPRC_JSON` **aktualisieren**). Passiert das oft, hat die IT evtl. eine Ablaufzeit eingestellt → IT fragen. |
| `User has not enabled the Apps Script API` | [script.google.com/home/usersettings](https://script.google.com/home/usersettings) → „Google Apps Script API“ auf **An**. |
| `Requested entity was not found` | `APPS_SCRIPT_ID` oder `APPS_SCRIPT_DEPLOYMENT_ID` falsch → Secret aktualisieren. |
| Grüner Haken, aber im Protokoll steht „übersprungen“ | Eines der drei Secrets fehlt oder ist falsch benannt. |
| Seite zeigt „Script function not found: doGet“ | `apps-script/Code.gs` ist kaputt → Claude fragen. |
| Seite oder Mail-Knopf meldet „Authorization is required“ / „Autorisierung erforderlich“, oder das Benutzer-Menü fehlt | Seite neu laden und den Zugriff erlauben (Abschnitt „Beim ersten Öffnen“ oben). |

Sonst: Screenshot vom roten Schritt an Claude schicken (ohne Schlüssel darauf).

---

## Neu einrichten (z. B. anderes Konto, Umzug in die Organisation)

Nur nötig, wenn das Apps-Script-Projekt neu angelegt werden muss. **Zeitbedarf:** ca. 30 Minuten.

1. **Projekt anlegen:** [script.google.com](https://script.google.com) → **„Neues Projekt“** → Namen `Event Mastermind` geben.
   Den Inhalt von `Code.gs` durch den Inhalt von [`apps-script/Code.gs`](apps-script/Code.gs) ersetzen und speichern.
   Links **＋ → HTML**, Name **`Index`**, Inhalt leer lassen, speichern (die echte Seite lädt später GitHub hoch).
2. **Erste Veröffentlichung:** **„Bereitstellen“ → „Neue Bereitstellung“** → Zahnrad ⚙ → **„Web-App“**.
   *Ausführen als:* **Nutzer, der auf die Web-App zugreift**. *Wer hat Zugriff:* **Jeder in Impact Hub**. → **„Bereitstellen“**, Zugriff erlauben.
   Die neue **`/exec`-Adresse** notieren und hier oben in dieser Datei sowie in `README.md` und `CLAUDE.md` eintragen lassen.
3. **Zwei Nummern notieren:**
   - **Script-ID:** im Projekt links Zahnrad ⚙ „Projekteinstellungen“ → „IDs“.
   - **Bereitstellungs-ID:** „Bereitstellen“ → „Bereitstellungen verwalten“ → Web-App anklicken (beginnt meist mit `AKfycb`).
   - Außerdem: [script.google.com/home/usersettings](https://script.google.com/home/usersettings) → „Google Apps Script API“ auf **An**.
4. **Zugangsschlüssel holen** (auf deinem Computer):
   - [nodejs.org](https://nodejs.org) → **LTS** installieren (Programm, das clasp braucht).
   - Terminal öffnen (Mac: ⌘+Leertaste → `Terminal`; Windows: Start → `PowerShell`) und eingeben:
     ```
     npx -y @google/clasp@3.4.1 login
     ```
     Browser öffnet sich → Impact-Hub-Konto → erlauben.
   - Schlüssel in die Zwischenablage kopieren:
     - Mac: `cat ~/.clasprc.json | pbcopy`
     - Windows: `Get-Content $HOME\.clasprc.json | Set-Clipboard`
5. **Secrets eintragen:** GitHub → **Settings → Secrets and variables → Actions** → die drei Secrets aus der Tabelle oben anlegen bzw. aktualisieren.
6. **Testen:** **Actions → „Apps Script veröffentlichen“ → „Run workflow“** → grüner Haken → `/exec`-Adresse öffnen.

> Beim Login in Schritt 4 „Zugriff blockiert“? Dann hat die IT clasp gesperrt → IT fragen.

---

## Für Claude / Technik-Notizen

- `tools/baue-apps-script.py` packt `index.html`, `style.css`, `data/demo-daten.js`, `data-layer.js` und `app.js` in **eine** Datei `apps-script/Index.html` (Apps Script kann keine Einzeldateien nachladen). Die Datei steht in `.gitignore`; die Action baut sie bei jedem Lauf frisch (vorher auch `data/demo-daten.js`).
- `.github/workflows/apps-script.yml`: clasp **3.4.1**, `push --force`, dann `update-deployment <ID>` (erzeugt automatisch eine neue Version, Adresse bleibt). Ohne Secrets wird übersprungen. Die clasp-Version beim lokalen Login muss zur Action passen (Format von `.clasprc.json` ändert sich zwischen Hauptversionen).
- `apps-script/appsscript.json` wird mit hochgeladen und bestimmt Zeitzone und Zugriff der Web-App.
- Später (Roadmap): Echte Daten holt `Code.gs` serverseitig (`UrlFetchApp` für Notion/Eventbrite, `GmailApp`/`CalendarApp`), `data-layer.js` ruft das über `google.script.run` auf. Schlüssel liegen dann in den **Script Properties**, nie im Code.
