# Event Mastermind – Kurzinfo für die IT

## Worum geht es?

Ich baue mit KI-Unterstützung (Claude Code) einen kleinen **Event-Manager für das Community-Team**. Er zeigt auf einen Blick, ob unsere Events zum Jahresplan passen, warnt bei Abweichungen und hilft bei Texten (Beschreibungen, Social Posts, Reminder-Mails).

Ich möchte damit die Möglichkeiten nutzen, die KI-gestützte Entwicklung heute bietet: schnell, günstig und genau auf unseren Bedarf zugeschnitten.

## So ist es heute aufgesetzt

Ich habe bewusst das **einfachste und sicherste Setup** gewählt:

- **Läuft in unserem eigenen Google Workspace** als Google-Apps-Script-Web-App.
- **Zugriff nur mit Impact-Hub-Google-Konto.** Von außen ist die App nicht erreichbar.
- **Die App läuft als die Person, die sie öffnet.** Niemand bekommt mehr Rechte, als er oder sie ohnehin hat.
- **Keine eigenen Server, keine zusätzlichen Kosten.** Nur HTML, CSS und JavaScript.
- **Code liegt in einem GitHub-Repository.** Jede Änderung wird automatisch veröffentlicht und ist nachvollziehbar.
- **Zugangsschlüssel liegen nie im Code**, sondern geschützt in GitHub bzw. bei Google.
- **Aktuell nur erfundene Demo-Daten.** Keine personenbezogenen Daten.

## Wobei ich mich über eure Unterstützung freue

1. **Firmen-Repository auf GitHub:** Den Code aus meinem persönlichen Konto in ein Repository unserer Organisation umziehen. Wer bekommt welche Rechte?
2. **Notion und Eventbrite sicher anbinden:** Wie verbinden wir die APIs am besten (Zugangsschlüssel, Leserechte, Datenschutz/AVV)? Geplant: Notion zunächst nur lesen, von Eventbrite nur Anmeldezahlen, Eventbrite-Events nur als Entwurf.
3. **Konto für die App:** Sollte die App besser unter einem Team-/Funktionskonto laufen statt unter meinem persönlichen?
4. **KI (Gemini):** Für echte Daten würde ich auf eine datenschutzkonforme Variante wechseln (z. B. Vertex AI in der EU). Was ist bei uns freigegeben?
5. **Hosting allgemein:** Passt Apps Script für euch, oder habt ihr Vorgaben bzw. Ideen (z. B. Google Cloud in der EU)?

## Kurz gesagt

Die App steht schon und ist sicher in unserer Google-Umgebung aufgesetzt. Bevor echte Daten angeschlossen werden, möchte ich gemeinsam mit euch die nächsten Schritte sauber aufsetzen. Eure Tipps und Ideen sind sehr willkommen!

*Ausführliche technische Details stehen in `CLAUDE.md` (Abschnitt „Gesprächsleitfaden für die IT“).*
