/*
 * data-layer.js – die EINZIGE Stelle, an der Daten geladen und gespeichert werden.
 *
 * Die Oberfläche (app.js) fragt nur diese Datei nach Daten. Später ersetzen wir
 * das Innere dieser Datei durch Notion / Eventbrite / Google – die Oberfläche
 * merkt davon nichts, solange die Funktionen unten gleich heißen und dasselbe
 * zurückgeben.
 *
 * Aktuell (Demo):
 *   - Grunddaten kommen aus data/demo-daten.js (automatisch erzeugt aus data/*.json)
 *   - Eigene Änderungen werden nur im Browser gespeichert (localStorage)
 *   - Jede Speicherung wird hier gestempelt ("Last edited by"): wer, wann, welche Felder
 *     (Felder geaendertVon, geaendertAm, verlauf[]). Online ist "wer" die Google-Adresse der
 *     angemeldeten Person, per Doppelklick "Demo user (offline)". Die Oberfläche setzt das NIE selbst.
 *     Später (Notion/Server) muss der Server stempeln, nicht der Browser.
 *   - In der Apps-Script-Version (online): Benutzer-Menü, Test-Reminder-Mail und
 *     "Ask AI" (Gemini; schlägt Änderungen nur vor, gespeichert wird per speichereEvent nach Klick)
 *     über apps-script/Code.gs (google.script.run). Per Doppelklick gibt es beides nicht.
 *
 * Alle Funktionen geben ein "Promise" zurück (= "Antwort kommt gleich").
 * So funktioniert es später genauso, wenn die Daten aus dem Internet kommen.
 */
(function () {
  "use strict";

  // v2: seit der Umstellung auf Englisch (alte gespeicherte Daten passen nicht mehr)
  const SPEICHER_EVENTS = "eventManager.events.v4"; // v3: gegliederte Description, v4: 14 Kategorien wie in Notion
  const SPEICHER_EINSTELLUNGEN = "eventManager.einstellungen.v1";

  // schwelleProzent = Abweichung vom Blueprint · mindestAnmeldungProzent = Warnung bei zu wenigen Anmeldungen
  // maxProWoche / maxProTag = Terminplan-Grenzen
  const STANDARD_EINSTELLUNGEN = { schwelleProzent: 20, mindestAnmeldungProzent: 50, maxProWoche: 2, maxProTag: 1, monatsAnsicht: "calendar", jahresAnsicht: "matrix" };

  let grunddaten = null; // { events, templates, model, tags } – unverändert aus den Dateien

  // ---------- kleine Helfer für den Browser-Speicher (kann z. B. im privaten Fenster fehlen)
  function leseSpeicher(schluessel) {
    try {
      const text = window.localStorage.getItem(schluessel);
      return text ? JSON.parse(text) : null;
    } catch (e) {
      return null;
    }
  }
  function schreibeSpeicher(schluessel, wert) {
    try {
      window.localStorage.setItem(schluessel, JSON.stringify(wert));
      return true;
    } catch (e) {
      return false;
    }
  }
  function loescheSpeicher(schluessel) {
    try {
      window.localStorage.removeItem(schluessel);
    } catch (e) {
      /* egal */
    }
  }
  function kopie(wert) {
    return JSON.parse(JSON.stringify(wert));
  }

  // ---------- Verbindung zu Google Apps Script (nur online vorhanden)
  function inAppsScript() {
    return typeof google !== "undefined" && google.script && google.script.run;
  }
  /** Eine Funktion aus apps-script/Code.gs aufrufen, Antwort als Promise */
  function rufeServer(name, ...argumente) {
    return new Promise((ok, fehler) => {
      google.script.run
        .withSuccessHandler(ok)
        .withFailureHandler((e) => fehler(new Error((e && e.message) || String(e))))[name](...argumente);
    });
  }

  // ---------- Grunddaten laden
  // Die Demo-Daten stecken in data/demo-daten.js (erzeugt aus data/*.json).
  // Das funktioniert überall gleich: per Doppelklick und in Google Apps Script.
  async function ladeGrunddaten() {
    if (grunddaten) return grunddaten;
    if (!window.DEMO_DATEN) {
      throw new Error("Keine Demo-Daten gefunden (data/demo-daten.js fehlt?)");
    }
    grunddaten = kopie(window.DEMO_DATEN);
    return grunddaten;
  }

  async function aktuelleEvents() {
    const basis = await ladeGrunddaten();
    const gespeichert = leseSpeicher(SPEICHER_EVENTS);
    if (!gespeichert) return kopie(basis.events);
    // Ältere gespeicherte Stände kennen das Feld "setting" noch nicht: aus den Demo-Daten ergänzen
    const original = new Map(basis.events.map((e) => [e.id, e]));
    gespeichert.forEach((e) => {
      if (!("setting" in e) && original.has(e.id)) e.setting = original.get(e.id).setting || "";
      // … und auch noch keinen Bearbeitungs-Verlauf ("Last edited by")
      if (!("verlauf" in e) && original.has(e.id)) {
        const o = original.get(e.id);
        ["verlauf", "geaendertVon", "geaendertAm"].forEach((k) => { if (k in o) e[k] = kopie(o[k]); });
      }
    });
    return gespeichert;
  }

  // ---------- "Last edited by": wer bearbeitet gerade?
  const OFFLINE_BENUTZER = "Demo user (offline)";
  const MAX_VERLAUF = 30; // so viele Einträge pro Event merken (neueste zuerst)
  const NICHT_VERGLEICHEN = ["geaendertVon", "geaendertAm", "verlauf"];
  let benutzerVersprechen = null; // nur einmal beim Server nachfragen

  function werBearbeitet() {
    if (!inAppsScript()) return Promise.resolve(OFFLINE_BENUTZER);
    if (!benutzerVersprechen) {
      benutzerVersprechen = rufeServer("holeBenutzer")
        .then((a) => (a && a.email) || "Unknown user")
        .catch(() => "Unknown user");
    }
    return benutzerVersprechen;
  }

  /** Welche Felder unterscheiden sich? Bei der Description einzeln je Abschnitt ("beschreibung.agenda") */
  function geaenderteFelder(alt, neu) {
    const gleich = (a, b) => JSON.stringify(a === undefined ? null : a) === JSON.stringify(b === undefined ? null : b);
    const felder = [];
    const schluessel = new Set(Object.keys(alt || {}).concat(Object.keys(neu || {})));
    schluessel.forEach((k) => {
      if (NICHT_VERGLEICHEN.includes(k) || gleich(alt[k], neu[k])) return;
      // Bei Tags zählt nur, welche gewählt sind, nicht die Reihenfolge
      if (k === "tags" && gleich([...(alt[k] || [])].sort(), [...(neu[k] || [])].sort())) return;
      const a = alt[k], b = neu[k];
      if (k === "beschreibung" && a && b && typeof a === "object" && typeof b === "object") {
        new Set(Object.keys(a).concat(Object.keys(b))).forEach((t) => {
          if (!gleich(a[t] || "", b[t] || "")) felder.push("beschreibung." + t);
        });
      } else {
        felder.push(k);
      }
    });
    return felder;
  }

  function neueId(events) {
    const max = events.reduce((m, e) => {
      const nr = parseInt(String(e.id).replace(/\D/g, ""), 10);
      return isNaN(nr) ? m : Math.max(m, nr);
    }, 0);
    return "evt-" + String(max + 1).padStart(3, "0");
  }

  // ---------- Öffentliche Funktionen (diese Namen bitte nicht ändern)
  const DataLayer = {
    /** Woher kommen die Daten gerade? (wird in der Oberfläche angezeigt) */
    quelle: "Demo data (fictional)",

    /** Alles auf einmal laden: { events, templates, model, tags } */
    async ladeAlles() {
      const basis = await ladeGrunddaten();
      return {
        events: await aktuelleEvents(),
        templates: kopie(basis.templates),
        model: kopie(basis.model),
        tags: kopie(basis.tags || []),
      };
    },

    /**
     * Ein Event anlegen (ohne id) oder ändern (mit id). Gibt das gespeicherte Event zurück.
     * info (freiwillig): { hinweis } – z. B. "AI suggestion applied", steht dann im Verlauf.
     * Stempelt automatisch geaendertVon / geaendertAm und ergänzt verlauf[] (neueste zuerst).
     * Hat sich nichts geändert, bleibt der Stempel, wie er ist.
     */
    async speichereEvent(event, info) {
      const events = await aktuelleEvents();
      const neu = kopie(event);
      const i = neu.id ? events.findIndex((e) => e.id === neu.id) : -1;
      const alt = i >= 0 ? events[i] : null;
      const felder = alt ? geaenderteFelder(alt, neu) : [];
      // Verlauf immer vom gespeicherten Stand nehmen (die Oberfläche kann ihn nicht verändern)
      NICHT_VERGLEICHEN.forEach((k) => { delete neu[k]; });
      if (alt) NICHT_VERGLEICHEN.forEach((k) => { if (k in alt) neu[k] = kopie(alt[k]); });
      if (!alt || felder.length) {
        const eintrag = {
          von: await werBearbeitet(),
          am: new Date().toISOString(),
          aktion: alt ? "edited" : "created",
          felder,
        };
        if (info && info.hinweis) eintrag.hinweis = String(info.hinweis);
        neu.verlauf = [eintrag].concat(neu.verlauf || []).slice(0, MAX_VERLAUF);
        neu.geaendertVon = eintrag.von;
        neu.geaendertAm = eintrag.am;
      }
      if (!neu.id) {
        neu.id = neueId(events);
        events.push(neu);
      } else if (i >= 0) {
        events[i] = neu;
      } else {
        events.push(neu);
      }
      events.sort((a, b) => (a.datum + a.startzeit).localeCompare(b.datum + b.startzeit));
      schreibeSpeicher(SPEICHER_EVENTS, events);
      return neu;
    },

    /** Ein Event löschen */
    async loescheEvent(id) {
      const events = (await aktuelleEvents()).filter((e) => e.id !== id);
      schreibeSpeicher(SPEICHER_EVENTS, events);
    },

    /** Alle eigenen Änderungen verwerfen und die Demo-Daten wiederherstellen */
    async setzeDemoZurueck() {
      loescheSpeicher(SPEICHER_EVENTS);
    },

    /** Gibt es eigene Änderungen im Browser? */
    hatEigeneAenderungen() {
      return leseSpeicher(SPEICHER_EVENTS) !== null;
    },

    /** Einstellungen, z. B. die Warn-Schwelle in Prozent */
    async ladeEinstellungen() {
      return Object.assign({}, STANDARD_EINSTELLUNGEN, leseSpeicher(SPEICHER_EINSTELLUNGEN) || {});
    },
    async speichereEinstellungen(einstellungen) {
      schreibeSpeicher(SPEICHER_EINSTELLUNGEN, einstellungen);
    },

    /**
     * Wer ist angemeldet? → { angemeldet, email, mailMoeglich, kiMoeglich }
     * Per Doppelklick (ohne Google) ist niemand angemeldet.
     */
    async ladeBenutzer() {
      if (!inAppsScript()) {
        return { angemeldet: false, email: "", mailMoeglich: false, kiMoeglich: false };
      }
      const antwort = await rufeServer("holeBenutzer");
      return {
        angemeldet: !!antwort.email,
        email: antwort.email,
        mailMoeglich: !!antwort.email,
        kiMoeglich: !!antwort.kiBereit,
      };
    },

    /** Test-Reminder an die EIGENE Adresse senden → { an, rest } (rest = Mails heute noch möglich) */
    async sendeTestMail(betreff, text) {
      if (!inAppsScript()) throw new Error("Only available in the online version.");
      return rufeServer("sendeTestReminder", betreff, text);
    },

    /**
     * Frage an die KI (Gemini) → { antwort, modell, sekunden }. Die KI speichert nichts selbst;
     * ihre Vorschläge stehen als "change"-Blöcke im Antworttext (app.js zeigt sie an).
     * verlauf: [{ rolle: "user" | "model", text }] · kontext: alle Daten, die die KI sehen darf
     */
    async frageKI(frage, verlauf, kontext) {
      if (!inAppsScript()) throw new Error("Only available in the online version.");
      return rufeServer("frageKI", frage, verlauf, JSON.stringify(kontext));
    },

    /**
     * Status der externen Dienste. Gmail ist online (Apps Script) über den Google-Login verbunden:
     * Test-Reminder gehen von der eigenen Adresse an die eigene Adresse. Der Rest ist noch Demo.
     */
    async ladeVerbindungen() {
      const online = !!inAppsScript();
      return [
        {
          id: "notion",
          name: "Notion",
          zweck: "Main source for events, templates and the target model.",
          spaeter: "Reads the event database (read-only at first).",
          verbunden: false,
        },
        {
          id: "eventbrite",
          name: "Eventbrite",
          zweck: "Registrations and ticket numbers.",
          spaeter: "Creates drafts from templates and fetches registration numbers.",
          verbunden: false,
        },
        {
          id: "gmail",
          name: "Gmail",
          zweck: "Reminder and feedback emails.",
          jetzt: online ? "Connected via your Google login: “Send test to me” sends reminder emails from and to your own address." : "",
          spaeter: "Creates email drafts for participants – never sends anything without you.",
          verbunden: online,
        },
        {
          id: "gcal",
          name: "Google Calendar",
          zweck: "Dates in the team calendar.",
          spaeter: "Adds planned events to the calendar.",
          verbunden: false,
        },
      ];
    },
  };

  window.DataLayer = DataLayer;
})();
