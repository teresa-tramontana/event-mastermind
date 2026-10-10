/*
 * data-layer.js – die EINZIGE Stelle, an der Daten geladen und gespeichert werden.
 *
 * Die Oberfläche (app.js) fragt nur diese Datei nach Daten. Später ersetzen wir
 * das Innere dieser Datei durch Notion / Eventbrite / Google – die Oberfläche
 * merkt davon nichts, solange die Funktionen unten gleich heißen und dasselbe
 * zurückgeben.
 *
 * Aktuell (Demo):
 *   - Grunddaten kommen aus data/*.json (online) bzw. data/demo-daten.js (Doppelklick)
 *   - Eigene Änderungen werden nur im Browser gespeichert (localStorage)
 *
 * Alle Funktionen geben ein "Promise" zurück (= "Antwort kommt gleich").
 * So funktioniert es später genauso, wenn die Daten aus dem Internet kommen.
 */
(function () {
  "use strict";

  // v2: seit der Umstellung auf Englisch (alte gespeicherte Daten passen nicht mehr)
  const SPEICHER_EVENTS = "eventManager.events.v3"; // v3: gegliederte Description
  const SPEICHER_EINSTELLUNGEN = "eventManager.einstellungen.v1";

  const STANDARD_EINSTELLUNGEN = { schwelleProzent: 20 };

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

  // ---------- Grunddaten laden
  async function ladeJson(pfad) {
    const antwort = await fetch(pfad, { cache: "no-cache" });
    if (!antwort.ok) throw new Error(pfad + " nicht gefunden");
    return antwort.json();
  }

  async function ladeGrunddaten() {
    if (grunddaten) return grunddaten;
    const online = window.location.protocol.startsWith("http");
    if (online) {
      try {
        const [events, templates, model, tags] = await Promise.all([
          ladeJson("data/events.json"),
          ladeJson("data/templates.json"),
          ladeJson("data/model.json"),
          ladeJson("data/tags.json"),
        ]);
        grunddaten = { events, templates, model, tags };
        return grunddaten;
      } catch (e) {
        console.warn("JSON konnte nicht geladen werden, nutze demo-daten.js", e);
      }
    }
    if (!window.DEMO_DATEN) {
      throw new Error("Keine Demo-Daten gefunden (data/demo-daten.js fehlt?)");
    }
    grunddaten = kopie(window.DEMO_DATEN);
    return grunddaten;
  }

  async function aktuelleEvents() {
    const basis = await ladeGrunddaten();
    return leseSpeicher(SPEICHER_EVENTS) || kopie(basis.events);
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

    /** Ein Event anlegen (ohne id) oder ändern (mit id). Gibt das gespeicherte Event zurück. */
    async speichereEvent(event) {
      const events = await aktuelleEvents();
      const neu = kopie(event);
      if (!neu.id) {
        neu.id = neueId(events);
        events.push(neu);
      } else {
        const i = events.findIndex((e) => e.id === neu.id);
        if (i >= 0) events[i] = neu;
        else events.push(neu);
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

    /** Status der externen Dienste – in der Demo ist nichts verbunden */
    async ladeVerbindungen() {
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
          spaeter: "Creates email drafts – never sends anything without you.",
          verbunden: false,
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
