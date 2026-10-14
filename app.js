/*
 * app.js – die Oberfläche (alle sichtbaren Texte auf Englisch).
 *
 * Aufbau dieser Datei (von oben nach unten):
 *   1. Zustand        – was gerade angezeigt wird
 *   2. Helfer         – Datum, Texte, Farben
 *   3. Auswertung     – Ist gegen Soll (Modell) vergleichen
 *   4. Vorschläge     – Titel, Description und Summary aus Vorlage + Tags bauen
 *   5. Ansichten      – Year, Quarter, Month, Week, Search, Deviations, Templates, Connections
 *   6. Dialoge        – Event-Formular, Social-Post-/Mail-Vorschlag
 *   7. Start          – Daten laden, Knöpfe verbinden, Ask AI (Fragen + Änderungs-Vorschläge zum Übernehmen)
 *
 * WICHTIG: Diese Datei holt Daten NIE selbst, sondern immer über window.DataLayer.
 */
(function () {
  "use strict";

  // ======================================================================
  // 1. ZUSTAND
  // ======================================================================
  const zustand = {
    events: [],
    templates: [],
    model: null,
    tags: [], // feste Tag-Liste aus data/tags.json
    einstellungen: { schwelleProzent: 20 },
    ansicht: "year",
    datum: null, // das Datum, um das sich die Ansicht dreht ("Cursor")
    suche: { text: "", kategorie: "", status: "", nurKommende: false, nurLuecken: false },
    // Filter für Month und List: Gruppe, Tags (mind. einer muss passen), Setting (kommt mit den echten Daten)
    filter: { gruppe: "", tags: [], setting: "" },
    benutzer: { angemeldet: false, email: "", mailMoeglich: false, kiMoeglich: false },
  };

  // Reihenfolge und Namen wie in Notion
  const KATEGORIEN = ["Community Monthlies", "Community Weeklies", "Academy", "Drops of Inspiration", "Winedowns",
    "Town Hall", "Group-Specific", "Collaboration", "Idea Starter Pack", "Cross-Community", "Community Quarterlies",
    "Partner Deliverable", "Community Summer", "Community"];
  // Die 14 Kategorien in 3 Gruppen – eine Farbe pro Gruppe (CSS: --grp-… in style.css).
  // So bleibt der Kalender ruhig; die genaue Kategorie steht trotzdem überall als Text dabei.
  // Feiner beschreiben die Tags und (mit den echten Daten) das Setting – danach kann man filtern.
  const GRUPPEN = [
    { name: "Learn", klasse: "grp-learn", kategorien: ["Academy", "Drops of Inspiration", "Idea Starter Pack"],
      text: "Content formats, expert-guided sessions and skillshare or peer-to-peer feedback formats." },
    { name: "Connect", klasse: "grp-connect", kategorien: ["Community Weeklies", "Community Monthlies", "Winedowns", "Community", "Town Hall", "Group-Specific", "Collaboration", "Cross-Community", "Partner Deliverable"],
      text: "Pure community formats and informal gatherings." },
    { name: "Celebrate", klasse: "grp-celebrate", kategorien: ["Community Summer", "Community Quarterlies"],
      text: "Our big celebrations: Summer Party and Winter Party." },
  ];
  function gruppeVon(kat) {
    return GRUPPEN.find((g) => g.kategorien.includes(kat)) || GRUPPEN[1];
  }
  const STATUS = ["Idea", "Planned", "Published", "Done"];
  const MONATE = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  const MONATE_KURZ = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const WOCHENTAGE = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const WOCHENTAGE_KURZ = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Aufbau der Description (Event-Beschreibung). "schluessel" = Feldname in den Daten,
  // "frage" = Überschrift in der Oberfläche, "gruppe" = Hauptabschnitt, zu dem er gehört.
  const BESCHREIBUNG_TEILE = [
    { schluessel: "worum", gruppe: "What is it about?", frage: "What is it about?", hilfe: "Topic, vibe, what happens" },
    { schluessel: "rahmen", gruppe: "What is it about?", frage: "Setting / framework", hilfe: "Format, place, size, duration" },
    { schluessel: "haeufigkeit", gruppe: "What is it about?", frage: "Frequency", hilfe: "One-off, monthly, quarterly …" },
    { schluessel: "warum", gruppe: "Why are we doing this?", frage: "Why are we doing this?", hilfe: "The outcome of the event" },
    { schluessel: "zielgruppe", gruppe: "For whom is it?", frage: "Target group", hilfe: "Who should come, who benefits" },
    { schluessel: "ergebnis", gruppe: "Outcome for members & goals", frage: "Outcome for members & goals", hilfe: "What members take home" },
    { schluessel: "agenda", gruppe: "Outcome for members & goals", frage: "What's on the agenda?", hilfe: "One line per item, e.g. 18:00 – Welcome" },
    { schluessel: "tickets", gruppe: "Ticket info", frage: "Ticket info", hilfe: "Price, spots, how to register" },
    { schluessel: "betreuung", gruppe: "Attended by / responsibility (team)", frage: "Attended by / responsibility (team)", hilfe: "Who leads, which teams are on site" },
  ];

  const $inhalt = document.getElementById("inhalt");
  const $titel = document.getElementById("titel");

  // ======================================================================
  // 2. HELFER
  // ======================================================================

  /** Text sicher in HTML einsetzen (verhindert, dass Eingaben die Seite kaputt machen) */
  function esc(wert) {
    return String(wert == null ? "" : wert)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /** "2026-10-14" -> Date (lokale Zeit, ohne Zeitzonen-Ärger) */
  function alsDatum(text) {
    const [j, m, t] = text.split("-").map(Number);
    return new Date(j, m - 1, t);
  }
  /** Date -> "2026-10-14" */
  function alsText(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function plusTage(d, n) {
    const neu = new Date(d);
    neu.setDate(neu.getDate() + n);
    return neu;
  }
  /** Montag der Woche (Wochen beginnen bei uns am Montag) */
  function wochenStart(d) {
    const tag = (d.getDay() + 6) % 7; // Mo=0 … So=6
    return plusTage(d, -tag);
  }
  /** Kalenderwoche nach ISO-Norm */
  function kalenderwoche(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const tagNr = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - tagNr);
    const jahrStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - jahrStart) / 86400000 + 1) / 7);
  }
  function quartalVon(d) {
    return Math.floor(d.getMonth() / 3) + 1;
  }
  /** "Wed, 14 October" (mit Jahr: "Wed, 14 October 2026") */
  function datumSchoen(text, mitJahr) {
    const d = alsDatum(text);
    return WOCHENTAGE_KURZ[(d.getDay() + 6) % 7] + ", " + d.getDate() + " " + MONATE[d.getMonth()] +
      (mitJahr ? " " + d.getFullYear() : "");
  }
  function heute() {
    // In der Demo ist "heute" ein fester Tag (steht in data/model.json),
    // damit die erfundenen Daten immer gleich wirken.
    return alsDatum(zustand.model.demoHeute);
  }
  function tageBis(text) {
    return Math.round((alsDatum(text) - heute()) / 86400000);
  }
  /** "Town Hall" -> "kat-Town-Hall" (CSS-Klasse für die Farbe) */
  function katKlasse(kat) {
    return "kat-" + String(kat).replace(/\s+/g, "-");
  }
  function katPille(kat) {
    return `<span class="kat-pille ${katKlasse(kat)}"><span class="kat-punkt"></span>${esc(kat)}</span>`;
  }
  function statusPille(status) {
    return `<span class="status status-${esc(status)}">${esc(status)}</span>`;
  }
  function tagPillen(tags) {
    return (tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
  }
  function prozent(wert) {
    return Math.round(wert * 100) + "%";
  }
  function vorzeichenProzent(wert) {
    if (wert === Infinity) return "unplanned";
    const p = Math.round(wert * 100);
    return (p > 0 ? "+" : p < 0 ? "−" : "±") + Math.abs(p) + "%";
  }
  function zeigeMeldung(text) {
    const el = document.getElementById("meldung");
    el.textContent = text;
    el.classList.add("sichtbar");
    clearTimeout(zeigeMeldung.timer);
    zeigeMeldung.timer = setTimeout(() => el.classList.remove("sichtbar"), 2600);
  }

  // ---------- Description: Abschnitte prüfen und anzeigen

  /** Description immer als Objekt mit allen Abschnitten (alte Daten waren ein einfacher Text) */
  function normBeschreibung(b) {
    const leer = {};
    BESCHREIBUNG_TEILE.forEach((t) => { leer[t.schluessel] = ""; });
    if (!b) return leer;
    if (typeof b === "string") return Object.assign(leer, { worum: b });
    BESCHREIBUNG_TEILE.forEach((t) => { leer[t.schluessel] = String(b[t.schluessel] || "").trim(); });
    return leer;
  }
  /** Welche Abschnitte fehlen? -> Liste der Überschriften */
  function fehlendeTeile(e) {
    const b = normBeschreibung(e.beschreibung);
    return BESCHREIBUNG_TEILE.filter((t) => !b[t.schluessel]).map((t) => t.frage);
  }
  /** "keine" = gar keine Description, "luecken" = teilweise, "ok" = vollständig */
  function beschreibungsStand(e) {
    const fehlt = fehlendeTeile(e).length;
    return fehlt === BESCHREIBUNG_TEILE.length ? "keine" : fehlt ? "luecken" : "ok";
  }
  function eventsMitLuecken() {
    return zustand.events.filter((e) => beschreibungsStand(e) !== "ok");
  }
  // ---------- Zu wenige Anmeldungen (unter "mindestAnmeldungProzent", Standard 50 %)
  // Geprüft werden durchgeführte Events ("Done") und kommende Events in den nächsten VORLAUF_TAGE Tagen
  // (weiter in der Zukunft ist es normal, dass erst wenige angemeldet sind).
  const VORLAUF_TAGE = 14;
  function anmeldeQuote(e) {
    const kap = Number(e["kapazität"]) || 0;
    return kap > 0 ? (Number(e.anmeldungen) || 0) / kap : null;
  }
  function anmeldeWarnung(e) {
    const q = anmeldeQuote(e);
    if (q === null || q >= zustand.einstellungen.mindestAnmeldungProzent / 100) return null;
    const zahlen = `${Number(e.anmeldungen) || 0} of ${e["kapazität"]} spots (${prozent(q)})`;
    if (e.status === "Done") return { art: "vorbei", kurz: "Low turnout", text: `Low turnout: ${zahlen}` };
    if (e.status === "Idea") return null;
    const tage = tageBis(e.datum);
    if (tage < 0 || tage > VORLAUF_TAGE) return null;
    return { art: "bald", kurz: "Low sign-ups",
      text: `Low sign-ups: only ${zahlen}, ${tage === 0 ? "today" : tage === 1 ? "1 day to go" : tage + " days to go"}` };
  }
  function eventsMitWenigAnmeldungen() {
    return zustand.events.filter((e) => anmeldeWarnung(e));
  }
  function anmeldeAbzeichen(e) {
    const w = anmeldeWarnung(e);
    return w ? `<span class="abzeichen ${w.art === "bald" ? "kritisch" : ""}" title="${esc(w.text)}">👥 ${esc(w.kurz)}</span>` : "";
  }
  function anmeldeHinweis(e) {
    const w = anmeldeWarnung(e);
    if (!w) return "";
    const tipp = w.art === "bald"
      ? "Promote it now: social post, reminder to members, ask partners to share."
      : "Check why: date, topic, promotion? Consider a smaller room next time.";
    return `<div class="info-fehlt ${w.art === "bald" ? "kritisch" : ""}">👥 <strong>${esc(w.text)}.</strong> ${tipp}
      <span class="leise">(warning below ${zustand.einstellungen.mindestAnmeldungProzent}%)</span></div>`;
  }

  // ---------- Terminplan: zu viele Events pro Woche / am selben Tag
  function terminKonflikte() {
    const { maxProWoche, maxProTag } = zustand.einstellungen;
    const jahr = String(zustand.model.jahr);
    const wochen = new Map(), tage = new Map();
    zustand.events.filter((e) => e.datum.startsWith(jahr))
      .sort((a, b) => (a.datum + a.startzeit).localeCompare(b.datum + b.startzeit))
      .forEach((e) => {
        const w = alsText(wochenStart(alsDatum(e.datum)));
        if (!wochen.has(w)) wochen.set(w, []);
        wochen.get(w).push(e);
        if (!tage.has(e.datum)) tage.set(e.datum, []);
        tage.get(e.datum).push(e);
      });
    return {
      wochen: [...wochen].filter(([, l]) => l.length > maxProWoche).map(([start, events]) => ({ start, events })),
      tage: [...tage].filter(([, l]) => l.length > maxProTag).map(([datum, events]) => ({ datum, events })),
    };
  }

  /** Gut sichtbarer Warnhinweis für fehlende Infos */
  function lueckenHinweis(e) {
    const stand = beschreibungsStand(e);
    if (stand === "ok") return "";
    if (stand === "keine") {
      return `<div class="info-fehlt kritisch">⚠ <strong>No description yet.</strong> This event has no information for participants – please add one.</div>`;
    }
    const fehlt = fehlendeTeile(e);
    return `<div class="info-fehlt">⚠ <strong>Description incomplete</strong> – missing: ${fehlt.map(esc).join(", ")}</div>`;
  }
  /** Kleines Abzeichen (für Listen und Kalender) */
  function lueckenAbzeichen(e) {
    const stand = beschreibungsStand(e);
    if (stand === "ok") return "";
    return stand === "keine"
      ? '<span class="abzeichen kritisch" title="No description">⚠ No description</span>'
      : `<span class="abzeichen" title="Missing: ${esc(fehlendeTeile(e).join(", "))}">⚠ ${fehlendeTeile(e).length} missing</span>`;
  }
  /** Die ganze Description, gegliedert; fehlende Abschnitte deutlich markiert */
  function beschreibungHtml(b, kategorie) {
    b = normBeschreibung(b);
    const gruppen = [...new Set(BESCHREIBUNG_TEILE.map((t) => t.gruppe))];
    const inhalt = gruppen.map((gruppe) => {
      const teile = BESCHREIBUNG_TEILE.filter((t) => t.gruppe === gruppe);
      return `<div class="b-gruppe"><h4>${esc(gruppe)}</h4>${teile.map((t) => `
        ${t.frage !== gruppe ? `<h5>${esc(t.frage)}</h5>` : ""}
        ${b[t.schluessel]
          ? `<p class="${t.schluessel === "agenda" ? "agenda" : ""}">${esc(b[t.schluessel])}</p>`
          : '<p class="fehlt-text">⚠ Missing – please add</p>'}`).join("")}</div>`;
    }).join("");
    return `<div class="b-kopf">Description · ${esc(kategorie)}</div>${inhalt}`;
  }
  /** Description als ein Text (für Suche) */
  function beschreibungText(b) {
    b = normBeschreibung(b);
    return BESCHREIBUNG_TEILE.map((t) => b[t.schluessel]).filter(Boolean).join(" \n ");
  }

  // ======================================================================
  // 3. AUSWERTUNG – Ist gegen Soll
  // ======================================================================

  /** Alle Events zwischen zwei Daten (beide inklusive), sortiert */
  function eventsZwischen(von, bis) {
    const a = alsText(von), b = alsText(bis);
    return zustand.events
      .filter((e) => e.datum >= a && e.datum <= b)
      .sort((x, y) => (x.datum + x.startzeit).localeCompare(y.datum + y.startzeit));
  }
  function eventsImMonat(jahr, monat) {
    return eventsZwischen(new Date(jahr, monat - 1, 1), new Date(jahr, monat, 0));
  }
  function eventsImQuartal(jahr, q) {
    return eventsZwischen(new Date(jahr, q * 3 - 3, 1), new Date(jahr, q * 3, 0));
  }

  /**
   * Vergleicht eine Liste von Events mit dem Soll.
   * Abweichung = (Ist − Soll) / Soll   → z. B. −0,5 heißt "50 % zu wenig"
   * Auslastung wird nur aus bereits durchgeführten Events ("Done") berechnet
   * (bei zukünftigen Events stehen die Anmeldungen ja noch nicht fest).
   */
  function vergleiche(events, soll, zielAuslastung, geprueft) {
    const schwelle = zustand.einstellungen.schwelleProzent / 100;
    const kategorien = KATEGORIEN.map((kat) => {
      const ist = events.filter((e) => e.kategorie === kat).length;
      const s = (soll && soll[kat]) || 0;
      let abw = 0;
      if (s > 0) abw = (ist - s) / s;
      else if (ist > 0) abw = Infinity; // stattgefunden, aber nicht eingeplant
      // "geprueft" = nur diese Kategorien werden hier verglichen (Monat: nur Blueprint-Monat + Ausnahmen;
      // Kategorien mit Quartals-Rhythmus werden erst im Quartal geprüft)
      const wirdGeprueft = !geprueft || geprueft.includes(kat);
      return { kat, ist, soll: s, abw, geprueft: wirdGeprueft, auffaellig: wirdGeprueft && Math.abs(abw) > schwelle };
    });

    const erledigt = events.filter((e) => e.status === "Done" && Number(e["kapazität"]) > 0);
    const plaetze = erledigt.reduce((s, e) => s + Number(e["kapazität"]), 0);
    const anmeldungen = erledigt.reduce((s, e) => s + Number(e.anmeldungen || 0), 0);
    const auslastung = plaetze > 0 ? anmeldungen / plaetze : null;
    const ziel = (zielAuslastung || 0) / 100;
    const auslastungAbw = auslastung !== null && ziel > 0 ? (auslastung - ziel) / ziel : null;

    const istGesamt = kategorien.filter((k) => k.geprueft).reduce((s, k) => s + k.ist, 0);
    const sollGesamt = kategorien.reduce((s, k) => s + k.soll, 0);

    const abweichungen = kategorien
      .filter((k) => k.auffaellig)
      .map((k) => ({
        art: "anzahl", kat: k.kat, ist: k.ist, soll: k.soll, abw: k.abw,
        text: k.soll === 0
          ? `${k.kat}: ${k.ist} event(s), although none were planned`
          : k.ist < k.soll
            ? `${k.kat}: only ${k.ist} instead of ${k.soll}`
            : `${k.kat}: ${k.ist} instead of ${k.soll}`,
      }));
    if (auslastungAbw !== null && Math.abs(auslastungAbw) > schwelle) {
      abweichungen.push({
        art: "auslastung", kat: "Occupancy", ist: auslastung, soll: ziel, abw: auslastungAbw,
        text: auslastung > ziel
          ? `Overbooked: ${prozent(auslastung)} full (target ${prozent(ziel)})`
          : `Low turnout: ${prozent(auslastung)} full (target ${prozent(ziel)})`,
      });
    }

    // Wie stark weicht der Zeitraum insgesamt ab? (größte einzelne Abweichung)
    const staerke = abweichungen.reduce(
      (m, a) => Math.max(m, a.abw === Infinity ? 1 : Math.abs(a.abw)), 0);

    return { kategorien, istGesamt, sollGesamt, auslastung, ziel, auslastungAbw, abweichungen, staerke };
  }

  // Das Soll kommt aus dem Blueprint (model.json):
  //   Monat   = Blueprint-Monat, überschrieben durch die Ausnahmen des Monats (z. B. Sommerpause)
  //   Quartal = die 3 Monate zusammen + Blueprint-Quartal (Kategorien mit Quartals-Rhythmus)
  function sollMonat(monat) {
    const m = zustand.model.monate.find((x) => x.monat === monat) || {};
    const soll = Object.assign({}, (zustand.model.basisMonat || {}).soll, m.ausnahmen || {});
    return { soll, zielAuslastung: zustand.model.zielAuslastung, notiz: m.notiz || "", ausnahmen: m.ausnahmen || {} };
  }
  function sollQuartal(q) {
    const soll = Object.assign({}, (zustand.model.basisQuartal || {}).soll);
    for (let m = q * 3 - 2; m <= q * 3; m++) {
      Object.entries(sollMonat(m).soll).forEach(([kat, n]) => { soll[kat] = (soll[kat] || 0) + n; });
    }
    return { soll, zielAuslastung: zustand.model.zielAuslastung };
  }
  function vergleichMonat(jahr, monat) {
    const m = sollMonat(monat);
    return vergleiche(eventsImMonat(jahr, monat), m.soll, m.zielAuslastung, Object.keys(m.soll));
  }
  function vergleichQuartal(jahr, q) {
    const m = sollQuartal(q);
    return vergleiche(eventsImQuartal(jahr, q), m.soll, m.zielAuslastung);
  }
  /** Soll fürs ganze Jahr je Kategorie (Summe der 4 Quartale) */
  function sollJahr() {
    const soll = {};
    [1, 2, 3, 4].forEach((q) => Object.entries(sollQuartal(q).soll).forEach(([k, n]) => { soll[k] = (soll[k] || 0) + n; }));
    return soll;
  }


  // ======================================================================
  // 4. VORSCHLÄGE – Titel, Description und Summary
  // ======================================================================
  // Funktioniert ohne KI: Die Bausteine kommen aus der Vorlage der Kategorie
  // (titelIdeen, beschreibung, summaryVorlage) und aus der Tag-Liste (kurz, satz).
  // Später (Roadmap Punkt 5) kann hier eine KI die Texte verfeinern.

  const KLEINE_WOERTER = ["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"];

  /** "access to finance" -> "Access to Finance" */
  function titelSchreibweise(text) {
    return String(text).split(" ").map((w, i) =>
      i > 0 && KLEINE_WOERTER.includes(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)
    ).join(" ");
  }

  /** Thema aus einem Titel raten: "Impact Talk: AI for Good" -> "AI for Good" */
  function themaAusTitel(titel) {
    const t = String(titel || "").trim();
    if (!t || t.includes("[")) return "";
    const nachDoppelpunkt = t.includes(": ") ? t.split(": ").slice(1).join(": ") : t;
    return nachDoppelpunkt.trim();
  }

  function tagInfo(name) {
    return zustand.tags.find((t) => t.tag === name);
  }

  /** Stichworte aus den Tags: "small group, expert input & coaching" */
  function merkmale(tags, kategorie) {
    const w = (tags || []).filter((t) => t !== kategorie).map(tagInfo).filter(Boolean)
      .map((t) => t.kurz).slice(0, 3);
    if (w.length <= 1) return w[0] || "open to everyone";
    return w.slice(0, -1).join(", ") + " & " + w[w.length - 1];
  }

  // Zusätzliche Titel-Idee, abhängig von einem besonderen Tag
  const TITEL_DURCH_TAG = {
    "Small groups": (T) => `${T}: Small-Group Session`,
    "1:1 sessions": (T) => `${T} + 1:1 Clinic`,
    "Peer feedback/exchange": (T) => `${T}: Peer Feedback Round`,
    "Skillshare": (T) => `Skillshare: ${T}`,
    "Keynote/panel": (T) => `${T}: Keynote & Panel`,
    "Matchmaking": (T) => `${T} Matchmaking`,
    "Coaching/consulting": (T) => `${T}: Coaching Lab`,
    "Group work": (T) => `${T} Team Lab`,
    "Unwind": (T) => `${T} & Unwind`,
  };

  /** "16:00" + 45 Minuten -> "16:45" */
  function uhrzeitPlus(start, minuten) {
    const [h, m] = String(start).split(":").map(Number);
    const gesamt = (h || 0) * 60 + (m || 0) + minuten;
    return String(Math.floor(gesamt / 60) % 24).padStart(2, "0") + ":" + String(gesamt % 60).padStart(2, "0");
  }

  /**
   * Baut Vorschläge.
   * eingabe: { kategorie, thema, tags[], datum, startzeit, ort, kapazität, verantwortlich }
   * Ergebnis: { titel: [...], beschreibung: {worum, rahmen, …}, zusammenfassung }
   */
  function baueVorschlaege(eingabe) {
    const vorlage = zustand.templates.find((t) => t.kategorie === eingabe.kategorie) || {};
    const thema = (eingabe.thema || "").trim() || "[your topic]";
    const T = thema.startsWith("[") ? thema : titelSchreibweise(thema);
    const tags = eingabe.tags || [];

    const titel = (vorlage.titelIdeen || ["{thema}"]).map((muster) => muster.replace("{thema}", T));
    const extraTag = tags.find((t) => TITEL_DURCH_TAG[t]);
    if (extraTag) titel.splice(1, 0, TITEL_DURCH_TAG[extraTag](T));

    // Description: jeden Abschnitt aus der Vorlage füllen
    const kap = Number(eingabe["kapazität"]) > 0 ? String(eingabe["kapazität"]) : "[number of]";
    const ort = (eingabe.ort || "").trim() || "[location]";
    const fuelle = (text) => String(text || "")
      .replace(/\{thema\}/g, thema).replace(/\{ort\}/g, ort).replace(/\{kapazitaet\}/g, kap)
      .replace(/\{verantwortlich\}/g, (eingabe.verantwortlich || "").trim() || "[team]");
    const vb = vorlage.beschreibung && typeof vorlage.beschreibung === "object" ? vorlage.beschreibung : {};
    const beschreibung = {};
    BESCHREIBUNG_TEILE.forEach((t) => {
      if (t.schluessel === "agenda") {
        beschreibung.agenda = (vb.agenda || []).map(([minuten, punkt]) =>
          (eingabe.startzeit ? uhrzeitPlus(eingabe.startzeit, minuten) + " – " : "") + fuelle(punkt)).join("\n");
      } else {
        beschreibung[t.schluessel] = fuelle(vb[t.schluessel]);
      }
    });
    const saetze = tags.map(tagInfo).filter(Boolean).map((t) => t.satz).join(" ");
    if (saetze) beschreibung.rahmen = (beschreibung.rahmen + " " + saetze).trim();

    const zusammenfassung = String(vorlage.summaryVorlage || "{thema} – {merkmale}.")
      .replace(/\{thema\}/g, thema)
      .replace(/\{merkmale\}/g, merkmale(tags, eingabe.kategorie));

    return { titel: [...new Set(titel)].slice(0, 4), beschreibung, zusammenfassung };
  }

  // ======================================================================
  // 5. ANSICHTEN
  // ======================================================================
  const ANSICHTEN = {};

  // ---------- Filter (Month und List): Gruppe · Tags · Setting
  /** Alle Settings: feste Liste aus dem Modell (vorläufige Platzhalter bis Notion) + was sonst in den Events steht */
  function alleSettings() {
    const liste = (zustand.model && zustand.model.settings) || [];
    const extra = zustand.events.map((e) => String(e.setting || "").trim()).filter((x) => x && !liste.includes(x));
    return liste.concat([...new Set(extra)].sort());
  }
  function filterAktiv() {
    const f = zustand.filter;
    return Boolean(f.gruppe || f.tags.length || f.setting);
  }
  function passtZumFilter(e) {
    const f = zustand.filter;
    if (f.gruppe && gruppeVon(e.kategorie).name !== f.gruppe) return false;
    if (f.tags.length && !(e.tags || []).some((t) => f.tags.includes(t))) return false;
    if (f.setting && String(e.setting || "").trim() !== f.setting) return false;
    return true;
  }
  /** Filterleiste (HTML). "anzahl" = [passend, alle] für den Hinweis rechts */
  function filterLeiste(anzahl) {
    const f = zustand.filter;
    const settings = alleSettings();
    const gruppenKnoepfe = [["", "All"]].concat(GRUPPEN.map((g) => [g.name, g.name])).map(([wert, text]) => {
      const g = GRUPPEN.find((x) => x.name === wert);
      return `<button type="button" class="filter-chip ${g ? g.klasse : ""}" data-filter-gruppe="${esc(wert)}" aria-pressed="${f.gruppe === wert}" title="${g ? esc(g.text) : "Show all groups"}">${g ? '<span class="kat-punkt"></span>' : ""}${esc(text)}</button>`;
    }).join("");
    return `
      <div class="filter-leiste" role="group" aria-label="Filter events">
        <div class="filter-chips">${gruppenKnoepfe}</div>
        <details class="filter-menue" ${zustand.filterMenueOffen ? "open" : ""}>
          <summary class="${f.tags.length ? "aktiv" : ""}">Tags${f.tags.length ? ` · ${f.tags.length}` : ""} ▾</summary>
          <div class="filter-menue-inhalt">
            <input type="search" class="tag-suche" data-tag-suche placeholder="Find a tag …" aria-label="Find a tag" autocomplete="off">
            <p class="leise klein-text">Shows events with at least one of the ticked tags.</p>
            ${zustand.tags.map((t) => `<label class="haken" data-tag-name="${esc(t.tag.toLowerCase())}"><input type="checkbox" data-filter-tag="${esc(t.tag)}" ${f.tags.includes(t.tag) ? "checked" : ""}> ${esc(t.tag)}</label>`).join("")}
            <p class="leise klein-text tag-keine" hidden>No tag found.</p>
          </div>
        </details>
        ${f.tags.map((t) => `<button type="button" class="filter-chip gewaehlt" data-filter-tag-weg="${esc(t)}" title="Remove this tag from the filter">${esc(t)} ×</button>`).join("")}
        <label class="filter-auswahl ${f.setting ? "aktiv" : ""}">
          <span class="sr-only">Setting</span>
          <select data-filter-setting ${settings.length ? "" : "disabled"} title="${settings.length ? "Filter by setting (placeholder list until the Notion data is connected)" : "Settings come with the real data from Notion"}">
            ${settings.length
              ? `<option value="">All settings</option>${settings.map((x) => `<option ${x === f.setting ? "selected" : ""}>${esc(x)}</option>`).join("")}`
              : "<option>Setting · coming with Notion</option>"}
          </select>
        </label>
        ${filterAktiv() ? `<button type="button" class="knopf klein leise" data-filter-reset>Reset filter</button>` : ""}
        ${anzahl && filterAktiv() ? `<span class="filter-zahl leise">${anzahl[0]} of ${anzahl[1]} events shown</span>` : ""}
      </div>`;
  }
  /** Filterleiste bedienbar machen; bei jeder Änderung wird die Ansicht neu gezeichnet */
  function verbindeFilter(bereich) {
    const neu = (aenderung) => { Object.assign(zustand.filter, aenderung); zeichne(); };
    bereich.querySelectorAll("[data-filter-gruppe]").forEach((b) =>
      b.addEventListener("click", () => neu({ gruppe: b.dataset.filterGruppe })));
    bereich.querySelectorAll("[data-filter-tag]").forEach((c) => c.addEventListener("change", () => {
      const tags = zustand.filter.tags.filter((t) => t !== c.dataset.filterTag);
      if (c.checked) tags.push(c.dataset.filterTag);
      zustand.filterMenueOffen = true; // Tag-Menü nach dem Neuzeichnen offen lassen
      neu({ tags });
    }));
    // Klick irgendwo anders schließt das Tag-Menü (nur einmal einrichten)
    if (!verbindeFilter.klickDaneben) {
      verbindeFilter.klickDaneben = true;
      document.addEventListener("click", (ev) => {
        if (ev.target.closest(".filter-menue")) return;
        document.querySelectorAll(".filter-menue[open]").forEach((m) => { m.open = false; });
        zustand.filterMenueOffen = false;
      });
    }
    const menue = bereich.querySelector(".filter-menue");
    if (menue) menue.addEventListener("toggle", () => {
      zustand.filterMenueOffen = menue.open;
      if (menue.open) menue.querySelector("[data-tag-suche]").focus();
    });
    // Tag-Suche im Menü: blendet nur Einträge aus, nichts wird neu gezeichnet
    const tagSuche = bereich.querySelector("[data-tag-suche]");
    if (tagSuche) tagSuche.addEventListener("input", () => {
      const wort = tagSuche.value.trim().toLowerCase();
      let sichtbar = 0;
      bereich.querySelectorAll("[data-tag-name]").forEach((l) => {
        l.hidden = Boolean(wort) && !l.dataset.tagName.includes(wort);
        if (!l.hidden) sichtbar++;
      });
      bereich.querySelector(".tag-keine").hidden = sichtbar > 0;
    });
    bereich.querySelectorAll("[data-filter-tag-weg]").forEach((b) =>
      b.addEventListener("click", () => neu({ tags: zustand.filter.tags.filter((t) => t !== b.dataset.filterTagWeg) })));
    const auswahl = bereich.querySelector("[data-filter-setting]");
    if (auswahl) auswahl.addEventListener("change", () => neu({ setting: auswahl.value }));
    const reset = bereich.querySelector("[data-filter-reset]");
    if (reset) reset.addEventListener("click", () => { zustand.filterMenueOffen = false; neu({ gruppe: "", tags: [], setting: "" }); });
  }

  // Kleine Symbole für den Umschalter ("Pille" neben dem Titel)
  const SYMBOL_KALENDER = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>';
  const SYMBOL_LISTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>';

  /** Umschalter neben dem Titel zeigen. optionen = [[wert, Beschriftung, Symbol], …] */
  function zeigeUmschalter(optionen, aktiv, beiWahl) {
    const platz = document.getElementById("umschalter");
    platz.innerHTML = `<div class="pillen-umschalter" role="group" aria-label="Display">${optionen.map(([wert, text, symbol]) =>
      `<button type="button" data-wert="${wert}" aria-pressed="${wert === aktiv}">${symbol}${text}</button>`).join("")}</div>`;
    platz.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      if (b.dataset.wert !== aktiv) beiWahl(b.dataset.wert);
    }));
  }

  // ---------------------------------------------------------------- Year
  ANSICHTEN.year = {
    blaettern: true,
    titel: (d) => "Year " + d.getFullYear(),
    schritt: (d, r) => new Date(d.getFullYear() + r, d.getMonth(), 1),
    zeichne(d) {
      const jahr = d.getFullYear();
      const jahresEvents = eventsZwischen(new Date(jahr, 0, 1), new Date(jahr, 11, 31));
      const sollJahrGesamt = Object.values(sollJahr()).reduce((a, b) => a + b, 0);
      const jahresVergleich = vergleiche(jahresEvents, {}, zustand.model.zielAuslastung);
      const wenig = eventsMitWenigAnmeldungen();
      const wenigBald = wenig.filter((e) => anmeldeWarnung(e).art === "bald").length;
      const konflikte = terminKonflikte();
      const auffaelligeMonate = [];

      const kacheln = MONATE.map((name, i) => {
        const v = vergleichMonat(jahr, i + 1);
        if (v.abweichungen.length) auffaelligeMonate.push(name);
        const punkte = eventsImMonat(jahr, i + 1)
          .map((e) => `<span class="kat-punkt ${katKlasse(e.kategorie)}" title="${esc(e.titel)}"></span>`)
          .join("");
        const groesste = v.abweichungen.slice().sort((a, b) =>
          (b.abw === Infinity ? 9 : Math.abs(b.abw)) - (a.abw === Infinity ? 9 : Math.abs(a.abw)))[0];
        const istHeute = heute().getFullYear() === jahr && heute().getMonth() === i;
        return `
          <button class="kachel ${v.abweichungen.length ? "mit-abweichung" : ""} ${istHeute ? "heute-monat" : ""}" data-monat="${i + 1}"
                  aria-label="${name}: ${v.istGesamt} of ${v.sollGesamt} events. Open">
            <div class="kachel-kopf"><strong>${name}</strong>
              <span class="leise">${v.auslastung !== null ? "⌀ " + prozent(v.auslastung) : "open"}</span></div>
            <div><span class="zahl">${v.istGesamt}</span> <span class="leise">/ ${v.sollGesamt} events</span></div>
            <div class="mini-punkte">${punkte}</div>
            <div class="hinweis">${groesste ? "⚠ " + esc(groesste.text) : "✓ on plan"}</div>
          </button>`;
      }).join("");

      $inhalt.innerHTML = `
        <div class="kennzahlen">
          <div class="kennzahl"><div class="wert">${jahresEvents.length}</div><div class="label">events this year (target ${sollJahrGesamt})</div></div>
          <div class="kennzahl"><div class="wert">${jahresEvents.filter((e) => e.status === "Done").length}</div><div class="label">already done</div></div>
          <a class="kennzahl" href="#/deviations/${alsText(d)}/auslastung" title="Show details"><div class="wert">${jahresVergleich.auslastung !== null ? prozent(jahresVergleich.auslastung) : "–"}</div><div class="label">⌀ occupancy (target ${zustand.model.zielAuslastung}%) <span class="mehr">details →</span></div></a>
          <a class="kennzahl ${wenig.length ? "warnend" : ""}" href="#/deviations/${alsText(d)}/auslastung" title="Show details"><div class="wert">${wenig.length ? "⚠ " + wenig.length : "✓"}</div><div class="label">events with sign-ups &lt; ${zustand.einstellungen.mindestAnmeldungProzent}%${wenigBald ? ` (${wenigBald} upcoming)` : ""} <span class="mehr">details →</span></div></a>
          <a class="kennzahl ${konflikte.wochen.length || konflikte.tage.length ? "warnend" : ""}" href="#/deviations/${alsText(d)}/termine" title="Show details"><div class="wert">${konflikte.wochen.length || konflikte.tage.length ? "⚠ " + (konflikte.wochen.length + konflikte.tage.length) : "✓"}</div><div class="label">scheduling conflicts (${konflikte.wochen.length} weeks, ${konflikte.tage.length} days) <span class="mehr">details →</span></div></a>
          <a class="kennzahl ${auffaelligeMonate.length ? "warnend" : ""}" href="#/deviations/${alsText(d)}/abweichungen" title="Show details"><div class="wert">${auffaelligeMonate.length ? "⚠ " + auffaelligeMonate.length : "✓"}</div><div class="label">months deviating &gt; ${zustand.einstellungen.schwelleProzent}% <span class="mehr">details →</span></div></a>
          <a class="kennzahl ${eventsMitLuecken().length ? "warnend" : ""}" href="#/deviations/${alsText(d)}/fehlende-infos"><div class="wert">${eventsMitLuecken().length ? "⚠ " + eventsMitLuecken().length : "✓"}</div><div class="label">events with missing description info <span class="mehr">details →</span></div></a>
        </div>
        <div class="heatmap">${kacheln}</div>
        <div class="abschnitt">
          <div class="legende">${KATEGORIEN.map((k) =>
            `<span class="${katKlasse(k)}"><span class="kat-punkt"></span>${k}</span>`).join("")}</div>
        </div>
        <p class="leise abschnitt">Tip: click a month to open its calendar. “⌀” = average occupancy of events that already took place.</p>`;

      $inhalt.querySelectorAll(".kachel").forEach((k) =>
        k.addEventListener("click", () => geheZu("month", new Date(jahr, Number(k.dataset.monat) - 1, 1))));
    },
  };

  // ---------------------------------------------------------------- Quarter
  /** Ein Balken "Ist gegen Soll" */
  function balkenZeile(name, klasse, ist, soll, max, istText, sollText, abw) {
    const breite = max > 0 ? Math.min(100, (ist / max) * 100) : 0;
    const sollPos = max > 0 ? Math.min(100, (soll / max) * 100) : 0;
    const schwelle = zustand.einstellungen.schwelleProzent / 100;
    const abwKlasse = abw === null ? "" : Math.abs(abw) <= schwelle ? "passt" : abw < 0 ? "zu-wenig" : "zu-viel";
    return `
      <div class="balken-zeile ${klasse}">
        <div class="balken-name"><span class="kat-punkt"></span>${esc(name)}</div>
        <div class="balken-spur" title="Actual ${istText} · Target ${sollText}">
          <div class="balken-ist" style="width:${breite}%"></div>
          <div class="balken-soll" style="left:calc(${sollPos}% - 1px)"></div>
        </div>
        <div class="balken-wert"><strong>${istText}</strong> <span class="leise">/ ${sollText}</span><br>
          ${abw === null ? '<span class="abw leise">–</span>' : `<span class="abw ${abwKlasse}">${vorzeichenProzent(abw)}</span>`}</div>
      </div>`;
  }

  ANSICHTEN.quarter = {
    blaettern: true,
    titel: (d) => `Q${quartalVon(d)} ${d.getFullYear()} · ${MONATE_KURZ[(quartalVon(d) - 1) * 3]} – ${MONATE_KURZ[(quartalVon(d) - 1) * 3 + 2]}`,
    schritt: (d, r) => new Date(d.getFullYear(), (quartalVon(d) - 1 + r) * 3, 1),
    zeichne(d) {
      const jahr = d.getFullYear();
      const q = quartalVon(d);
      const v = vergleichQuartal(jahr, q);
      const max = Math.max(1, ...v.kategorien.map((k) => Math.max(k.ist, k.soll))) * 1.15;

      const zeilen = v.kategorien.map((k) =>
        balkenZeile(k.kat, katKlasse(k.kat), k.ist, k.soll, max, String(k.ist), String(k.soll),
          k.soll === 0 && k.ist === 0 ? null : k.abw)).join("");

      const auslastungZeile = balkenZeile("Occupancy", "kat-auslastung", v.auslastung || 0, v.ziel, Math.max(1.3, (v.auslastung || 0) * 1.1),
        v.auslastung !== null ? prozent(v.auslastung) : "–", prozent(v.ziel), v.auslastungAbw);

      const monatsLinks = [0, 1, 2].map((i) => {
        const monat = (q - 1) * 3 + i + 1;
        const vm = vergleichMonat(jahr, monat);
        return `<button class="knopf klein" data-monat="${monat}">${vm.abweichungen.length ? "⚠ " : ""}${MONATE[monat - 1]} · ${vm.istGesamt}/${vm.sollGesamt}</button>`;
      }).join("");

      $inhalt.innerHTML = `
        <div class="kennzahlen">
          <div class="kennzahl"><div class="wert">${v.istGesamt} <span class="leise" style="font-size:1rem">/ ${v.sollGesamt}</span></div><div class="label">events actual / target</div></div>
          <a class="kennzahl" href="#/deviations/${alsText(d)}/auslastung" title="Show details"><div class="wert">${v.auslastung !== null ? prozent(v.auslastung) : "–"}</div><div class="label">occupancy (target ${prozent(v.ziel)}) <span class="mehr">details →</span></div></a>
          <a class="kennzahl ${v.abweichungen.length ? "warnend" : ""}" href="#/deviations/${alsText(d)}/abweichungen" title="Show details"><div class="wert">${v.abweichungen.length ? "⚠ " + v.abweichungen.length : "✓"}</div><div class="label">deviations &gt; ${zustand.einstellungen.schwelleProzent}% <span class="mehr">details →</span></div></a>
        </div>
        ${abweichungsBanner(v, "this quarter")}
        <div class="gitter-2">
          <section class="karte">
            <h2>Category mix</h2>
            <p class="untertitel">Coloured bar = actual · black line = target from the model</p>
            <div class="abschnitt">${zeilen}</div>
          </section>
          <section class="karte">
            <h2>Occupancy</h2>
            <p class="untertitel">Registrations divided by spots – only events that already took place</p>
            <div class="abschnitt">${auslastungZeile}</div>
            <h3 class="abschnitt">Months in this quarter</h3>
            <div class="monats-links">${monatsLinks}</div>
          </section>
        </div>`;

      $inhalt.querySelectorAll("[data-monat]").forEach((b) =>
        b.addEventListener("click", () => geheZu("month", new Date(jahr, Number(b.dataset.monat) - 1, 1))));
    },
  };

  /** Hinweis-Kasten mit allen Abweichungen eines Zeitraums */
  function abweichungsBanner(v, wo) {
    if (!v.abweichungen.length) {
      return `<div class="banner ok"><span class="banner-symbol">✓</span><div><strong>All on plan.</strong>
        No deviation above ${zustand.einstellungen.schwelleProzent}% in ${wo}.</div></div>`;
    }
    return `<div class="banner warnung"><span class="banner-symbol">⚠</span><div>
      <strong>${v.abweichungen.length === 1 ? "1 deviation" : v.abweichungen.length + " deviations"} from the model in ${wo}</strong>
      <span class="leise">(threshold ${zustand.einstellungen.schwelleProzent}%)</span>
      <ul>${v.abweichungen.map((a) => `<li>${esc(a.text)} <span class="leise">(${vorzeichenProzent(a.abw)})</span></li>`).join("")}</ul>
    </div></div>`;
  }

  // ---------------------------------------------------------------- Month
  // Zwei Darstellungen, umschaltbar über die "Pille" neben dem Titel:
  //   Calendar = Monatsraster · Agenda = Liste Woche für Woche. Die Wahl merkt sich der Browser.
  // Daneben (bei beiden gleich): Kennzahlen oben, rechts "Needs attention" und "Plan check" (4 Gruppen).

  /** Dünner Anmelde-Balken (Anmeldungen / Plätze); rot, wenn zu wenige */
  function anmeldeBalken(e) {
    const q = anmeldeQuote(e);
    if (q === null || e.status === "Idea") return "";
    return `<span class="mini-balken ${anmeldeWarnung(e) ? "warnend" : ""}" aria-hidden="true"><span style="width:${Math.min(100, Math.round(q * 100))}%"></span></span>`;
  }

  /** Warum braucht ein Event Aufmerksamkeit? (Text für den Tooltip, leer = alles gut) */
  function eventProbleme(e) {
    const p = [];
    if (anmeldeWarnung(e)) p.push(anmeldeWarnung(e).text);
    if (beschreibungsStand(e) !== "ok") p.push(beschreibungsStand(e) === "keine" ? "No description yet" : "Missing: " + fehlendeTeile(e).join(", "));
    return p.join(" · ");
  }

  /** Was braucht in diesem Monat Aufmerksamkeit? Sortiert nach Dringlichkeit. */
  function monatsHinweise(jahr, monat, v) {
    const events = eventsImMonat(jahr, monat);
    const prefix = alsText(new Date(jahr, monat - 1, 1)).slice(0, 7);
    const datum = alsText(new Date(jahr, monat - 1, 1));
    const { maxProWoche, maxProTag } = zustand.einstellungen;
    const liste = [];
    events.filter((e) => anmeldeWarnung(e) && anmeldeWarnung(e).art === "bald").forEach((e) =>
      liste.push({ art: "Sign-ups", stufe: "kritisch", titel: e.titel, text: anmeldeWarnung(e).text, event: e.id }));
    events.filter((e) => e.status !== "Done" && beschreibungsStand(e) !== "ok").forEach((e) =>
      liste.push({ art: "Missing info", stufe: "warnung", titel: e.titel,
        text: beschreibungsStand(e) === "keine" ? "No description yet" : fehlendeTeile(e).length + " description parts missing", event: e.id }));
    v.abweichungen.forEach((a) =>
      liste.push({ art: "Plan", stufe: "plan", titel: a.text, text: "Compared with the blueprint", link: `#/deviations/${datum}/abweichungen` }));
    events.filter((e) => anmeldeWarnung(e) && anmeldeWarnung(e).art === "vorbei").forEach((e) =>
      liste.push({ art: "Turnout", stufe: "ruhig", titel: e.titel, text: anmeldeWarnung(e).text, event: e.id }));
    const k = terminKonflikte();
    k.tage.filter((t) => t.datum.startsWith(prefix)).forEach((t) =>
      liste.push({ art: "Schedule", stufe: "ruhig", titel: `${datumSchoen(t.datum)}: ${t.events.length} events`, text: `Your limit is ${maxProTag} per day`, link: `#/week/${t.datum}` }));
    k.wochen.filter((w) => w.events.some((e) => e.datum.startsWith(prefix))).forEach((w) =>
      liste.push({ art: "Schedule", stufe: "ruhig", titel: `Week ${kalenderwoche(alsDatum(w.start))}: ${w.events.length} events`, text: `Your limit is ${maxProWoche} per week`, link: `#/week/${w.start}` }));
    return liste;
  }

  /** Legende: die 3 Gruppen mit kurzer Erklärung */
  function gruppenLegende() {
    return `<div class="gruppen-legende">${GRUPPEN.map((g) => `
      <div class="${g.klasse}"><span class="kat-punkt"></span><span><strong>${g.name}</strong> ${esc(g.text)}
        <small>${g.kategorien.map(esc).join(" · ")}</small></span></div>`).join("")}</div>`;
  }

  /** Die Gruppen im Monat: Ist/Soll (nur Kategorien, die im Monat geprüft werden) */
  function gruppenStand(v) {
    return GRUPPEN.map((g) => {
      const kats = v.kategorien.filter((k) => g.kategorien.includes(k.kat));
      const geprueft = kats.filter((k) => k.geprueft && (k.ist || k.soll));
      const quartal = kats.filter((k) => !k.geprueft && k.ist);
      return {
        g, geprueft, quartal,
        ist: geprueft.reduce((s, k) => s + k.ist, 0),
        soll: geprueft.reduce((s, k) => s + k.soll, 0),
        auffaellig: geprueft.some((k) => k.auffaellig),
      };
    }).filter((x) => x.geprueft.length || x.quartal.length);
  }

  ANSICHTEN.month = {
    blaettern: true,
    titel: (d) => MONATE[d.getMonth()] + " " + d.getFullYear(),
    schritt: (d, r) => new Date(d.getFullYear(), d.getMonth() + r, 1),
    zeichne(d) {
      const jahr = d.getFullYear(), monat = d.getMonth() + 1;
      const v = vergleichMonat(jahr, monat);
      const erster = new Date(jahr, monat - 1, 1);
      const letzter = new Date(jahr, monat, 0);
      const start = wochenStart(erster);
      const ende = plusTage(wochenStart(letzter), 6);
      const heuteText = alsText(heute());
      const monatsEvents = eventsImMonat(jahr, monat);
      const darstellung = zustand.einstellungen.monatsAnsicht === "agenda" ? "agenda" : "calendar";
      const { maxProWoche, maxProTag } = zustand.einstellungen;

      // Umschalter neben dem Titel
      zeigeUmschalter([["calendar", "Calendar", SYMBOL_KALENDER], ["agenda", "Agenda", SYMBOL_LISTE]], darstellung, (wert) => {
        zustand.einstellungen.monatsAnsicht = wert;
        window.DataLayer.speichereEinstellungen(zustand.einstellungen);
        zeichne();
      });

      // ---- Kennzahlen
      const hinweise = monatsHinweise(jahr, monat, v);
      const kommend = monatsEvents.filter((e) => e.datum >= heuteText && e.status === "Published" && Number(e["kapazität"]) > 0);
      const plaetze = kommend.reduce((s, e) => s + Number(e["kapazität"]), 0);
      const angemeldet = kommend.reduce((s, e) => s + (Number(e.anmeldungen) || 0), 0);
      const planAbw = v.abweichungen.filter((a) => a.art === "anzahl").length;
      const kennzahlen = `
        <div class="kennzahlen monat-kennzahlen">
          <div class="kennzahl"><div class="label">Events this month</div><div class="wert">${monatsEvents.length}</div>
            <div class="label">${planAbw ? `<span class="text-kritisch">${planAbw} ${planAbw === 1 ? "category" : "categories"} off plan</span>` : "matches the blueprint"}</div></div>
          <div class="kennzahl"><div class="label">Occupancy (done)</div><div class="wert">${v.auslastung !== null ? prozent(v.auslastung) : "–"}</div>
            <div class="label">${v.auslastung !== null ? "target " + zustand.model.zielAuslastung + "%" : "no event done yet"}</div></div>
          <div class="kennzahl"><div class="label">Upcoming sign-ups</div><div class="wert">${plaetze ? prozent(angemeldet / plaetze) : "–"}</div>
            <div class="label">${plaetze ? `${angemeldet} of ${plaetze} spots · ${kommend.length} ${kommend.length === 1 ? "event" : "events"}` : "nothing published ahead"}</div></div>
          <div class="kennzahl"><div class="label">Needs attention</div><div class="wert">${hinweise.length || "✓"}</div>
            <div class="label">${hinweise.length ? [...new Set(hinweise.map((h) => h.art))].join(" · ") : "all good"}</div></div>
        </div>`;

      // ---- Calendar
      const kalender = () => {
        let zellen = WOCHENTAGE_KURZ.map((t) => `<div class="wochentag">${t}</div>`).join("");
        for (let tag = new Date(start); tag <= ende; tag = plusTage(tag, 1)) {
          const text = alsText(tag);
          const fremd = tag.getMonth() !== monat - 1;
          const alleAmTag = fremd ? [] : zustand.events.filter((e) => e.datum === text);
          const events = alleAmTag.filter(passtZumFilter).sort((a, b) => a.startzeit.localeCompare(b.startzeit));
          const chips = events.map((e) => {
            const problem = eventProbleme(e);
            return `
            <button class="ev-chip ${katKlasse(e.kategorie)} ${e.status === "Idea" ? "idee" : ""} ${e.status === "Done" ? "erledigt" : ""} ${problem && e.status !== "Done" ? "achtung" : ""}"
                    data-event="${esc(e.id)}" title="${esc(e.titel)} · ${esc(e.kategorie)} · ${esc(e.status)}${problem ? " · ⚠ " + esc(problem) : ""}">
              <span class="chip-kopf"><span class="kat-punkt"></span><span class="zeit">${esc(e.startzeit)}</span>${problem ? '<span class="chip-flagge" aria-label="Needs attention">!</span>' : ""}</span>
              <span class="chip-titel">${esc(e.titel)}</span>
              ${anmeldeBalken(e)}
            </button>`;
          }).join("");
          const konflikt = !fremd && alleAmTag.length > maxProTag;
          zellen += `
            <div class="tag-zelle ${fremd ? "fremd" : ""} ${text === heuteText ? "heute" : ""} ${events.length ? "" : "ohne-events"} ${konflikt ? "konflikt" : ""}">
              <button class="tag-nr" data-datum="${text}" title="Open week">${tag.getDate()}<span class="tag-nr-wt"> ${WOCHENTAGE_KURZ[(tag.getDay() + 6) % 7]}</span>${konflikt ? ` <span class="konflikt-text" title="${alleAmTag.length} events on the same day">⚠ ${alleAmTag.length}</span>` : ""}</button>
              ${chips}
            </div>`;
        }
        return `<div class="kalender">${zellen}</div>
          <p class="legende kalender-legende"><span>Thin bar = sign-ups · faded = done · <strong class="text-kritisch">!</strong> = needs attention</span></p>`;
      };

      // ---- Agenda (Woche für Woche)
      const agenda = () => {
        let html = "";
        for (let w = new Date(start); w <= letzter; w = plusTage(w, 7)) {
          const wEnde = plusTage(w, 6);
          const alleWoche = eventsZwischen(w, wEnde);
          const events = alleWoche.filter((e) => e.datum.startsWith(alsText(erster).slice(0, 7)) && passtZumFilter(e));
          const istJetzt = heuteText >= alsText(w) && heuteText <= alsText(wEnde);
          const zuViele = alleWoche.length > maxProWoche;
          const von = w.getMonth() === wEnde.getMonth() ? String(w.getDate()) : w.getDate() + " " + MONATE_KURZ[w.getMonth()];
          html += `
            <section class="agenda-woche ${istJetzt ? "jetzt" : ""}">
              <header class="agenda-kopf">
                <button class="link-knopf" data-woche="${alsText(w)}" title="Open week"><strong>Week ${kalenderwoche(w)}</strong></button>
                <span class="leise">${von} – ${wEnde.getDate()} ${MONATE_KURZ[wEnde.getMonth()]}${istJetzt ? " · this week" : ""}</span>
                <span class="agenda-notiz ${zuViele ? "warnend" : ""}">${zuViele ? `⚠ ${alleWoche.length} events this week – limit ${maxProWoche}` : events.length === 1 ? "1 event" : events.length ? events.length + " events" : ""}</span>
              </header>
              ${events.length ? events.map((e) => {
                const kap = Number(e["kapazität"]) || 0;
                const fehlt = beschreibungsStand(e) === "ok" ? 0 : fehlendeTeile(e).length;
                const tag = alsDatum(e.datum);
                return `
                <button class="agenda-zeile ${katKlasse(e.kategorie)} ${e.status === "Done" ? "erledigt" : ""}" data-event="${esc(e.id)}">
                  <span class="agenda-datum"><small>${WOCHENTAGE_KURZ[(tag.getDay() + 6) % 7]}</small><strong>${tag.getDate()}</strong></span>
                  <span class="agenda-titel"><strong>${esc(e.titel)}</strong>
                    <small><span class="kat-punkt"></span>${esc(e.kategorie)} · ${esc(e.startzeit)} · ${esc(e.ort || "no place yet")}</small></span>
                  <span class="agenda-status">${statusPille(e.status)}</span>
                  <span class="agenda-anmeldung">${kap ? `<small><strong>${Number(e.anmeldungen) || 0}</strong> / ${kap} spots</small>${anmeldeBalken(e)}` : '<small class="leise">no spots set</small>'}</span>
                  <span class="agenda-info ${fehlt ? "text-kritisch" : "leise"}">${fehlt ? (fehlt === BESCHREIBUNG_TEILE.length ? "no description" : fehlt + " missing") : "complete"}</span>
                </button>`;
              }).join("") : `<p class="agenda-leer leise">${filterAktiv() ? "No matching events." : "Nothing planned."}</p>`}
            </section>`;
        }
        return `<div class="agenda">${html}</div>`;
      };

      // ---- Seitenleiste
      const miniKalender = () => {
        let z = WOCHENTAGE_KURZ.map((t) => `<span class="mini-wt">${t[0]}</span>`).join("");
        for (let tag = new Date(start); tag <= ende; tag = plusTage(tag, 1)) {
          const text = alsText(tag);
          const fremd = tag.getMonth() !== monat - 1;
          const n = fremd ? 0 : zustand.events.filter((e) => e.datum === text).length;
          z += `<button class="mini-tag ${fremd ? "fremd" : ""} ${n ? "belegt" : ""} ${text === heuteText ? "heute" : ""}" data-datum="${text}"
                  ${fremd ? 'tabindex="-1"' : ""} title="${n ? n + (n === 1 ? " event" : " events") : "No events"} · open week">${tag.getDate()}</button>`;
        }
        return `<section class="seiten-karte"><h2>${MONATE[monat - 1]} at a glance</h2><div class="mini-kalender">${z}</div>
          <p class="leise klein-text">Darker = event on that day. Click a day to open its week.</p></section>`;
      };
      const MAX_HINWEISE = 5;
      const hinweisListe = hinweise.length ? hinweise.slice(0, MAX_HINWEISE).map((h) => `
        <button class="hinweis-zeile" ${h.event ? `data-event="${esc(h.event)}"` : `data-link="${esc(h.link)}"`}>
          <span class="hinweis-art ${h.stufe}">${esc(h.art)}</span>
          <span><strong>${esc(h.titel)}</strong><small>${esc(h.text)}</small></span>
        </button>`).join("") : '<p class="leise">Nothing to do – everything looks good.</p>';
      const gruppen = gruppenStand(v).map((x) => `
        <details class="gruppe-zeile ${x.g.klasse}">
          <summary>
            <span class="gruppe-name" title="${esc(x.g.text)}"><span class="kat-punkt"></span>${x.g.name}</span>
            <span class="gruppe-zahl ${x.auffaellig ? "text-kritisch" : ""}"><strong>${x.ist}</strong> / ${x.soll}</span>
            <span class="gruppe-balken ${x.auffaellig ? "warnend" : ""}"><span style="width:${x.soll ? Math.min(100, Math.round(100 * x.ist / x.soll)) : 100}%"></span></span>
          </summary>
          <ul>${x.geprueft.map((k) => `<li class="${k.auffaellig ? "text-kritisch" : ""}">${esc(k.kat)} <span>${k.ist} / ${k.soll}</span></li>`).join("")}
            ${x.quartal.map((k) => `<li class="leise">${esc(k.kat)} <span>${k.ist} · checked per quarter</span></li>`).join("")}</ul>
        </details>`).join("");
      const notiz = sollMonat(monat).notiz;

      $inhalt.innerHTML = `
        ${kennzahlen}
        ${filterLeiste([monatsEvents.filter(passtZumFilter).length, monatsEvents.length])}
        <div class="monat-layout">
          <div class="monat-haupt">${darstellung === "agenda" ? agenda() : kalender()}${gruppenLegende()}</div>
          <aside class="monat-seite">
            ${darstellung === "agenda" ? miniKalender() : ""}
            <section class="seiten-karte">
              <h2>Needs attention</h2>
              <div class="hinweis-liste">${hinweisListe}</div>
              <a class="mehr-link" href="#/deviations/${alsText(erster)}">${hinweise.length > MAX_HINWEISE ? `${hinweise.length - MAX_HINWEISE} more · ` : ""}All warnings →</a>
            </section>
            <section class="seiten-karte">
              <h2>Plan check</h2>
              ${notiz ? `<p class="leise klein-text">This month: ${esc(notiz)}</p>` : ""}
              <div class="gruppen-liste">${gruppen}</div>
              <p class="leise klein-text">Click a group to see its categories. Counts always include all events, also when a filter is set.</p>
            </section>
          </aside>
        </div>`;

      verbindeFilter($inhalt);
      $inhalt.querySelectorAll(".tag-nr, .mini-tag").forEach((b) =>
        b.addEventListener("click", () => geheZu("week", alsDatum(b.dataset.datum))));
      $inhalt.querySelectorAll("[data-woche]").forEach((b) =>
        b.addEventListener("click", () => geheZu("week", alsDatum(b.dataset.woche))));
      $inhalt.querySelectorAll("[data-event]").forEach((b) =>
        b.addEventListener("click", () => oeffneEvent(b.dataset.event)));
      $inhalt.querySelectorAll("[data-link]").forEach((b) =>
        b.addEventListener("click", () => { window.location.hash = b.dataset.link; }));
    },
  };

  // ---------------------------------------------------------------- Week
  /** Was sollte als Nächstes passieren? (Reminder-Hinweis) */
  function reminderHinweis(e) {
    const d = tageBis(e.datum);
    const offen = (e.aufgaben || []).filter((a) => !a.erledigt).map((a) => a.text);
    const tagVorher = (n) => datumSchoen(alsText(plusTage(alsDatum(e.datum), -n)));
    if (e.status === "Done" || d < 0) {
      if (offen.length) return { stufe: "ruhig", text: "📝 Follow-up still open: " + offen.join(", ") };
      return null;
    }
    if (e.status === "Idea") {
      return { stufe: d <= 30 ? "dringend" : "ruhig", text: `💡 Still an idea – confirm date, room and speaker${d <= 30 ? ` (only ${d} days left!)` : ""}.` };
    }
    if (e.status === "Planned") {
      if (d <= 21) return { stufe: "dringend", text: `📣 Not published yet – only ${d} days until the event!` };
      return { stufe: "ruhig", text: `📣 Publish on Eventbrite by ${tagVorher(21)} at the latest.` };
    }
    // Published
    if (offen.includes("Send reminder email")) {
      if (d <= 1) return { stufe: "dringend", text: `⏰ Send the reminder email ${d === 0 ? "first thing today" : "today"} – the event is ${d === 0 ? "today" : "tomorrow"}!` };
      if (d <= 7) return { stufe: "", text: `⏰ Send the reminder email on ${tagVorher(2)} (2 days before).` };
      return { stufe: "ruhig", text: `⏰ Reminder email scheduled for ${tagVorher(2)}.` };
    }
    return { stufe: "ruhig", text: "✓ Reminder has been sent." };
  }

  function eventKarte(e) {
    const kap = Number(e["kapazität"]) || 0;
    const quote = kap ? e.anmeldungen / kap : 0;
    const r = reminderHinweis(e);
    const aufgaben = (e.aufgaben || []).map((a, i) => `
      <li class="${a.erledigt ? "erledigt" : ""}">
        <input type="checkbox" data-aufgabe="${i}" ${a.erledigt ? "checked" : ""} id="a-${esc(e.id)}-${i}">
        <label for="a-${esc(e.id)}-${i}"><span>${esc(a.text)}</span></label>
      </li>`).join("");
    const offen = (e.aufgaben || []).filter((a) => !a.erledigt).length;
    return `
      <article class="event-karte ${katKlasse(e.kategorie)}" id="event-${esc(e.id)}" data-event="${esc(e.id)}">
        <div class="event-kopf">
          <div>
            ${e.zusammenfassung ? `<p class="summary">${esc(e.zusammenfassung)}</p>` : ""}
          </div>
          <div class="tags-zeile">
            <div class="tags">${(e.tags || []).length ? tagPillen(e.tags) : '<span class="leise klein-text">No tags yet</span>'}</div>
            <button type="button" class="knopf klein leise" data-tags-umschalten aria-expanded="${drawerStand.tagsOffen === e.id}">${drawerStand.tagsOffen === e.id ? "Done" : "✎ Tags"}</button>
          </div>
          ${drawerStand.tagsOffen === e.id ? `
          <div class="tag-waehler" role="group" aria-label="Choose tags">
            <p class="leise klein-text">Click to add or remove a tag – saved right away.</p>
            ${zustand.tags.map((t) => `<button type="button" class="tag-wahl" data-tag-wahl="${esc(t.tag)}" aria-pressed="${(e.tags || []).includes(t.tag)}" title="${esc(t.satz)}">${esc(t.tag)}</button>`).join("")}
          </div>` : ""}
        </div>
        <div class="event-meta">
          <span>🕒 ${esc(e.startzeit)}</span><span>📍 ${esc(e.ort)}</span>${e.setting ? `<span>🎭 ${esc(e.setting)}</span>` : ""}<span>👤 ${esc(e.verantwortlich)}</span>
          ${e.eventbriteId ? `<span title="Eventbrite ID (demo)">🎟 ${esc(e.eventbriteId)}</span>` : ""}
          ${e.kalenderId ? `<span title="Calendar ID (demo)">📅 ${esc(e.kalenderId)}</span>` : ""}
        </div>
        <div class="event-raster">
          <div>
            <strong>${esc(e.anmeldungen)}</strong> <span class="leise">of ${kap} spots registered</span>
            <div class="fortschritt ${quote > 1 ? "ueber" : ""}"><span style="width:${Math.min(100, quote * 100)}%"></span></div>
            <span class="leise" style="font-size:.82rem">${quote > 1 ? `⚠ overbooked (${prozent(quote)})` : prozent(quote) + " full"}</span>
          </div>
          <div>
            <strong>Tasks</strong> <span class="leise">(${offen ? offen + " open" : "all done"})</span>
            <ul class="aufgaben">${aufgaben || '<li class="leise">No tasks</li>'}</ul>
          </div>
        </div>
        ${anmeldeHinweis(e)}
        ${lueckenHinweis(e)}
        ${beschreibungsStand(e) !== "keine" ? `<section class="drawer-abschnitt beschreibung-offen"><h3>Description${beschreibungsStand(e) === "luecken" ? ' <span class="text-kritisch">· incomplete</span>' : ""}</h3>${beschreibungHtml(e.beschreibung, e.kategorie)}</section>` : ""}
        ${r ? `<div class="reminder ${r.stufe}">${esc(r.text)}</div>` : ""}
      </article>`;
  }

  /** Häkchen der Aufgaben verbinden (die Knöpfe stehen unten in der Schublade) */
  function verbindeEventKarten(bereich) {
    bereich.querySelectorAll(".event-karte").forEach((karte) => {
      const event = zustand.events.find((e) => e.id === karte.dataset.event);
      // Tags direkt hier wählen (ohne das ganze Formular); jede Änderung wird sofort gespeichert
      const umschalter = karte.querySelector("[data-tags-umschalten]");
      if (umschalter) umschalter.addEventListener("click", () => {
        drawerStand.tagsOffen = drawerStand.tagsOffen === event.id ? null : event.id;
        zeigeEventDrawer(event.id, true);
      });
      karte.querySelectorAll("[data-tag-wahl]").forEach((knopf) =>
        knopf.addEventListener("click", async () => {
          const tag = knopf.dataset.tagWahl;
          const tags = (event.tags || []).filter((t) => t !== tag);
          if (tags.length === (event.tags || []).length) tags.push(tag);
          // Reihenfolge wie in der festen Tag-Liste
          event.tags = zustand.tags.map((t) => t.tag).filter((t) => tags.includes(t));
          await window.DataLayer.speichereEvent(event);
          await ladeNeu();
          zeichne();
          zeigeMeldung(tags.includes(tag) ? `Tag “${tag}” added ✓` : `Tag “${tag}” removed`);
        }));
      karte.querySelectorAll("[data-aufgabe]").forEach((box) =>
        box.addEventListener("change", async () => {
          event.aufgaben[Number(box.dataset.aufgabe)].erledigt = box.checked;
          await window.DataLayer.speichereEvent(event);
          await ladeNeu();
          zeichne();
        }));
    });
  }

  // Wie lange dauert ein Event? Ende = letzte Uhrzeit in der Agenda ("21:00 – End"), sonst 2 Stunden
  function minutenVon(zeit) {
    const m = String(zeit || "").match(/(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function eventZeitraum(e) {
    const von = minutenVon(e.startzeit) ?? 9 * 60;
    const zeiten = String(normBeschreibung(e.beschreibung).agenda || "").split("\n")
      .map(minutenVon).filter((m) => m !== null && m > von);
    const bis = zeiten.length ? Math.max(...zeiten) : von + 120;
    return { von, bis: Math.max(bis, von + 30) };
  }
  function uhrzeit(minuten) {
    return String(Math.floor(minuten / 60)).padStart(2, "0") + ":" + String(minuten % 60).padStart(2, "0");
  }

  // Woche wie in Google Kalender: eine Spalte pro Tag, Events nach Uhrzeit
  ANSICHTEN.week = {
    blaettern: true,
    titel: (d) => {
      const s = wochenStart(d), e = plusTage(s, 6);
      const von = s.getMonth() === e.getMonth() ? String(s.getDate()) : s.getDate() + " " + MONATE_KURZ[s.getMonth()];
      return `Week ${kalenderwoche(s)} · ${von} – ${e.getDate()} ${MONATE_KURZ[e.getMonth()]}`;
    },
    schritt: (d, r) => plusTage(d, 7 * r),
    imJahr: (d, jahr) => wochenStart(d).getFullYear() === jahr || plusTage(wochenStart(d), 6).getFullYear() === jahr,
    zeichne(d) {
      const start = wochenStart(d);
      const heuteText = alsText(heute());
      const STUNDE = 52; // Höhe einer Stunde in Pixeln
      const tage = [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const tag = plusTage(start, i);
        const events = eventsZwischen(tag, tag).map((e) => Object.assign({ e }, eventZeitraum(e)))
          .sort((a, b) => a.von - b.von);
        // Überschneidungen nebeneinander zeigen: jedes Event bekommt eine "Spur"
        const spurEnde = [];
        events.forEach((x) => {
          let s = spurEnde.findIndex((ende) => ende <= x.von);
          if (s < 0) { s = spurEnde.length; spurEnde.push(0); }
          spurEnde[s] = x.bis;
          x.spur = s;
        });
        events.forEach((x) => { x.spuren = spurEnde.length; });
        return { tag, text: alsText(tag), events };
      });
      const alle = tage.flatMap((t) => t.events);
      const vonStd = Math.min(8, ...alle.map((x) => Math.floor(x.von / 60)));
      const bisStd = Math.min(24, Math.max(22, ...alle.map((x) => Math.ceil(x.bis / 60))));
      const hoehe = (bisStd - vonStd) * STUNDE;
      const y = (min) => ((min - vonStd * 60) / 60) * STUNDE;

      const { maxProWoche, maxProTag } = zustand.einstellungen;
      const kopf = tage.map((t, i) => `
        <button class="wk-tag-kopf ${t.text === heuteText ? "heute" : ""} ${t.events.length > maxProTag ? "konflikt" : ""}" data-datum="${t.text}"
                title="${t.events.length > maxProTag ? `⚠ ${t.events.length} events on this day (max. ${maxProTag})` : "Open month"}">
          <span>${WOCHENTAGE_KURZ[i]}${t.events.length > maxProTag ? " ⚠" : ""}</span><strong>${t.tag.getDate()}</strong>
        </button>`).join("");
      const konfliktTage = tage.filter((t) => t.events.length > maxProTag);
      const wochenWarnung = alle.length > maxProWoche || konfliktTage.length
        ? `<a class="banner warnung banner-link" href="#/deviations/${alsText(start)}/termine"><span class="banner-symbol">⚠</span><div>
            <strong>Scheduling: ${[alle.length > maxProWoche ? `${alle.length} events this week (max. ${maxProWoche})` : "",
              konfliktTage.length ? `${konfliktTage.length === 1 ? "1 day" : konfliktTage.length + " days"} with more than ${maxProTag} ${maxProTag === 1 ? "event" : "events"}` : ""]
              .filter(Boolean).join(" · ")}</strong>
            ${konfliktTage.length ? `<span class="leise">– ${konfliktTage.map((t) => esc(datumSchoen(t.text))).join(" · ")}</span>` : ""}</div></a>`
        : "";
      const zeiten = [];
      for (let h = vonStd + 1; h < bisStd; h++) zeiten.push(`<span style="top:${(h - vonStd) * STUNDE}px">${uhrzeit(h * 60)}</span>`);
      const spalten = tage.map((t) => `
        <div class="wk-spalte ${t.text === heuteText ? "heute" : ""}">
          ${t.events.map((x) => `
            <button class="wk-event ${katKlasse(x.e.kategorie)} ${x.e.status === "Idea" ? "idee" : ""}" data-event="${esc(x.e.id)}"
                    style="top:${y(x.von) + 1}px;height:${Math.max(22, y(x.bis) - y(x.von) - 3)}px;
                           left:calc(${(x.spur / x.spuren) * 100}% + 2px);width:calc(${100 / x.spuren}% - 4px)"
                    title="${esc(x.e.titel)} · ${esc(x.e.status)}">
              <strong>${beschreibungsStand(x.e) !== "ok" ? '<span class="chip-warnung">⚠</span> ' : ""}${anmeldeWarnung(x.e) ? `<span class="chip-warnung" title="${esc(anmeldeWarnung(x.e).text)}">👥</span> ` : ""}${esc(x.e.titel)}</strong>
              <span>${uhrzeit(x.von)} – ${uhrzeit(x.bis)}</span>
              <span>${esc(x.e.ort)}</span>
            </button>`).join("")}
        </div>`).join("");

      $inhalt.innerHTML = `
        ${wochenWarnung}
        <p class="leise" style="margin-top:0">${alle.length ? alle.length + (alle.length === 1 ? " event" : " events") + " this week · click an event for details" : "Nothing planned this week."}</p>
        <div class="wochen-raster-huelle">
          <div class="wochen-raster" style="--stunde:${STUNDE}px">
            <div class="wk-ecke"></div>${kopf}
            <div class="wk-zeiten" style="height:${hoehe}px">${zeiten.join("")}</div>
            <div class="wk-spalten" style="height:${hoehe}px">${spalten}</div>
          </div>
        </div>`;
      $inhalt.querySelectorAll(".wk-event").forEach((b) =>
        b.addEventListener("click", () => oeffneEvent(b.dataset.event)));
      $inhalt.querySelectorAll(".wk-tag-kopf").forEach((b) =>
        b.addEventListener("click", () => geheZu("month", alsDatum(b.dataset.datum))));
    },
  };

  // ---------------------------------------------------------------- Event-Schublade (Details + Bearbeiten)
  /** Event-Details öffnen: steht in der Adresse, damit "Zurück" und Neu-Laden funktionieren */
  function oeffneEvent(id) {
    geheZu(zustand.ansicht, zustand.datum, id);
  }
  function schliesseEvent() {
    if (!darfFormularVerlassen()) return;
    drawerStand.modus = "ansehen";
    if (leseAdresse().fokus) geheZu(zustand.ansicht, zustand.datum);
    else verbergeEventDrawer();
  }
  /** Beim Bearbeiten mit ungespeicherten Änderungen erst nachfragen */
  function darfFormularVerlassen() {
    if (drawerStand.modus !== "bearbeiten" || !drawerStand.geaendert || !drawerStand.geaendert()) return true;
    return window.confirm("You have unsaved changes. Discard them?");
  }

  const $drawer = document.getElementById("event-drawer");
  const $drawerSchatten = document.getElementById("drawer-schatten");
  // Was zeigt die Schublade gerade? modus "ansehen" = Details, "bearbeiten" = Formular
  const drawerStand = { id: null, modus: "ansehen", abbrechen: null, geaendert: null, tagsOffen: null };

  /** Kopf und Fußleiste der Schublade setzen und sie (falls zu) hereinfahren lassen */
  function fuelleDrawer({ pillen, titel, unter, fuss }) {
    document.getElementById("drawer-pillen").innerHTML = pillen || "";
    document.getElementById("drawer-titel").textContent = titel;
    document.getElementById("drawer-datum").textContent = unter || "";
    document.getElementById("drawer-fuss").innerHTML = fuss || "";
    const inhalt = document.getElementById("drawer-inhalt");
    inhalt.scrollTop = 0;
    if ($drawer.hidden) {
      $drawer.hidden = false;
      $drawerSchatten.hidden = false;
      // erst sichtbar machen, dann im nächsten Bild hereinfahren lassen
      requestAnimationFrame(() => requestAnimationFrame(() => {
        $drawer.classList.add("offen");
        $drawerSchatten.classList.add("offen");
      }));
      $drawer.focus();
    }
    return inhalt;
  }

  function zeigeEventDrawer(id, erzwingen) {
    // Wird gerade dieses Event bearbeitet? Dann das Formular nicht durch ein Neuzeichnen verlieren
    if (!erzwingen && drawerStand.modus === "bearbeiten" && drawerStand.id === id && !$drawer.hidden) return;
    const e = zustand.events.find((x) => x.id === id);
    if (!e) return verbergeEventDrawer();
    if (drawerStand.id !== id) drawerStand.tagsOffen = null; // Tag-Auswahl nur beim selben Event offen lassen
    Object.assign(drawerStand, { id, modus: "ansehen", abbrechen: null, geaendert: null });
    const z = eventZeitraum(e);
    const inhalt = fuelleDrawer({
      pillen: `${katPille(e.kategorie)} ${statusPille(e.status)} ${lueckenAbzeichen(e)} ${anmeldeAbzeichen(e)}`,
      titel: e.titel,
      unter: datumSchoen(e.datum, true) + " · " + uhrzeit(z.von) + " – " + uhrzeit(z.bis),
      fuss: `
        <button type="button" class="knopf klein" data-aktion="social">✨ Social post</button>
        <button type="button" class="knopf klein" data-aktion="mail">✉️ Reminder email</button>
        ${zustand.benutzer.kiMoeglich ? `<button type="button" class="knopf klein" data-aktion="ki">✨ ${beschreibungsStand(e) === "ok" ? "Improve" : "Complete"} with AI</button>` : ""}
        <span class="fuss-luecke"></span>
        <button type="button" class="knopf leise" data-aktion="schliessen">Close</button>
        <button type="button" class="knopf bearbeiten" data-aktion="bearbeiten">✎ Edit</button>`,
    });
    inhalt.innerHTML = eventKarte(e);
    verbindeEventKarten(inhalt);
    const fuss = document.getElementById("drawer-fuss");
    fuss.querySelector('[data-aktion="social"]').addEventListener("click", () => zeigeVorschlag(e, "social"));
    fuss.querySelector('[data-aktion="mail"]').addEventListener("click", () => zeigeVorschlag(e, "mail"));
    const ki = fuss.querySelector('[data-aktion="ki"]');
    if (ki) ki.addEventListener("click", () => kiFuerEvent(e));
    fuss.querySelector('[data-aktion="schliessen"]').addEventListener("click", schliesseEvent);
    fuss.querySelector('[data-aktion="bearbeiten"]').addEventListener("click", () => oeffneEventFormular(e));
  }
  function verbergeEventDrawer() {
    drawerStand.modus = "ansehen";
    if ($drawer.hidden) return;
    $drawer.classList.remove("offen");
    $drawerSchatten.classList.remove("offen");
    setTimeout(() => {
      if (!$drawer.classList.contains("offen")) {
        $drawer.hidden = true;
        $drawerSchatten.hidden = true;
      }
    }, 250);
  }
  /** Esc / × / Klick daneben: beim Bearbeiten erst abbrechen, sonst schließen */
  function drawerZurueck() {
    if (drawerStand.modus === "bearbeiten" && drawerStand.abbrechen) drawerStand.abbrechen();
    else schliesseEvent();
  }
  // Klick neben die Schublade: wie Esc (beim Bearbeiten abbrechen, sonst schließen)
  $drawerSchatten.addEventListener("click", drawerZurueck);
  function $dialogOffen() {
    const d = document.getElementById("dialog");
    return d && d.open;
  }
  // Esc schließt immer das Oberste: erst Ask AI, dann die Event-Schublade (Dialoge regeln Esc selbst)
  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Escape" || $dialogOffen()) return;
    const ki = document.getElementById("ki-fenster");
    if (ki && !ki.hidden) {
      ev.preventDefault();
      kiFensterOffen(false);
    } else if (!$drawer.hidden) {
      ev.preventDefault();
      drawerZurueck();
    }
  });

  // ---------------------------------------------------------------- Search
  /** Alles, was an einem Event durchsucht wird – mit Namen für die Trefferanzeige */
  function suchFelder(e) {
    const d = alsDatum(e.datum);
    return [
      ["Title", e.titel],
      ["Summary", e.zusammenfassung],
      ["Description", beschreibungText(e.beschreibung)],
      ["Missing", beschreibungsStand(e) === "ok" ? "" : "missing incomplete " + fehlendeTeile(e).join(", ")],
      ["Tags", (e.tags || []).join(", ")],
      ["Category", e.kategorie],
      ["Status", e.status],
      ["Location", e.ort],
      ["Setting", e.setting],
      ["Owner", e.verantwortlich],
      ["Tasks", (e.aufgaben || []).map((a) => a.text).join(", ")],
      ["Date", e.datum + " " + datumSchoen(e.datum, true) + " " + MONATE_KURZ[d.getMonth()] + " Q" + quartalVon(d)],
      ["IDs", [e.id, e.eventbriteId, e.kalenderId].filter(Boolean).join(" ")],
    ];
  }

  function suchWoerter(text) {
    return String(text || "").toLowerCase().split(/\s+/).filter(Boolean);
  }

  /** Text mit hervorgehobenen Suchwörtern (sicher für HTML) */
  function markiere(text, woerter) {
    const t = String(text || "");
    if (!woerter.length) return esc(t);
    const muster = new RegExp("(" + woerter.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return t.split(muster).map((teil, i) => (i % 2 ? `<mark>${esc(teil)}</mark>` : esc(teil))).join("");
  }

  /** Kurzer Textausschnitt rund um den ersten Treffer */
  function ausschnitt(text, woerter, laenge) {
    const t = String(text || "").replace(/\s+/g, " ");
    const pos = Math.min(...woerter.map((w) => t.toLowerCase().indexOf(w)).filter((p) => p >= 0));
    if (!isFinite(pos) || t.length <= laenge) return t;
    const start = Math.max(0, pos - 40);
    return (start > 0 ? "…" : "") + t.slice(start, start + laenge) + (start + laenge < t.length ? "…" : "");
  }

  /** Events, die zur Suche passen (jedes Wort muss irgendwo vorkommen) */
  function sucheEvents() {
    const s = zustand.suche;
    const woerter = suchWoerter(s.text);
    const heuteText = alsText(heute());
    return zustand.events
      .filter((e) => !s.kategorie || e.kategorie === s.kategorie)
      .filter((e) => !s.status || e.status === s.status)
      .filter((e) => !s.nurKommende || e.datum >= heuteText)
      .filter((e) => !s.nurLuecken || beschreibungsStand(e) !== "ok")
      .filter(passtZumFilter)
      .map((e) => {
        const felder = suchFelder(e);
        const alles = felder.map((f) => String(f[1] || "")).join(" \n ").toLowerCase();
        if (!woerter.every((w) => alles.includes(w))) return null;
        // In welchen Feldern (außer Titel) wurde etwas gefunden?
        const fundstellen = woerter.length
          ? felder.filter(([name, wert]) => name !== "Title" && woerter.some((w) => String(wert || "").toLowerCase().includes(w)))
          : [];
        return { e, fundstellen };
      })
      .filter(Boolean)
      .sort((a, b) => (a.e.datum + a.e.startzeit).localeCompare(b.e.datum + b.e.startzeit));
  }

  ANSICHTEN.search = {
    blaettern: false,
    titel: () => "List",
    zeichne() {
      const s = zustand.suche;
      const auswahl = (werte, aktuell, alle) => `<option value="">${alle}</option>` + werte.map((w) =>
        `<option ${w === aktuell ? "selected" : ""}>${esc(w)}</option>`).join("");
      $inhalt.innerHTML = `
        <section class="karte suchfilter">
          <label class="breit">Search for
            <input type="search" id="suche-gross" value="${esc(s.text)}" placeholder="e.g. funding, small groups, rooftop, November …" autocomplete="off">
          </label>
          <label>Category<select id="filter-kategorie">${auswahl(KATEGORIEN, s.kategorie, "All categories")}</select></label>
          <label>Status<select id="filter-status">${auswahl(STATUS, s.status, "All statuses")}</select></label>
          <div class="haken-gruppe">
            <label class="haken"><input type="checkbox" id="filter-kommend" ${s.nurKommende ? "checked" : ""}> Upcoming only</label>
            <label class="haken"><input type="checkbox" id="filter-luecken" ${s.nurLuecken ? "checked" : ""}> ⚠ Missing description info</label>
          </div>
          <p class="leise breit" style="margin:0;font-size:.82rem">Searches titles, summaries, descriptions, tags, locations, owners, tasks, dates and IDs.
            Several words = all must match. Tip: click a tag on a result to search for it.</p>
        </section>
        <div class="abschnitt">${filterLeiste()}</div>
        <div id="suchergebnisse" class="abschnitt"></div>`;

      const gross = document.getElementById("suche-gross");
      gross.addEventListener("input", () => setzeSuche({ text: gross.value }));
      document.getElementById("filter-kategorie").addEventListener("change", (ev) => setzeSuche({ kategorie: ev.target.value }));
      document.getElementById("filter-status").addEventListener("change", (ev) => setzeSuche({ status: ev.target.value }));
      document.getElementById("filter-kommend").addEventListener("change", (ev) => setzeSuche({ nurKommende: ev.target.checked }));
      document.getElementById("filter-luecken").addEventListener("change", (ev) => setzeSuche({ nurLuecken: ev.target.checked }));
      verbindeFilter($inhalt);
      zeichneSuchergebnisse();
      if (document.activeElement !== document.getElementById("suche")) gross.focus();
    },
  };

  function zeichneSuchergebnisse() {
    const ziel = document.getElementById("suchergebnisse");
    if (!ziel) return;
    const woerter = suchWoerter(zustand.suche.text);
    const treffer = sucheEvents();
    const kopf = `<p class="leise" style="margin-top:0">${treffer.length} ${treffer.length === 1 ? "event" : "events"} found${woerter.length ? ` for “${esc(zustand.suche.text.trim())}”` : ""}</p>`;
    if (!treffer.length) {
      ziel.innerHTML = kopf + `<div class="karte"><p style="margin:0">No events match. Try fewer words or reset the filters.</p></div>`;
      return;
    }
    ziel.innerHTML = kopf + treffer.map(({ e, fundstellen }) => `
      <article class="treffer klickbar ${katKlasse(e.kategorie)}" data-event="${esc(e.id)}" tabindex="0"
               aria-label="${esc(e.titel)} – show details">
        <div class="treffer-datum"><strong>${alsDatum(e.datum).getDate()}</strong><span>${MONATE_KURZ[alsDatum(e.datum).getMonth()]}</span></div>
        <div class="treffer-inhalt">
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${katPille(e.kategorie)} ${statusPille(e.status)} ${lueckenAbzeichen(e)} ${anmeldeAbzeichen(e)}
            <span class="leise" style="font-size:.82rem">${esc(datumSchoen(e.datum))} · ${esc(e.startzeit)} · ${markiere(e.ort, woerter)}</span></div>
          <h3>${markiere(e.titel, woerter)}</h3>
          ${e.zusammenfassung ? `<p class="summary">${markiere(e.zusammenfassung, woerter)}</p>` : ""}
          ${fundstellen.filter(([name]) => !["Summary", "Location", "Category", "Status", "Tags", "Missing"].includes(name)).slice(0, 2).map(([name, wert]) =>
            `<p class="fundstelle"><span>${name}:</span> ${markiere(ausschnitt(wert, woerter, 140), woerter)}</p>`).join("")}
          <div class="tags">${(e.tags || []).map((t) => `<button class="tag tag-knopf" data-tag="${esc(t)}">${markiere(t, woerter)}</button>`).join("")}</div>
        </div>
        <div class="treffer-aktionen">
          <button class="knopf klein bearbeiten" data-bearbeiten="${esc(e.id)}">✎ Edit</button>
        </div>
      </article>`).join("");

    // Klick auf die Zeile (aber nicht auf einen Knopf darin) öffnet die Details
    ziel.querySelectorAll(".treffer[data-event]").forEach((zeile) => {
      zeile.addEventListener("click", (ev) => {
        if (!ev.target.closest("button, a")) oeffneEvent(zeile.dataset.event);
      });
      zeile.addEventListener("keydown", (ev) => {
        if ((ev.key === "Enter" || ev.key === " ") && ev.target === zeile) {
          ev.preventDefault();
          oeffneEvent(zeile.dataset.event);
        }
      });
    });
    ziel.querySelectorAll("[data-bearbeiten]").forEach((b) => b.addEventListener("click", () =>
      oeffneEventFormular(zustand.events.find((x) => x.id === b.dataset.bearbeiten))));
    ziel.querySelectorAll("[data-tag]").forEach((b) => b.addEventListener("click", () => {
      setzeSuche({ text: b.dataset.tag });
      const gross = document.getElementById("suche-gross");
      if (gross) gross.value = b.dataset.tag;
    }));
  }

  /** Suche ändern: Ergebnisse neu zeichnen, ohne das Eingabefeld zu verlieren */
  function setzeSuche(aenderung) {
    Object.assign(zustand.suche, aenderung);
    const oben = document.getElementById("suche");
    if ("text" in aenderung && oben.value !== zustand.suche.text) oben.value = zustand.suche.text;
    if (zustand.ansicht === "search") {
      zeichneSuchergebnisse();
    } else {
      geheZu("search", zustand.datum);
    }
  }

  // ---------------------------------------------------------------- Deviations
  ANSICHTEN.deviations = {
    blaettern: false,
    titel: () => "Deviations & warnings",
    zeichne(d, fokus) {
      const e = zustand.einstellungen;
      const zahlFeld = (id, wert, min, max, text) =>
        `<label class="einstellung"><span>${text}</span><input type="number" id="${id}" min="${min}" max="${max}" value="${wert}"></label>`;
      $inhalt.innerHTML = `
        <nav class="sprung-leiste" aria-label="Jump to section">
          <a href="#fehlende-infos-box">Missing info</a><a href="#blueprint-box">Blueprint</a>
          <a href="#warnliste">Deviations</a><a href="#auslastung-box">Occupancy &amp; sign-ups</a>
          <a href="#termine-box">Scheduling</a><a href="#einstellungen-box">Settings</a>
        </nav>
        <div id="fehlende-infos-box"></div>
        <div id="warn-bereich">
          <div id="blueprint-box"></div>
          <div id="warnliste"></div>
          <div id="auslastung-box"></div>
          <div id="termine-box"></div>
        </div>
        <section class="karte abschnitt" id="einstellungen-box">
          <h2>When should we warn you?</h2>
          <p class="untertitel">These settings are saved in this browser.</p>
          <h3 class="abschnitt">Deviation from the blueprint</h3>
          <p class="untertitel">A month or quarter is flagged when actual and target differ by more than this percentage
            (number of events per category, or occupancy).</p>
          <div class="schwelle abschnitt">
            <input type="range" id="schwelle" min="5" max="100" step="5" value="${e.schwelleProzent}" aria-label="Threshold in percent">
            <output id="schwelle-wert">${e.schwelleProzent}%</output>
            <button class="knopf klein leise" id="schwelle-standard">Default (20%)</button>
          </div>
          <h3 class="abschnitt">Sign-ups and scheduling</h3>
          <div class="einstellungen-reihe abschnitt">
            ${zahlFeld("min-anmeldung", e.mindestAnmeldungProzent, 5, 100, "Warn when sign-ups are below (% of spots)")}
            ${zahlFeld("max-woche", e.maxProWoche, 1, 20, "Max. events per week")}
            ${zahlFeld("max-tag", e.maxProTag, 1, 10, "Max. events per day")}
            <button class="knopf klein leise" id="regeln-standard">Defaults (50% · 2 · 1)</button>
          </div>
        </section>`;
      zeichneFehlendeInfos();
      zeichneAlleWarnungen();

      const ziel = { "fehlende-infos": "fehlende-infos-box", abweichungen: "warnliste", auslastung: "auslastung-box",
        termine: "termine-box", blueprint: "blueprint-box" }[fokus];
      if (ziel) document.getElementById(ziel).scrollIntoView({ block: "start" });

      // Sprung-Leiste: nur scrollen, die Adresse (#/deviations/...) bleibt
      $inhalt.querySelectorAll(".sprung-leiste a").forEach((a) => a.addEventListener("click", (ev) => {
        ev.preventDefault();
        document.querySelector(a.getAttribute("href")).scrollIntoView({ behavior: "smooth", block: "start" });
      }));
      // Klick auf ein Event in den Listen öffnet es in der Schublade
      document.getElementById("warn-bereich").addEventListener("click", (ev) => {
        const knopf = ev.target.closest("[data-event]");
        if (knopf) oeffneEvent(knopf.dataset.event);
      });

      const speichere = async () => {
        zeichneAlleWarnungen();
        await window.DataLayer.speichereEinstellungen(zustand.einstellungen);
      };
      const regler = document.getElementById("schwelle");
      const setzeSchwelle = (wert) => {
        zustand.einstellungen.schwelleProzent = wert;
        regler.value = wert;
        document.getElementById("schwelle-wert").textContent = wert + "%";
        speichere();
      };
      regler.addEventListener("input", () => setzeSchwelle(Number(regler.value)));
      document.getElementById("schwelle-standard").addEventListener("click", () => setzeSchwelle(20));
      const felder = { "min-anmeldung": "mindestAnmeldungProzent", "max-woche": "maxProWoche", "max-tag": "maxProTag" };
      Object.entries(felder).forEach(([id, schluessel]) => {
        const feld = document.getElementById(id);
        feld.addEventListener("change", () => {
          const wert = Math.round(Number(feld.value));
          if (!wert || wert < Number(feld.min) || wert > Number(feld.max)) { feld.value = zustand.einstellungen[schluessel]; return; }
          zustand.einstellungen[schluessel] = wert;
          speichere();
        });
      });
      document.getElementById("regeln-standard").addEventListener("click", () => {
        Object.assign(zustand.einstellungen, { mindestAnmeldungProzent: 50, maxProWoche: 2, maxProTag: 1 });
        Object.entries(felder).forEach(([id, schluessel]) => { document.getElementById(id).value = zustand.einstellungen[schluessel]; });
        speichere();
      });
    },
  };

  function zeichneAlleWarnungen() {
    zeichneBlueprint();
    zeichneWarnliste();
    zeichneAuslastung();
    zeichneTermine();
    aktualisiereWarnZaehler();
  }

  /** Der Blueprint: Soll für jeden Monat und jedes Quartal, plus die bewussten Ausnahmen */
  function zeichneBlueprint() {
    const basisM = (zustand.model.basisMonat || {}).soll || {};
    const basisQ = (zustand.model.basisQuartal || {}).soll || {};
    const summe = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    const ausnahmen = zustand.model.monate.filter((m) => m.notiz || Object.keys(m.ausnahmen || {}).length);
    const zeilen = KATEGORIEN.map((kat) => {
      const proMonat = basisM[kat] || 0, extraQ = basisQ[kat] || 0;
      const abweichend = ausnahmen.filter((m) => kat in (m.ausnahmen || {}))
        .map((m) => `${MONATE_KURZ[m.monat - 1]}: ${m.ausnahmen[kat]}`);
      return `<tr>
        <td>${katPille(kat)}</td>
        <td class="zahl">${proMonat || '<span class="leise">–</span>'}</td>
        <td class="zahl">${proMonat * 3 + extraQ || '<span class="leise">–</span>'}</td>
        <td>${proMonat ? "monthly" : extraQ ? "quarterly" : "only in some months"}</td>
        <td class="leise">${abweichend.join(" · ") || "–"}</td>
      </tr>`;
    }).join("");
    document.getElementById("blueprint-box").innerHTML = `
      <section class="karte abschnitt">
        <h2>Blueprint (model)</h2>
        <p class="untertitel">The standard plan every month and quarter is compared with automatically.
          <strong>Blueprint month:</strong> ${summe(basisM)} events. <strong>Blueprint quarter:</strong> 3 blueprint months
          + ${summe(basisQ)} quarterly events = ${summe(basisM) * 3 + summe(basisQ)} events. Monthly categories are checked every month,
          quarterly ones only per quarter. Target occupancy: ${zustand.model.zielAuslastung}%.</p>
        <div class="tabellen-rahmen"><table class="tabelle abschnitt">
          <thead><tr><th>Category</th><th class="zahl">Per month</th><th class="zahl">Per quarter</th><th>Rhythm</th><th>Exceptions (target in that month)</th></tr></thead>
          <tbody>${zeilen}</tbody></table></div>
        ${ausnahmen.length ? `<h3 class="abschnitt">Planned exceptions</h3>
          <ul class="ausnahmen-liste">${ausnahmen.map((m) => `<li><strong>${MONATE[m.monat - 1]}:</strong> ${esc(m.notiz || "")}
            <span class="leise">(${Object.entries(m.ausnahmen || {}).map(([k, n]) => esc(k) + " " + n).join(", ")})</span></li>`).join("")}</ul>` : ""}
      </section>`;
  }

  /** Auslastung (Done-Events) und Events mit zu wenigen Anmeldungen */
  function zeichneAuslastung() {
    const jahr = zustand.model.jahr;
    const ziel = zustand.model.zielAuslastung / 100;
    const schwelle = zustand.einstellungen.schwelleProzent / 100;
    const min = zustand.einstellungen.mindestAnmeldungProzent;
    const heuteText = alsText(heute());
    const zelle = (v) => {
      if (v.auslastung === null) return '<td class="zahl leise">–</td><td class="zahl leise">–</td>';
      const abw = (v.auslastung - ziel) / ziel;
      const klasse = Math.abs(abw) <= schwelle ? "passt" : abw < 0 ? "zu-wenig" : "zu-viel";
      return `<td class="zahl"><strong>${prozent(v.auslastung)}</strong></td><td class="zahl"><span class="abw ${klasse}">${vorzeichenProzent(abw)}</span></td>`;
    };
    const fertig = (liste) => liste.filter((e) => e.status === "Done" && Number(e["kapazität"]) > 0);
    const monatsZeilen = MONATE.map((name, i) => {
      const evs = eventsImMonat(jahr, i + 1), v = vergleichMonat(jahr, i + 1);
      const f = fertig(evs);
      return `<tr><td><a href="#/month/${alsText(new Date(jahr, i, 1))}">${name}</a></td>${zelle(v)}
        <td class="zahl">${f.length || '<span class="leise">–</span>'}</td>
        <td class="zahl">${f.reduce((s, e) => s + Number(e.anmeldungen || 0), 0) || '<span class="leise">–</span>'}</td>
        <td class="zahl">${f.reduce((s, e) => s + Number(e["kapazität"]), 0) || '<span class="leise">–</span>'}</td></tr>`;
    }).join("");
    const katZeilen = KATEGORIEN.map((kat) => {
      const evs = zustand.events.filter((e) => e.kategorie === kat && e.datum.startsWith(String(jahr)));
      const v = vergleiche(evs, {}, zustand.model.zielAuslastung);
      const f = fertig(evs);
      const quoten = f.map(anmeldeQuote);
      return `<tr><td>${katPille(kat)}</td>${zelle(v)}<td class="zahl">${f.length || '<span class="leise">–</span>'}</td>
        <td class="zahl leise">${quoten.length ? prozent(Math.min(...quoten)) + " – " + prozent(Math.max(...quoten)) : "–"}</td></tr>`;
    }).join("");
    const wenig = eventsMitWenigAnmeldungen().sort((a, b) => {
      const ak = a.datum >= heuteText, bk = b.datum >= heuteText;
      if (ak !== bk) return ak ? -1 : 1;
      return ak ? a.datum.localeCompare(b.datum) : b.datum.localeCompare(a.datum);
    });
    document.getElementById("auslastung-box").innerHTML = `
      <section class="karte abschnitt ${wenig.length ? "rahmen-warnung" : ""}">
        <h2>${wenig.length ? "⚠ " : "✓ "}Events with low sign-ups <span class="leise">(${wenig.length} below ${min}%)</span></h2>
        <p class="untertitel">An event gets a warning when fewer than ${min}% of its spots are taken: past events (“Done”) as
          low turnout, upcoming events from ${VORLAUF_TAGE} days before the date (earlier, few sign-ups are normal).</p>
        ${wenig.length ? `<div class="tabellen-rahmen"><table class="tabelle abschnitt">
          <thead><tr><th>Date</th><th>Event</th><th>Status</th><th class="zahl">Sign-ups</th><th class="zahl">Full</th><th>What to do</th></tr></thead>
          <tbody>${wenig.map((e) => {
            const w = anmeldeWarnung(e);
            return `<tr class="${w.art === "vorbei" ? "vergangen" : ""}">
              <td style="white-space:nowrap">${esc(datumSchoen(e.datum))}${w.art === "bald" ? ' <span class="abzeichen kritisch">soon</span>' : ""}</td>
              <td><button type="button" class="link-knopf" data-event="${esc(e.id)}">${katPille(e.kategorie)}<br><strong>${esc(e.titel)}</strong></button></td>
              <td>${statusPille(e.status)}</td>
              <td class="zahl">${Number(e.anmeldungen) || 0} / ${e["kapazität"]}</td>
              <td class="zahl"><span class="abw zu-wenig">${prozent(anmeldeQuote(e))}</span></td>
              <td class="tipp">${w.art === "bald" ? "Promote now: social post, member reminder, ask partners to share." : "Low turnout – check date, topic and promotion; maybe a smaller room next time."}</td>
            </tr>`;
          }).join("")}</tbody></table></div>` : `<p class="leise">No event below ${min}%. 🎉</p>`}
      </section>
      <section class="karte abschnitt">
        <h2>Occupancy in detail</h2>
        <p class="untertitel">Occupancy = registrations ÷ spots, only for events that already took place (“Done”).
          Target: ${zustand.model.zielAuslastung}%. Above 100% means the waiting list was let in.</p>
        <div class="gitter-2">
          <div><h3 class="abschnitt">Per month</h3>
            <div class="tabellen-rahmen"><table class="tabelle abschnitt">
              <thead><tr><th>Month</th><th class="zahl">Occupancy</th><th class="zahl">vs. target</th><th class="zahl">Events done</th><th class="zahl">Sign-ups</th><th class="zahl">Spots</th></tr></thead>
              <tbody>${monatsZeilen}</tbody></table></div></div>
          <div><h3 class="abschnitt">Per category (whole year)</h3>
            <div class="tabellen-rahmen"><table class="tabelle abschnitt">
              <thead><tr><th>Category</th><th class="zahl">Occupancy</th><th class="zahl">vs. target</th><th class="zahl">Events done</th><th class="zahl">Range</th></tr></thead>
              <tbody>${katZeilen}</tbody></table></div></div>
        </div>
      </section>`;
  }

  /** Terminplan-Konflikte: zu viele Events pro Woche und mehrere Events am selben Tag */
  function zeichneTermine() {
    const { maxProWoche, maxProTag } = zustand.einstellungen;
    const k = terminKonflikte();
    const wochenZeilen = k.wochen.map((w) => {
      const start = alsDatum(w.start), ende = plusTage(start, 6);
      return `<tr>
        <td style="white-space:nowrap"><a href="#/week/${w.start}"><strong>Week ${kalenderwoche(start)}</strong></a><br>
          <span class="leise">${start.getDate()} ${MONATE_KURZ[start.getMonth()]} – ${ende.getDate()} ${MONATE_KURZ[ende.getMonth()]}</span></td>
        <td class="zahl"><span class="abw zu-viel">${w.events.length}</span> <span class="leise">/ ${maxProWoche}</span></td>
        <td>${eventMiniListe(w.events, (e) => WOCHENTAGE_KURZ[(alsDatum(e.datum).getDay() + 6) % 7])}</td>
      </tr>`;
    }).join("");
    const tagZeilen = k.tage.map((t) => `<tr>
        <td style="white-space:nowrap"><a href="#/week/${t.datum}"><strong>${esc(datumSchoen(t.datum))}</strong></a></td>
        <td class="zahl"><span class="abw zu-viel">${t.events.length}</span> <span class="leise">/ ${maxProTag}</span></td>
        <td>${eventMiniListe(t.events, (e) => e.startzeit)}</td>
      </tr>`).join("");
    const viele = k.wochen.length + k.tage.length;
    document.getElementById("termine-box").innerHTML = `
      <section class="karte abschnitt ${viele ? "rahmen-warnung" : ""}">
        <h2>${viele ? "⚠ " : "✓ "}Scheduling <span class="leise">(${k.wochen.length} weeks with more than ${maxProWoche} events · ${k.tage.length} days with more than ${maxProTag} ${maxProTag === 1 ? "event" : "events"})</span></h2>
        <p class="untertitel">Too many events in one week or on one day stretch the team and split the audience.
          All events of the year count, including ideas. Limits can be changed under “Settings”.</p>
        <h3 class="abschnitt">Days with more than ${maxProTag} ${maxProTag === 1 ? "event" : "events"}</h3>
        ${tagZeilen ? `<div class="tabellen-rahmen"><table class="tabelle abweichungs-tabelle abschnitt">
          <thead><tr><th>Day</th><th class="zahl">Events</th><th>Which ones</th></tr></thead><tbody>${tagZeilen}</tbody></table></div>`
          : '<p class="leise">No day is over the limit. 🎉</p>'}
        <h3 class="abschnitt">Weeks with more than ${maxProWoche} events</h3>
        ${wochenZeilen ? `<div class="tabellen-rahmen"><table class="tabelle abweichungs-tabelle abschnitt">
          <thead><tr><th>Week</th><th class="zahl">Events</th><th>Which ones</th></tr></thead><tbody>${wochenZeilen}</tbody></table></div>`
          : '<p class="leise">No week is over the limit. 🎉</p>'}
      </section>`;
  }

  /** Liste aller Events, bei denen Infos in der Description fehlen (kommende zuerst) */
  function zeichneFehlendeInfos() {
    const heuteText = alsText(heute());
    const liste = eventsMitLuecken().sort((a, b) => {
      const ak = a.datum >= heuteText, bk = b.datum >= heuteText;
      if (ak !== bk) return ak ? -1 : 1;
      return ak ? a.datum.localeCompare(b.datum) : b.datum.localeCompare(a.datum);
    });
    const box = document.getElementById("fehlende-infos-box");
    box.innerHTML = `
      <section class="karte abschnitt ${liste.length ? "rahmen-warnung" : ""}">
        <h2>${liste.length ? "⚠ " : "✓ "}Missing event information <span class="leise">(${liste.length} ${liste.length === 1 ? "event" : "events"})</span></h2>
        <p class="untertitel">Events whose description is empty or incomplete. Upcoming events first – fix these before publishing.</p>
        ${liste.length ? `<div class="tabellen-rahmen"><table class="tabelle abschnitt">
          <thead><tr><th>Date</th><th>Event</th><th>Status</th><th>What's missing</th><th></th></tr></thead>
          <tbody>${liste.map((e) => `<tr class="${e.datum >= heuteText ? "" : "vergangen"}">
            <td style="white-space:nowrap">${esc(datumSchoen(e.datum))}${e.datum >= heuteText && tageBis(e.datum) <= 30 ? ' <span class="abzeichen kritisch">soon</span>' : ""}</td>
            <td>${katPille(e.kategorie)}<br><strong>${esc(e.titel)}</strong></td>
            <td>${statusPille(e.status)}</td>
            <td>${beschreibungsStand(e) === "keine" ? '<strong class="text-kritisch">No description at all</strong>' : esc(fehlendeTeile(e).join(", "))}</td>
            <td><button class="knopf klein bearbeiten" data-ergaenzen="${esc(e.id)}">✎ Fill in</button></td>
          </tr>`).join("")}</tbody></table></div>` : '<p class="leise">All events have a complete description. 🎉</p>'}
      </section>`;
    box.querySelectorAll("[data-ergaenzen]").forEach((b) => b.addEventListener("click", () =>
      oeffneEventFormular(zustand.events.find((x) => x.id === b.dataset.ergaenzen))));
  }

  /** Was steckt hinter einer Abweichung (welche Events) und was kann man tun? */
  function abweichungDetails(a, events, vorbei) {
    if (a.art === "auslastung") {
      return {
        events: events.filter((e) => e.status === "Done" && Number(e["kapazität"]) > 0),
        zusatz: (e) => prozent(Number(e.anmeldungen || 0) / Number(e["kapazität"])) + " full",
        bedeutung: a.abw > 0 ? "overbooked" : "too empty",
        tipp: a.abw > 0
          ? "Events were fuller than planned – consider bigger rooms, more spots or an extra date."
          : "Fewer people came than planned – promote earlier, send reminders, or choose smaller rooms.",
      };
    }
    const diff = a.ist - a.soll;
    return {
      events: events.filter((e) => e.kategorie === a.kat),
      zusatz: (e) => e.status,
      bedeutung: a.soll === 0 ? "not planned" : diff < 0 ? "too few events" : "more than planned",
      tipp: a.soll === 0
        ? "Not in the model for this period – check if this was intended, or adjust the model."
        : diff < 0
          ? vorbei
            ? `Period is over – ${-diff} ${a.kat} ${-diff === 1 ? "event is" : "events are"} missing. Consider making up for ${-diff === 1 ? "it" : "them"} later.`
            : `Plan ${-diff} more ${a.kat} ${-diff === 1 ? "event" : "events"} to reach the target.`
          : `${diff} more than planned – fine if intended, otherwise move ${diff === 1 ? "it" : "some"} to a quieter period.`,
    };
  }

  /** Kleine anklickbare Event-Liste für die Abweichungs-Tabelle */
  function eventMiniListe(events, zusatz) {
    if (!events.length) return '<span class="leise">No events yet</span>';
    return `<div class="ev-mini-liste">${events.map((e) => `
      <button type="button" class="ev-chip ${katKlasse(e.kategorie)} ${e.status === "Idea" ? "idee" : ""}" data-event="${esc(e.id)}"
              title="Open ${esc(e.titel)}">
        <span class="zeit">${esc(datumKurz(e.datum))}</span> ${esc(e.titel)}${zusatz ? ` <span class="leise">· ${esc(zusatz(e))}</span>` : ""}
      </button>`).join("")}</div>`;
  }
  function datumKurz(text) {
    const [, m, t] = text.split("-").map(Number);
    return t + " " + MONATE_KURZ[m - 1];
  }

  function zeichneWarnliste() {
    const jahr = zustand.model.jahr;
    const schwelle = zustand.einstellungen.schwelleProzent;
    const heuteText = alsText(heute());
    const zeilen = (art) => {
      const anzahl = art === "month" ? 12 : 4;
      let html = "", zeitraeume = 0;
      for (let i = 1; i <= anzahl; i++) {
        const v = art === "month" ? vergleichMonat(jahr, i) : vergleichQuartal(jahr, i);
        if (!v.abweichungen.length) continue;
        zeitraeume++;
        const name = art === "month" ? MONATE[i - 1] : "Q" + i;
        const ziel = art === "month" ? alsText(new Date(jahr, i - 1, 1)) : alsText(new Date(jahr, (i - 1) * 3, 1));
        const ende = art === "month" ? new Date(jahr, i, 0) : new Date(jahr, i * 3, 0);
        const vorbei = alsText(ende) < heuteText;
        const events = art === "month" ? eventsImMonat(jahr, i) : eventsImQuartal(jahr, i);
        v.abweichungen.forEach((a, n) => {
          const istAuslastung = a.art === "auslastung";
          const klasse = a.abw < 0 ? "zu-wenig" : "zu-viel";
          const det = abweichungDetails(a, events, vorbei);
          html += `<tr class="${vorbei ? "vergangen" : ""} ${n === 0 ? "erste-zeile" : ""}">
            <td>${n === 0 ? `<a href="#/${art}/${ziel}"><strong>${name}</strong></a><br><span class="leise">${vorbei ? "over" : "open"}</span>` : ""}</td>
            <td>${istAuslastung ? "📊 Occupancy" : katPille(a.kat)}</td>
            <td class="zahl">${istAuslastung ? prozent(a.ist) : a.ist}</td>
            <td class="zahl">${istAuslastung ? prozent(a.soll) : a.soll}</td>
            <td class="zahl"><span class="abw ${klasse}">${vorzeichenProzent(a.abw)}</span></td>
            <td><strong>${esc(det.bedeutung)}</strong><br><span class="tipp">${esc(det.tipp)}</span></td>
            <td>${eventMiniListe(det.events, det.zusatz)}</td>
          </tr>`;
        });
      }
      return { html, zeitraeume };
    };
    const m = zeilen("month"), q = zeilen("quarter");

    // Jahresblick je Kategorie: Ist gegen Soll (Blueprint), und was in offenen Quartalen noch fehlt
    const sollJ = sollJahr();
    const jahresZeilen = KATEGORIEN.map((kat) => {
      let ist = 0, fehlen = 0;
      [1, 2, 3, 4].forEach((q) => {
        const n = eventsImQuartal(jahr, q).filter((e) => e.kategorie === kat).length;
        ist += n;
        if (alsText(new Date(jahr, q * 3, 0)) >= heuteText) fehlen += Math.max(0, (sollQuartal(q).soll[kat] || 0) - n);
      });
      const soll = sollJ[kat] || 0;
      const abw = soll > 0 ? (ist - soll) / soll : ist > 0 ? Infinity : 0;
      const klasse = Math.abs(abw) <= schwelle / 100 ? "passt" : abw < 0 ? "zu-wenig" : "zu-viel";
      return `<tr>
        <td>${katPille(kat)}</td>
        <td class="zahl">${ist}</td><td class="zahl">${soll}</td>
        <td class="zahl"><span class="abw ${klasse}">${soll === 0 && ist === 0 ? "–" : vorzeichenProzent(abw)}</span></td>
        <td>${fehlen ? `⚠ ${fehlen} still to plan this year` : '<span class="leise">✓ rest of the year covered</span>'}</td>
      </tr>`;
    }).join("");

    const tabelle = (titel, z, leerText) => `
      <section class="karte abschnitt ${z.zeitraeume ? "rahmen-warnung" : ""}">
        <h2>${z.zeitraeume ? "⚠ " : "✓ "}${titel} <span class="leise">(${z.zeitraeume} flagged)</span></h2>
        ${z.html ? `<div class="tabellen-rahmen"><table class="tabelle abweichungs-tabelle abschnitt">
          <thead><tr><th>Period</th><th>What</th><th class="zahl">Actual</th><th class="zahl">Target</th><th class="zahl">Deviation</th><th>Meaning &amp; what to do</th><th>Events behind it</th></tr></thead>
          <tbody>${z.html}</tbody></table></div>` : `<p class="leise">${leerText}</p>`}
      </section>`;
    document.getElementById("warnliste").innerHTML = `
      <section class="karte abschnitt">
        <h2>Deviations from the blueprint</h2>
        <p class="untertitel">For each month and quarter, the app counts the events per category and compares them with the blueprint (target, see above).
          A period is flagged when they differ by more than ${schwelle}%. Occupancy (registrations ÷ spots) only counts events marked “Done”.
          Click an event to open it, or a period to see its calendar.</p>
        <h3 class="abschnitt">Year ${jahr} at a glance</h3>
        <div class="tabellen-rahmen"><table class="tabelle abschnitt">
          <thead><tr><th>Category</th><th class="zahl">Actual</th><th class="zahl">Target</th><th class="zahl">Deviation</th><th>Rest of the year</th></tr></thead>
          <tbody>${jahresZeilen}</tbody></table></div>
      </section>` +
      tabelle("Months", m, "No month deviates more than the threshold. 🎉") +
      tabelle("Quarters", q, "No quarter deviates more than the threshold. 🎉");
  }

  // ---------------------------------------------------------------- Templates
  ANSICHTEN.templates = {
    blaettern: false,
    titel: () => "Templates",
    zeichne() {
      const jahr = zustand.model.jahr;
      $inhalt.innerHTML = `
        <p class="leise" style="margin-top:0">Each category has a template. It is used for new event drafts, for title, description and summary suggestions,
          and for social post and email suggestions. Placeholders like <code>{titel}</code>, <code>{datum}</code>, <code>{uhrzeit}</code>,
          <code>{ort}</code> and <code>{summary}</code> are filled in automatically; <code>{thema}</code> is the event's topic,
          <code>{kapazitaet}</code> the number of spots and <code>{verantwortlich}</code> the owner.</p>
        <div class="vorlagen">${zustand.templates.map((t, i) => {
          const anzahl = zustand.events.filter((e) => e.kategorie === t.kategorie && e.datum.startsWith(String(jahr))).length;
          const thema = (text) => esc(text).replace(/\{thema\}/g, '<span class="platzhalter">topic</span>');
          return `
          <article class="karte vorlage ${katKlasse(t.kategorie)}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">${katPille(t.kategorie)}
              <span class="leise" style="font-size:.82rem">${anzahl} events in ${jahr}</span></div>
            <div class="titel-vorlage" title="Title template">${esc(t.titelVorlage)}</div>
            <p style="margin:0">${thema((t.beschreibung && t.beschreibung.worum) || "")}</p>
            <div class="tags">${tagPillen(t.tags)}</div>
            <details><summary>Description template</summary><div class="beschreibung-vorlage">${BESCHREIBUNG_TEILE.map((teil) => {
              const wert = (t.beschreibung || {})[teil.schluessel];
              const text = Array.isArray(wert) ? wert.map(([min, punkt]) => `+${min} min – ${punkt}`).join("\n") : wert || "";
              return `<h5>${esc(teil.frage)}</h5><pre>${text ? thema(text) : '<span class="fehlt-text">⚠ Missing in template</span>'}</pre>`;
            }).join("")}</div></details>
            <details><summary>Title ideas</summary><ul class="ideen">${(t.titelIdeen || []).map((x) => `<li>${thema(x)}</li>`).join("")}</ul></details>
            <details><summary>Summary template</summary><pre>${thema(t.summaryVorlage || "")}</pre></details>
            <details><summary>Social post text</summary><pre>${esc(t.socialText)}</pre></details>
            <details><summary>Email text</summary><pre>${esc(t.mailText)}</pre></details>
            <button class="knopf haupt klein" data-vorlage="${i}">+ New event from template</button>
          </article>`;
        }).join("")}</div>
        <section class="karte abschnitt">
          <h2>Tags</h2>
          <p class="untertitel">The fixed tag list. Each tag adds a keyword to the summary and a sentence to the description suggestion.</p>
          <div class="tabellen-rahmen"><table class="tabelle abschnitt">
            <thead><tr><th>Tag</th><th>Summary keyword</th><th>Description sentence</th><th class="zahl">Events</th></tr></thead>
            <tbody>${zustand.tags.map((t) => `<tr><td><span class="tag">${esc(t.tag)}</span></td><td>${esc(t.kurz)}</td>
              <td class="leise">${esc(t.satz)}</td><td class="zahl">${zustand.events.filter((e) => (e.tags || []).includes(t.tag)).length}</td></tr>`).join("")}</tbody>
          </table></div>
        </section>`;
      $inhalt.querySelectorAll("[data-vorlage]").forEach((b) =>
        b.addEventListener("click", () => oeffneEventFormular(entwurfAusVorlage(zustand.templates[Number(b.dataset.vorlage)]))));
    },
  };

  // ---------------------------------------------------------------- Connections
  const VERBINDUNG_FARBE = { notion: "#2b2320", eventbrite: "#d2552e", gmail: "#d9677a", gcal: "#d99a1e" };
  const VERBINDUNG_KUERZEL = { notion: "N", eventbrite: "Eb", gmail: "M", gcal: "31" };

  ANSICHTEN.connections = {
    blaettern: false,
    titel: () => "Connections",
    async zeichne() {
      const liste = await window.DataLayer.ladeVerbindungen();
      $inhalt.innerHTML = `
        <p class="leise" style="margin-top:0">${liste.some((v) => v.verbunden)
          ? "Gmail is connected through your Google login. The other services will follow – their numbers and names are still fictional demo data."
          : "This is where the real services will be connected later. Nothing is connected in the demo – all numbers and names are fictional."}</p>
        <div class="verbindungen">${liste.map((v) => `
          <article class="karte verbindung">
            <div class="verbindung-logo" style="background:${VERBINDUNG_FARBE[v.id] || "var(--akzent)"}" aria-hidden="true">${VERBINDUNG_KUERZEL[v.id] || "?"}</div>
            <h2>${esc(v.name)}</h2>
            <span class="verbindung-status ${v.verbunden ? "verbunden" : ""}">${v.verbunden ? "✓ connected" : "not connected (demo)"}</span>
            <p style="margin:0">${esc(v.zweck)}</p>
            ${v.jetzt ? `<p style="margin:0;font-size:.88rem"><strong>Now:</strong> ${esc(v.jetzt)}</p>` : ""}
            <p class="leise" style="margin:0;font-size:.88rem"><strong>Later:</strong> ${esc(v.spaeter)}</p>
            ${v.verbunden ? "" : '<button class="knopf klein" disabled title="Coming in a later stage">Connect (soon)</button>'}
          </article>`).join("")}</div>
        <section class="karte abschnitt">
          <h2>What's next</h2>
          <ol>
            <li>Notion as data source (read-only)</li>
            <li>Target vs. actual with real model data</li>
            <li>Eventbrite: create drafts from templates</li>
            <li>Google Calendar and Gmail (login, minimal permissions)</li>
            <li>Social suggestions and email intelligence with AI</li>
          </ol>
          <p class="leise" style="margin-bottom:0">Technically, only the file <code>data-layer.js</code> is swapped – the interface stays the same.</p>
        </section>`;
    },
  };

  // ======================================================================
  // 6. DIALOGE
  // ======================================================================
  const $dialog = document.getElementById("dialog");
  const $dialogInhalt = document.getElementById("dialog-inhalt");

  function oeffneDialog(html) {
    $dialogInhalt.innerHTML = html;
    $dialogInhalt.querySelectorAll("[data-schliessen]").forEach((b) =>
      b.addEventListener("click", () => $dialog.close()));
    if (typeof $dialog.showModal === "function") $dialog.showModal();
    else $dialog.setAttribute("open", "");
  }
  // Klick neben das Fenster schließt es
  $dialog.addEventListener("click", (ev) => {
    if (ev.target === $dialog) $dialog.close();
  });

  /** Platzhalter wie {titel} in einem Vorlagen-Text ersetzen */
  function fuelleVorlage(text, e) {
    const werte = {
      titel: e.titel,
      datum: datumSchoen(e.datum, true),
      uhrzeit: e.startzeit,
      ort: e.ort,
      kategorie: e.kategorie,
      summary: e.zusammenfassung || "",
      tickets: normBeschreibung(e.beschreibung).tickets,
      agenda: normBeschreibung(e.beschreibung).agenda,
    };
    return String(text || "").replace(/\{(\w+)\}/g, (alles, name) => (name in werte ? werte[name] : alles))
      .replace(/\n{3,}/g, "\n\n");
  }

  /** Social-Post- oder Mail-Vorschlag aus der passenden Vorlage */
  function zeigeVorschlag(e, art) {
    const vorlage = zustand.templates.find((t) => t.kategorie === e.kategorie);
    if (!vorlage) {
      zeigeMeldung("There is no template for this category.");
      return;
    }
    const text = fuelleVorlage(art === "social" ? vorlage.socialText : vorlage.mailText, e);
    const testMail = art === "mail" && zustand.benutzer.mailMoeglich;
    oeffneDialog(`
      <div class="dialog-kopf"><h2>${art === "social" ? "✨ Social post suggestion" : "✉️ Reminder email suggestion"}</h2>
        <button class="knopf rund leise" data-schliessen aria-label="Close">×</button></div>
      <div class="dialog-koerper">
        <p class="leise" style="margin-top:0">Based on the “${esc(vorlage.kategorie)}” template – you can still edit the text here.</p>
        <div class="formular">
          ${art === "mail" ? `<label class="breit">Subject
            <input id="vorschlag-betreff" type="text" value="${esc("Reminder: " + e.titel)}"></label>` : ""}
          <label class="breit">Text
          <textarea id="vorschlag-text" rows="12">${esc(text)}</textarea></label></div>
        ${testMail ? `<p class="test-hinweis">🧪 <strong>Test:</strong> “Send test to me” sends this email only to
          <strong>${esc(zustand.benutzer.email)}</strong> – not to participants.</p>` : ""}
        <p class="leise" style="font-size:.82rem">Later (roadmap): suggestions will be refined with AI${art === "mail" ? " and saved as a Gmail draft" : ""}.</p>
      </div>
      <div class="dialog-fuss">
        <button class="knopf leise" data-schliessen>Close</button>
        ${testMail ? `<button class="knopf" id="test-senden">✉️ Send test to me</button>` : ""}
        <button class="knopf haupt" id="kopieren">Copy text</button>
      </div>`);
    if (testMail) {
      const knopf = document.getElementById("test-senden");
      knopf.addEventListener("click", async () => {
        knopf.disabled = true;
        knopf.textContent = "Sending …";
        try {
          const antwort = await window.DataLayer.sendeTestMail(
            document.getElementById("vorschlag-betreff").value,
            document.getElementById("vorschlag-text").value);
          zeigeMeldung(`Test email sent to ${antwort.an} ✓`);
          knopf.textContent = "✓ Sent – send again";
        } catch (fehler) {
          zeigeMeldung("Could not send: " + fehler.message);
          knopf.textContent = "✉️ Send test to me";
        }
        knopf.disabled = false;
      });
    }
    document.getElementById("kopieren").addEventListener("click", async () => {
      const feld = document.getElementById("vorschlag-text");
      try {
        await navigator.clipboard.writeText(feld.value);
      } catch (err) {
        feld.select();
        document.execCommand("copy");
      }
      zeigeMeldung("Text copied ✓");
    });
  }

  const STANDARD_AUFGABEN = ["Ask speaker", "Book room", "Create Eventbrite page",
    "Plan social post", "Send reminder email"];

  /** Häufigster Wert eines Feldes bei Events einer Kategorie (z. B. übliche Startzeit) */
  function ueblich(kategorie, feld, ersatz) {
    const zaehler = {};
    zustand.events.filter((e) => e.kategorie === kategorie)
      .forEach((e) => { zaehler[e[feld]] = (zaehler[e[feld]] || 0) + 1; });
    const sortiert = Object.entries(zaehler).sort((a, b) => b[1] - a[1]);
    return sortiert.length ? sortiert[0][0] : ersatz;
  }

  /** Ein neuer Entwurf (noch ohne id) aus einer Vorlage */
  function entwurfAusVorlage(t) {
    return {
      titel: t.titelVorlage,
      datum: alsText(plusTage(heute(), 21)),
      startzeit: ueblich(t.kategorie, "startzeit", "18:00"),
      kategorie: t.kategorie,
      status: "Idea",
      ort: ueblich(t.kategorie, "ort", "Loft – Event Space"),
      "kapazität": Number(ueblich(t.kategorie, "kapazität", 30)),
      anmeldungen: 0,
      verantwortlich: "Community Lead",
      eventbriteId: "",
      kalenderId: "",
      tags: t.tags.slice(),
      zusammenfassung: "",
      beschreibung: normBeschreibung(null),
      aufgaben: STANDARD_AUFGABEN.map((text) => ({ text, erledigt: false })),
      ausVorlage: true, // nur für die Überschrift im Formular, wird nicht gespeichert
    };
  }

  /** Formular zum Anlegen (ohne id) oder Bearbeiten (mit id) */
  /** Ein leeres neues Event mit Standardwerten */
  function leeresEvent() {
    return {
      titel: "", datum: alsText(zustand.datum || heute()), startzeit: "18:00", kategorie: KATEGORIEN[0],
      status: "Idea", ort: "Loft – Event Space", "kapazität": 30, anmeldungen: 0,
      verantwortlich: "Community Lead", eventbriteId: "", kalenderId: "", tags: [],
      zusammenfassung: "", beschreibung: normBeschreibung(null),
      aufgaben: STANDARD_AUFGABEN.map((text) => ({ text, erledigt: false })),
    };
  }

  function oeffneEventFormular(vorlage) {
    const neu = !vorlage || !vorlage.id;
    const e = vorlage || leeresEvent();
    const jahr = zustand.model.jahr;
    const eb = normBeschreibung(e.beschreibung);
    const team = [...new Set(zustand.events.map((x) => x.verantwortlich))].sort();
    const orte = [...new Set(zustand.events.map((x) => x.ort))].sort();
    const auswahl = (werte, aktuell) => werte.map((w) =>
      `<option ${w === aktuell ? "selected" : ""}>${esc(w)}</option>`).join("");
    // Tags, die es in der Liste nicht (mehr) gibt, trotzdem anzeigen, damit nichts verloren geht
    const alleTags = [...new Set(zustand.tags.map((t) => t.tag).concat(e.tags || []))];
    const tagAuswahl = alleTags.map((t) => `
      <label class="tag-wahl"><input type="checkbox" name="tags" value="${esc(t)}" ${(e.tags || []).includes(t) ? "checked" : ""}><span>${esc(t)}</span></label>`).join("");

    // Das Formular erscheint in der Schublade rechts (Ask AI wird dafür geschlossen, der Chat bleibt erhalten)
    const kiFenster = document.getElementById("ki-fenster");
    if (kiFenster && !kiFenster.hidden) kiFensterOffen(false);
    const abbrechen = () => {
      if (!darfFormularVerlassen()) return;
      const { fokus } = leseAdresse();
      drawerStand.modus = "ansehen";
      if (fokus && zustand.events.some((x) => x.id === fokus)) zeigeEventDrawer(fokus, true);
      else verbergeEventDrawer();
    };
    Object.assign(drawerStand, { id: e.id || null, modus: "bearbeiten", abbrechen, geaendert: null });
    const drawerInhalt = fuelleDrawer({
      titel: neu ? (e.ausVorlage ? "New draft from template" : "New event") : "Edit event",
      unter: neu ? "Fill in the details and click Save" : e.titel,
      fuss: `
        ${neu ? "" : '<button type="button" class="knopf gefahr leise" id="loeschen">Delete</button>'}
        <span class="fuss-luecke"></span>
        <button type="button" class="knopf leise" data-schliessen>Cancel</button>
        <button type="submit" class="knopf bearbeiten" form="event-formular">Save</button>`,
    });
    // Kleiner Baustein: Beschriftung (+ Zusatz) und Eingabefeld
    const feldHtml = (beschriftung, eingabe, zusatz, extra) =>
      `<label class="f-feld" ${extra || ""}><span class="f-label">${beschriftung}${zusatz ? " " + zusatz : ""}</span>${eingabe}</label>`;
    const pflicht = '<span class="pflicht">required</span>';
    drawerInhalt.innerHTML = `
      <form id="event-formular" class="drawer-formular" novalidate>
        <section class="f-abschnitt">
          ${feldHtml("Title", `<input name="titel" required value="${esc(e.titel)}" placeholder="e.g. Storytelling for Impact Startups">`, pflicht)}
          <div class="f-reihe">
            ${feldHtml("Category", `<select name="kategorie">${auswahl(KATEGORIEN, e.kategorie)}</select>`)}
            ${feldHtml("Status", `<select name="status">${auswahl(STATUS, e.status)}</select>`)}
          </div>
          <div class="f-reihe">
            ${feldHtml("Date", `<input type="date" name="datum" required min="${jahr}-01-01" max="${jahr}-12-31" value="${esc(e.datum)}">`, pflicht)}
            ${feldHtml("Start time", `<input type="time" name="startzeit" value="${esc(e.startzeit)}">`)}
          </div>
          <div class="f-reihe">
            ${feldHtml("Location", `<input name="ort" list="orte" value="${esc(e.ort)}">`)}
            ${feldHtml("Owner", `<input name="verantwortlich" list="team" value="${esc(e.verantwortlich)}">`, '<span class="f-hilfe">a role, no real names</span>')}
          </div>
          <div class="f-reihe">
            ${feldHtml("Setting", `<select name="setting"><option value="">– none –</option>${alleSettings().map((x) => `<option ${x === e.setting ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>`, '<span class="f-hilfe">used for filtering</span>')}
          </div>
        </section>

        <section class="f-abschnitt">
          <h3>Tags</h3>
          <div class="tag-auswahl">${tagAuswahl}</div>
        </section>

        <section class="f-abschnitt">
          <h3>Summary &amp; description <span class="f-status" id="luecken-info"></span></h3>
          <div class="f-vorschlag">
            ${feldHtml("Topic", `<input name="thema" id="thema" value="${esc(themaAusTitel(e.titel))}" placeholder="e.g. crowdfunding, circular fashion">`, '<span class="f-hilfe">for suggestions</span>')}
            <button type="button" class="knopf" id="vorschlaege-knopf">✨ Suggest title, description &amp; summary</button>
          </div>
          <div id="vorschlaege"></div>
          ${feldHtml("Summary", `<input name="zusammenfassung" maxlength="200" value="${esc(e.zusammenfassung)}" placeholder="Short teaser, e.g. for Eventbrite">`, '<span class="f-hilfe">one line</span>')}
          ${BESCHREIBUNG_TEILE.map((t) => feldHtml(esc(t.frage),
            `<textarea name="b-${t.schluessel}" rows="${t.schluessel === "agenda" ? 5 : 3}" placeholder="${esc(t.hilfe)}">${esc(eb[t.schluessel])}</textarea>`,
            '<span class="f-fehlt"></span>', `data-teil="${t.schluessel}"`)).join("")}
        </section>

        <section class="f-abschnitt">
          <h3>Registrations &amp; links</h3>
          <div class="f-reihe">
            ${feldHtml("Capacity (spots)", `<input type="number" name="kapazität" min="0" value="${esc(e["kapazität"])}">`)}
            ${feldHtml("Registrations", `<input type="number" name="anmeldungen" min="0" value="${esc(e.anmeldungen)}">`)}
          </div>
          <div class="f-reihe">
            ${feldHtml("Eventbrite ID", `<input name="eventbriteId" value="${esc(e.eventbriteId)}" placeholder="automatic later">`)}
            ${feldHtml("Calendar ID", `<input name="kalenderId" value="${esc(e.kalenderId)}" placeholder="automatic later">`)}
          </div>
        </section>

        <datalist id="team">${team.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
        <datalist id="orte">${orte.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>
        <p class="f-hinweis">Only title and date are required. Saved in this browser only – “Reset demo data” (bottom of the page) undoes everything.</p>
        <p id="formular-fehler" class="text-kritisch"></p>
      </form>`;
    document.querySelectorAll("#drawer-fuss [data-schliessen]").forEach((b) => b.addEventListener("click", abbrechen));
    drawerInhalt.querySelector('input[name="titel"]').focus();

    const formular = document.getElementById("event-formular");
    const feld = (name) => formular.elements[name];
    // Ungespeicherte Änderungen erkennen: Formular-Inhalt mit dem Stand beim Öffnen vergleichen.
    // Kommt der Inhalt schon geändert an (z. B. KI-Vorschlag übernommen), gilt er von Anfang an als geändert.
    const formularStand = () => JSON.stringify([...new FormData(formular).entries()]);
    const anfangsStand = formularStand();
    const gespeichertesEvent = e.id && zustand.events.find((x) => x.id === e.id);
    const schonGeaendert = !!gespeichertesEvent && JSON.stringify(gespeichertesEvent) !== JSON.stringify(e);
    drawerStand.geaendert = () => schonGeaendert || formularStand() !== anfangsStand;

    // Leere Description-Felder zählen. Bei neuen Events ist alles optional (keine Markierung),
    // bei bestehenden steht neben leeren Feldern dezent "missing".
    const markiereLuecken = () => {
      let fehlt = 0;
      BESCHREIBUNG_TEILE.forEach((t) => {
        const leer = !feld("b-" + t.schluessel).value.trim();
        formular.querySelector(`[data-teil="${t.schluessel}"] .f-fehlt`).textContent = !neu && leer ? "missing" : "";
        if (leer) fehlt++;
      });
      const info = document.getElementById("luecken-info");
      info.textContent = neu ? "optional – you can add this later"
        : fehlt ? `⚠ ${fehlt} of ${BESCHREIBUNG_TEILE.length} sections missing` : "✓ complete";
      info.className = "f-status " + (!neu && fehlt ? "text-kritisch" : "leise");
    };
    BESCHREIBUNG_TEILE.forEach((t) => feld("b-" + t.schluessel).addEventListener("input", markiereLuecken));
    markiereLuecken();

    // Thema automatisch aus dem Titel übernehmen, solange man es nicht selbst geändert hat
    let themaSelbstGeaendert = false;
    feld("thema").addEventListener("input", () => { themaSelbstGeaendert = true; });
    feld("titel").addEventListener("input", () => {
      if (!themaSelbstGeaendert) feld("thema").value = themaAusTitel(feld("titel").value);
    });

    document.getElementById("vorschlaege-knopf").addEventListener("click", () => {
      const v = baueVorschlaege({
        kategorie: feld("kategorie").value,
        thema: feld("thema").value,
        tags: [...formular.querySelectorAll('input[name="tags"]:checked')].map((x) => x.value),
        datum: feld("datum").value,
        startzeit: feld("startzeit").value,
        ort: feld("ort").value,
        "kapazität": feld("kapazität").value,
        verantwortlich: feld("verantwortlich").value,
      });
      const box = document.getElementById("vorschlaege");
      box.innerHTML = `
        ${feld("thema").value.trim() ? "" : '<p class="hinweis-klein">💡 Enter a topic above for better suggestions.</p>'}
        <div class="vorschlag-teil">
          <strong>Title ideas</strong> <span class="leise">(click to use)</span>
          <div class="titel-ideen">${v.titel.map((t, i) => `<button type="button" class="knopf klein" data-titel="${i}">${esc(t)}</button>`).join("")}</div>
        </div>
        <div class="vorschlag-teil">
          <strong>Summary</strong> <button type="button" class="knopf klein leise" data-nimm="zusammenfassung">Use</button>
          <p class="vorschlag-text">${esc(v.zusammenfassung)}</p>
        </div>
        <div class="vorschlag-teil">
          <strong>Description</strong>
          <button type="button" class="knopf klein leise" data-nimm="luecken">Fill missing sections only</button>
          <button type="button" class="knopf klein leise" data-nimm="beschreibung">Replace all sections</button>
          <details class="beschreibung vorschau"><summary>Preview</summary>${beschreibungHtml(v.beschreibung, feld("kategorie").value)}</details>
        </div>
        <button type="button" class="knopf klein haupt" data-nimm="alles">Use all (first title + summary + description)</button>`;
      box.querySelectorAll("[data-titel]").forEach((b) => b.addEventListener("click", () => {
        feld("titel").value = v.titel[Number(b.dataset.titel)];
        zeigeMeldung("Title applied ✓");
      }));
      box.querySelectorAll("[data-nimm]").forEach((b) => b.addEventListener("click", () => {
        const was = b.dataset.nimm;
        if (was === "zusammenfassung" || was === "alles") feld("zusammenfassung").value = v.zusammenfassung;
        BESCHREIBUNG_TEILE.forEach((t) => {
          const f = feld("b-" + t.schluessel);
          if (was === "beschreibung" || was === "alles" || (was === "luecken" && !f.value.trim())) f.value = v.beschreibung[t.schluessel];
        });
        markiereLuecken();
        if (was === "alles") feld("titel").value = v.titel[0];
        zeigeMeldung("Suggestion applied ✓ – feel free to edit");
      }));
    });

    formular.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const f = new FormData(formular);
      const gespeichert = Object.assign({}, e, {
        titel: String(f.get("titel")).trim(),
        datum: String(f.get("datum")),
        startzeit: String(f.get("startzeit") || "00:00"),
        kategorie: String(f.get("kategorie")),
        status: String(f.get("status")),
        ort: String(f.get("ort")).trim(),
        setting: String(f.get("setting") || "").trim(),
        "kapazität": Math.max(0, Number(f.get("kapazität")) || 0),
        anmeldungen: Math.max(0, Number(f.get("anmeldungen")) || 0),
        verantwortlich: String(f.get("verantwortlich")).trim(),
        eventbriteId: String(f.get("eventbriteId")).trim(),
        kalenderId: String(f.get("kalenderId")).trim(),
        tags: f.getAll("tags").map(String),
        zusammenfassung: String(f.get("zusammenfassung")).trim(),
        beschreibung: Object.fromEntries(BESCHREIBUNG_TEILE.map((t) => [t.schluessel, String(f.get("b-" + t.schluessel) || "").trim()])),
      });
      delete gespeichert.ausVorlage;
      const fehler = !gespeichert.titel ? "Please enter a title."
        : gespeichert.titel.includes("[") ? "Please replace the [placeholder] in the title – or pick a title idea."
        : !/^\d{4}-\d{2}-\d{2}$/.test(gespeichert.datum) ? "Please choose a date."
        : !gespeichert.datum.startsWith(String(jahr)) ? `The date must be in ${jahr} (that's the year the model covers).`
        : "";
      if (fehler) {
        document.getElementById("formular-fehler").textContent = fehler;
        return;
      }
      const ergebnis = await window.DataLayer.speichereEvent(gespeichert);
      await ladeNeu();
      drawerStand.modus = "ansehen";
      drawerStand.geaendert = null;
      const fehlt = fehlendeTeile(ergebnis).length;
      zeigeMeldung((neu ? "Event created ✓" : "Changes saved ✓") + (fehlt ? ` – ⚠ ${fehlt} description sections still missing` : ""));
      // In der aktuellen Ansicht bleiben, beim Blättern zum Datum des Events springen, Details zeigen
      const datum = ANSICHTEN[zustand.ansicht].blaettern ? alsDatum(ergebnis.datum) : zustand.datum;
      geheZu(zustand.ansicht, datum, ergebnis.id);
      zeichne(); // falls sich die Adresse nicht geändert hat
    });
    const loeschen = document.getElementById("loeschen");
    if (loeschen) {
      loeschen.addEventListener("click", async () => {
        if (!window.confirm(`Really delete “${e.titel}”?`)) return;
        await window.DataLayer.loescheEvent(e.id);
        await ladeNeu();
        zeigeMeldung("Event deleted");
        drawerStand.geaendert = null;
        schliesseEvent();
        zeichne();
      });
    }
  }

  // ======================================================================
  // 7. NAVIGATION & START
  // ======================================================================

  /** Adresse (Hash) wie "#/month/2026-11-01" -> Ansicht + Datum */
  function leseAdresse() {
    const teile = window.location.hash.replace(/^#\/?/, "").split("/");
    const ansicht = ANSICHTEN[teile[0]] ? teile[0] : "month";
    const datum = teile[1] && /^\d{4}-\d{2}-\d{2}$/.test(teile[1]) ? alsDatum(teile[1]) : null;
    return { ansicht, datum, fokus: teile[2] || null };
  }

  /** Zu einer Ansicht springen. "fokus" = Event-ID, die hervorgehoben werden soll */
  function geheZu(ansicht, datum, fokus) {
    window.location.hash = "#/" + ansicht + "/" + alsText(datum || zustand.datum) + (fokus ? "/" + fokus : "");
  }

  function zeichne() {
    const { ansicht, datum, fokus } = leseAdresse();
    zustand.ansicht = ansicht;
    zustand.datum = datum || zustand.datum || heute();
    // Das Modell gilt für ein Jahr – wir bleiben innerhalb dieses Jahres
    const jahr = zustand.model.jahr;
    if (zustand.datum.getFullYear() < jahr) zustand.datum = new Date(jahr, 0, 1);
    if (zustand.datum.getFullYear() > jahr) zustand.datum = new Date(jahr, 11, 31);

    const a = ANSICHTEN[ansicht];
    $titel.textContent = a.titel(zustand.datum);
    document.title = a.titel(zustand.datum) + " · Event Mastermind";
    document.getElementById("werkzeugleiste").classList.toggle("ohne-blaettern", !a.blaettern);
    document.querySelectorAll(".hauptnav a").forEach((link) =>
      link.classList.toggle("aktiv", link.dataset.ansicht === ansicht));

    // Vor/Zurück am Jahresrand ausgrauen
    if (a.blaettern) {
      const imJahr = a.imJahr || ((d) => d.getFullYear() === jahr);
      document.getElementById("zurueck").disabled = !imJahr(a.schritt(zustand.datum, -1), jahr);
      document.getElementById("vor").disabled = !imJahr(a.schritt(zustand.datum, 1), jahr);
    }

    document.getElementById("umschalter").innerHTML = ""; // nur Ansichten mit Umschalter füllen ihn
    a.zeichne(zustand.datum, fokus);
    aktualisiereWarnZaehler();
    // Ist in der Adresse ein Event angegeben? Dann Details in der Schublade zeigen
    if (fokus && zustand.events.some((e) => e.id === fokus)) zeigeEventDrawer(fokus);
    else verbergeEventDrawer();
  }

  function aktualisiereWarnZaehler() {
    const jahr = zustand.model.jahr;
    let anzahl = 0;
    for (let m = 1; m <= 12; m++) if (vergleichMonat(jahr, m).abweichungen.length) anzahl++;
    for (let q = 1; q <= 4; q++) if (vergleichQuartal(jahr, q).abweichungen.length) anzahl++;
    document.getElementById("warn-zaehler").textContent = anzahl || "";
    const luecken = eventsMitLuecken().length;
    const infoZaehler = document.getElementById("info-zaehler");
    infoZaehler.textContent = luecken ? "⚠ " + luecken : "";
    infoZaehler.title = luecken + " events with missing description info";
  }

  async function ladeNeu() {
    const daten = await window.DataLayer.ladeAlles();
    zustand.events = daten.events;
    zustand.templates = daten.templates;
    zustand.model = daten.model;
    zustand.tags = daten.tags || [];
    document.getElementById("datenquelle").textContent =
      "Data source: " + window.DataLayer.quelle +
      (window.DataLayer.hatEigeneAenderungen() ? " · incl. your changes (this browser only)" : "");
  }

  /** Benutzer-Menü oben rechts (nur wenn jemand über Google angemeldet ist) */
  async function zeigeBenutzerMenue() {
    try {
      zustand.benutzer = await window.DataLayer.ladeBenutzer();
    } catch (fehler) {
      console.warn("Benutzer konnte nicht geladen werden", fehler);
      return;
    }
    const b = zustand.benutzer;
    const box = document.getElementById("benutzer");
    box.innerHTML = `
      <button class="benutzer-knopf" id="benutzer-knopf" aria-haspopup="true" aria-expanded="false"
        title="${b.angemeldet ? esc(b.email) : "Menu"}">${b.angemeldet ? esc(b.email.charAt(0).toUpperCase()) : "☰"}</button>
      <div class="benutzer-menue" id="benutzer-menue" hidden>
        ${b.angemeldet
          ? `<p class="leise klein-text">Signed in as</p><p class="benutzer-email">${esc(b.email)}</p>`
          : `<p class="leise klein-text">Offline demo – not signed in</p>`}
        <hr class="menue-linie">
        <button type="button" class="menue-eintrag" data-menue="connections">🔌 Connections</button>
      </div>`;
    box.hidden = false;
    const knopf = document.getElementById("benutzer-knopf");
    const menue = document.getElementById("benutzer-menue");
    const setze = (offen) => {
      menue.hidden = !offen;
      knopf.setAttribute("aria-expanded", String(offen));
    };
    knopf.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setze(menue.hidden);
    });
    menue.querySelector('[data-menue="connections"]').addEventListener("click", () => {
      setze(false);
      geheZu("connections", zustand.datum);
    });
    // Klick daneben oder Escape schließt das Menü
    document.addEventListener("click", (ev) => {
      if (!box.contains(ev.target)) setze(false);
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") setze(false);
    });
  }

  // ---------- Ask AI (Gemini): die KI bekommt die Daten und beantwortet Fragen.
  // Sie kann selbst nichts speichern. Wenn man sie darum bittet, schreibt sie Änderungs-Vorschläge
  // ("change"-Blöcke). Die App zeigt sie als Karte; gespeichert wird erst, wenn ein Mensch "Apply" klickt.

  const KI_BEISPIELE = [
    "Which months deviate most from the plan?",
    "Which upcoming events are missing description info?",
    "What's on in the next two weeks?",
    "How full were our Academy sessions on average?",
    "Fill in the missing description info of the next 3 events",
  ];
  const kiVerlauf = []; // { rolle: "user" | "model", text } – nur solange die Seite offen ist

  /** Alles, was die KI sehen darf: Daten der App + die Auswertungen, die die App selbst rechnet */
  function kiKontext() {
    const jahr = zustand.model.jahr;
    const kurz = (v, name) => ({
      zeitraum: name,
      ist: v.istGesamt,
      soll: v.sollGesamt,
      auslastungProzent: v.auslastung === null ? null : Math.round(v.auslastung * 100),
      zielAuslastungProzent: Math.round(v.ziel * 100),
      abweichungen: v.abweichungen.map((a) => a.text),
    });
    return {
      heute: zustand.model.demoHeute,
      warnSchwelleProzent: zustand.einstellungen.schwelleProzent,
      auswertungMonate: MONATE.map((name, i) => kurz(vergleichMonat(jahr, i + 1), name + " " + jahr)),
      auswertungQuartale: [1, 2, 3, 4].map((q) => kurz(vergleichQuartal(jahr, q), "Q" + q + " " + jahr)),
      // Auslastung je Kategorie (ganzes Jahr, nur "Done"), gleiche Rechnung wie in der App
      auslastungJeKategorie: KATEGORIEN.map((kat) => {
        const erledigt = zustand.events.filter((e) => e.kategorie === kat && e.status === "Done" && Number(e["kapazität"]) > 0);
        const plaetze = erledigt.reduce((s, e) => s + Number(e["kapazität"]), 0);
        const anmeldungen = erledigt.reduce((s, e) => s + Number(e.anmeldungen || 0), 0);
        return { kategorie: kat, eventsDone: erledigt.length, anmeldungen, plaetze,
          auslastungProzent: plaetze ? Math.round(anmeldungen / plaetze * 100) : null };
      }),
      eventsMitFehlendenInfos: eventsMitLuecken().map((e) =>
        ({ id: e.id, titel: e.titel, datum: e.datum, fehlt: fehlendeTeile(e) })),
      // Blueprint: Soll je Monat (Blueprint-Monat + Ausnahmen) und je Quartal, so wie die App vergleicht
      blueprintSollMonate: MONATE.map((name, i) => ({ monat: name, soll: sollMonat(i + 1).soll, ausnahme: sollMonat(i + 1).notiz })),
      blueprintSollQuartale: [1, 2, 3, 4].map((q) => ({ quartal: "Q" + q, soll: sollQuartal(q).soll })),
      mindestAnmeldungProzent: zustand.einstellungen.mindestAnmeldungProzent,
      eventsMitWenigAnmeldungen: eventsMitWenigAnmeldungen().map((e) =>
        ({ id: e.id, titel: e.titel, datum: e.datum, warnung: anmeldeWarnung(e).text })),
      terminKonflikte: (() => {
        const k = terminKonflikte();
        return {
          maxProWoche: zustand.einstellungen.maxProWoche, maxProTag: zustand.einstellungen.maxProTag,
          wochen: k.wochen.map((w) => ({ wocheAb: w.start, anzahl: w.events.length, events: w.events.map((e) => e.titel) })),
          tage: k.tage.map((t) => ({ datum: t.datum, events: t.events.map((e) => e.titel) })),
        };
      })(),
      modell: zustand.model,
      events: zustand.events,
      vorlagen: zustand.templates,
      tags: zustand.tags,
    };
  }

  /** Antwort der KI lesbar machen (einfaches Markdown: **fett**, Listen, `Code`) – vorher alles escapen */
  function kiHtml(text) {
    const zeilen = esc(text).split("\n");
    let html = "";
    let inListe = false;
    zeilen.forEach((zeile) => {
      const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
      const punkt = zeile.match(/^\s*(?:[-*•]|\d+\.)\s+(.*)$/);
      if (punkt) {
        if (!inListe) { html += "<ul>"; inListe = true; }
        html += "<li>" + inline(punkt[1]) + "</li>";
        return;
      }
      if (inListe) { html += "</ul>"; inListe = false; }
      const titel = zeile.match(/^#{1,4}\s+(.*)$/);
      if (titel) html += "<p><strong>" + inline(titel[1]) + "</strong></p>";
      else if (zeile.trim()) html += "<p>" + inline(zeile) + "</p>";
    });
    if (inListe) html += "</ul>";
    return html;
  }

  // ---------- Änderungs-Vorschläge der KI ("change"-Blöcke)

  // Diese Felder darf ein Vorschlag ändern (alles andere wird ignoriert)
  const KI_FELDER = ["titel", "zusammenfassung", "tags", "beschreibung", "datum", "startzeit", "ort",
    "kapazität", "status", "kategorie", "verantwortlich"];
  const KI_FELD_NAMEN = {
    titel: "Title", zusammenfassung: "Summary", tags: "Tags", datum: "Date", startzeit: "Start time", ort: "Location",
    "kapazität": "Capacity", status: "Status", kategorie: "Category", verantwortlich: "Owner",
  };

  /** Antwort zerlegen in Text-Stücke und ```change …```-Blöcke */
  function kiZerlege(text) {
    const teile = [];
    const muster = /```change\s*\n?([\s\S]*?)```/g;
    let rest = 0;
    let treffer;
    while ((treffer = muster.exec(text))) {
      if (treffer.index > rest) teile.push({ art: "text", text: text.slice(rest, treffer.index) });
      teile.push({ art: "change", text: treffer[1] });
      rest = muster.lastIndex;
    }
    if (rest < text.length) teile.push({ art: "text", text: text.slice(rest) });
    return teile;
  }

  /**
   * Einen Vorschlag prüfen und aufräumen. Nur erlaubte Felder und gültige Werte bleiben übrig.
   * → { id, grund, felder, hinweise[] } oder { fehler }
   */
  function kiPruefeVorschlag(rohText) {
    let roh;
    try { roh = JSON.parse(rohText); } catch (e) { return { fehler: "The AI sent a suggestion I couldn't read." }; }
    if (!roh || typeof roh !== "object" || !roh.felder || typeof roh.felder !== "object") {
      return { fehler: "The AI sent an incomplete suggestion." };
    }
    const id = roh.id ? String(roh.id) : "";
    if (id && !zustand.events.some((e) => e.id === id)) return { fehler: `Event “${id}” does not exist.` };
    const felder = {};
    const hinweise = [];
    const jahr = String(zustand.model.jahr);
    Object.keys(roh.felder).forEach((name) => {
      const wert = roh.felder[name];
      if (!KI_FELDER.includes(name)) return;
      if (name === "tags") {
        if (!Array.isArray(wert)) return;
        const erlaubt = zustand.tags.map((t) => t.tag);
        const gut = [...new Set(wert.map(String).filter((t) => erlaubt.includes(t)))];
        const unbekannt = wert.map(String).filter((t) => !erlaubt.includes(t));
        if (unbekannt.length) hinweise.push("Ignored unknown tags: " + unbekannt.join(", "));
        felder.tags = gut;
      } else if (name === "beschreibung") {
        if (!wert || typeof wert !== "object") return;
        const b = {};
        BESCHREIBUNG_TEILE.forEach((t) => {
          if (wert[t.schluessel] == null) return;
          const inhalt = Array.isArray(wert[t.schluessel]) ? wert[t.schluessel].join("\n") : String(wert[t.schluessel]);
          if (inhalt.trim()) b[t.schluessel] = inhalt.trim();
        });
        if (Object.keys(b).length) felder.beschreibung = b;
      } else if (name === "kapazität") {
        const zahl = Math.round(Number(wert));
        if (zahl >= 0) felder[name] = zahl;
      } else if (name === "datum") {
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(wert)) && String(wert).startsWith(jahr)) felder.datum = String(wert);
        else hinweise.push(`Ignored date “${wert}” (must be in ${jahr}).`);
      } else if (name === "startzeit") {
        if (/^\d{2}:\d{2}$/.test(String(wert))) felder.startzeit = String(wert);
      } else if (name === "status") {
        if (STATUS.includes(String(wert))) felder.status = String(wert);
      } else if (name === "kategorie") {
        if (KATEGORIEN.includes(String(wert))) felder.kategorie = String(wert);
      } else if (String(wert).trim()) {
        felder[name] = String(wert).trim();
      }
    });
    if (!id && (!felder.titel || !felder.datum)) return { fehler: "A new event needs at least a title and a date." };
    if (!Object.keys(felder).length) return { fehler: "The suggestion contains no usable changes." };
    return { id, grund: String(roh.grund || "").trim(), felder, hinweise };
  }

  /** Vorschlag auf ein Event anwenden (ohne zu speichern) → neues Event-Objekt */
  function kiWendeAn(basis, felder) {
    const e = JSON.parse(JSON.stringify(basis));
    Object.keys(felder).forEach((name) => {
      if (name === "beschreibung") e.beschreibung = Object.assign(normBeschreibung(e.beschreibung), felder.beschreibung);
      else e[name] = felder[name];
    });
    return e;
  }

  /** Zeilen "Feld: alt → neu" für die Vorschlags-Karte */
  function kiUnterschiede(alt, neu) {
    const zeilen = [];
    const zeile = (name, a, b) => {
      if (String(a) === String(b)) return;
      zeilen.push(`<div class="ki-diff-zeile"><span class="ki-diff-feld">${esc(name)}</span>` +
        (a !== "" && a != null ? `<del>${esc(a)}</del>` : '<span class="ki-diff-leer">(empty)</span>') +
        `<ins>${esc(b)}</ins></div>`);
    };
    Object.keys(KI_FELD_NAMEN).forEach((f) => {
      const a = f === "tags" ? (alt.tags || []).join(", ") : alt[f];
      const b = f === "tags" ? (neu.tags || []).join(", ") : neu[f];
      zeile(KI_FELD_NAMEN[f], a == null ? "" : a, b == null ? "" : b);
    });
    const ba = normBeschreibung(alt.beschreibung), bn = normBeschreibung(neu.beschreibung);
    BESCHREIBUNG_TEILE.forEach((t) => zeile(t.frage, ba[t.schluessel], bn[t.schluessel]));
    return zeilen.join("");
  }

  /** Eine Vorschlags-Karte in die Chat-Blase setzen und ihre Knöpfe verbinden */
  function kiVorschlagKarte(blase, rohText) {
    const karte = document.createElement("div");
    karte.className = "ki-vorschlag";
    blase.appendChild(karte);
    const v = kiPruefeVorschlag(rohText);
    if (v.fehler) {
      karte.classList.add("fehler");
      karte.innerHTML = `<p>⚠ ${esc(v.fehler)}</p>`;
      return;
    }
    const basis = v.id ? zustand.events.find((e) => e.id === v.id) : Object.assign(leeresEvent(), { titel: "" });
    const vorschlag = kiWendeAn(basis, v.felder);
    // Bei neuen Events alles als "neu" zeigen (Vergleich mit einem leeren Event)
    const unterschiede = kiUnterschiede(v.id ? basis : {}, vorschlag);
    karte.innerHTML = `
      <div class="ki-vorschlag-kopf">${v.id ? "✏️ Change" : "➕ New event"}: <strong>${esc(vorschlag.titel || basis.titel)}</strong>
        <span class="leise">${esc(datumSchoen(vorschlag.datum))}</span></div>
      ${v.grund ? `<p class="leise">${esc(v.grund)}</p>` : ""}
      <div class="ki-diff">${unterschiede || '<p class="leise">No differences to the current event.</p>'}</div>
      ${v.hinweise.map((h) => `<p class="hinweis-klein">⚠ ${esc(h)}</p>`).join("")}
      <div class="ki-vorschlag-knoepfe">
        ${v.id && unterschiede ? '<button type="button" class="knopf klein haupt" data-ki="apply">Apply</button>' : ""}
        ${unterschiede ? `<button type="button" class="knopf klein" data-ki="edit">${v.id ? "Edit first" : "Open as draft"}</button>` : ""}
        <button type="button" class="knopf klein leise" data-ki="copy" title="Copy the suggested texts">⧉ Copy</button>
        <button type="button" class="knopf klein leise" data-ki="dismiss">Dismiss</button>
      </div>`;
    verbindeKopieren(karte.querySelector('[data-ki="copy"]'), () => kiVorschlagAlsText(v.felder));
    const knoepfe = karte.querySelector(".ki-vorschlag-knoepfe");
    const status = (html) => { knoepfe.innerHTML = html; };

    const apply = karte.querySelector('[data-ki="apply"]');
    if (apply) apply.addEventListener("click", async () => {
      // immer vom aktuellen Stand ausgehen (falls man inzwischen selbst etwas geändert hat)
      const aktuell = zustand.events.find((e) => e.id === v.id);
      if (!aktuell) { status('<span class="leise">⚠ This event no longer exists.</span>'); return; }
      const vorher = JSON.parse(JSON.stringify(aktuell));
      await window.DataLayer.speichereEvent(kiWendeAn(aktuell, v.felder));
      await ladeNeu();
      zeichne();
      zeigeMeldung("AI suggestion applied ✓");
      status('<span class="ki-erledigt">✓ Applied</span> <button type="button" class="knopf klein leise" data-ki="undo">Undo</button>');
      knoepfe.querySelector('[data-ki="undo"]').addEventListener("click", async () => {
        await window.DataLayer.speichereEvent(vorher);
        await ladeNeu();
        zeichne();
        zeigeMeldung("Change undone");
        status('<span class="leise">↩ Undone</span>');
      });
    });
    const edit = karte.querySelector('[data-ki="edit"]');
    if (edit) edit.addEventListener("click", () => {
      // Formular mit dem Vorschlag öffnen – gespeichert wird erst mit "Save"
      const aktuell = v.id ? zustand.events.find((e) => e.id === v.id) : basis;
      if (!aktuell) { status('<span class="leise">⚠ This event no longer exists.</span>'); return; }
      oeffneEventFormular(kiWendeAn(aktuell, v.felder));
    });
    karte.querySelector('[data-ki="dismiss"]').addEventListener("click", () => {
      status('<span class="leise">Dismissed</span>');
      karte.classList.add("verworfen");
    });
  }

  /** KI-Antwort in eine Blase schreiben: Text als einfaches Markdown, Vorschläge als Karten */
  /** Text in die Zwischenablage legen. Klappt auch in Apps Script, wo der neue Weg oft gesperrt ist. */
  async function kopiereText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Ersatzweg: unsichtbares Textfeld markieren und "Kopieren" auslösen
      const feld = document.createElement("textarea");
      feld.value = text;
      feld.setAttribute("readonly", "");
      feld.style.position = "fixed";
      feld.style.opacity = "0";
      document.body.appendChild(feld);
      feld.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      feld.remove();
      return ok;
    }
  }

  /** Vorgeschlagene Felder als lesbarer Text (zum Einfügen z. B. in Eventbrite oder Notion) */
  function kiVorschlagAlsText(felder) {
    const zeilen = [];
    Object.keys(KI_FELD_NAMEN).forEach((f) => {
      if (felder[f] == null) return;
      zeilen.push(KI_FELD_NAMEN[f] + ": " + (Array.isArray(felder[f]) ? felder[f].join(", ") : felder[f]));
    });
    if (felder.beschreibung) {
      BESCHREIBUNG_TEILE.forEach((t) => {
        if (felder.beschreibung[t.schluessel]) zeilen.push("", t.frage, felder.beschreibung[t.schluessel]);
      });
    }
    return zeilen.join("\n").trim();
  }

  /** Ganze KI-Antwort als einfacher Text: ohne **Fett**-Zeichen, Vorschläge lesbar statt als JSON */
  function kiAlsText(antwort) {
    return kiZerlege(antwort).map((teil) => {
      if (teil.art === "text") return teil.text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
      const v = kiPruefeVorschlag(teil.text);
      if (v.fehler) return "";
      const ev = v.id ? zustand.events.find((e) => e.id === v.id) : null;
      return (ev ? "— " + ev.titel + " —\n" : "— New event —\n") + kiVorschlagAlsText(v.felder);
    }).filter(Boolean).join("\n\n");
  }

  /** Knopf "Copy" verbinden: zeigt kurz "Copied ✓" */
  function verbindeKopieren(knopf, textGeber) {
    knopf.addEventListener("click", async () => {
      const ok = await kopiereText(textGeber());
      const vorher = knopf.textContent;
      knopf.textContent = ok ? "Copied ✓" : "Copy failed";
      setTimeout(() => { knopf.textContent = vorher; }, 1600);
    });
  }

  function kiAntwortZeigen(blase, antwort, modell) {
    blase.innerHTML = "";
    kiZerlege(antwort).forEach((teil) => {
      if (teil.art === "change") {
        kiVorschlagKarte(blase, teil.text);
      } else if (teil.text.trim()) {
        const div = document.createElement("div");
        div.innerHTML = kiHtml(teil.text);
        blase.appendChild(div);
      }
    });
    blase.insertAdjacentHTML("beforeend", `<div class="ki-fuss">
      <span class="ki-modell">${esc(modell || "")}</span>
      <button type="button" class="knopf klein leise ki-kopieren" title="Copy the whole answer">⧉ Copy</button></div>`);
    verbindeKopieren(blase.querySelector(".ki-fuss .ki-kopieren"), () => kiAlsText(antwort));
  }

  function kiNachricht(rolle, html) {
    const verlauf = document.getElementById("ki-verlauf");
    const blase = document.createElement("div");
    blase.className = "ki-blase " + rolle;
    blase.innerHTML = html;
    verlauf.appendChild(blase);
    verlauf.scrollTop = verlauf.scrollHeight;
    return blase;
  }

  function kiBegruessung() {
    const verlauf = document.getElementById("ki-verlauf");
    verlauf.innerHTML = "";
    kiNachricht("model", `<p>Hi! Ask me anything about the events, the plan and the deviations in this app.
      I can also <strong>suggest changes</strong> (titles, summaries, tags, descriptions, ticket info …) –
      nothing is saved until you click <strong>Apply</strong>.</p>
      <div class="ki-beispiele">${KI_BEISPIELE.map((b) =>
        `<button type="button" class="knopf klein" data-ki-beispiel>${esc(b)}</button>`).join("")}</div>`);
    verlauf.querySelectorAll("[data-ki-beispiel]").forEach((b) =>
      b.addEventListener("click", () => kiFragen(b.textContent)));
  }

  async function kiFragen(frage) {
    frage = String(frage || "").trim();
    const feld = document.getElementById("ki-frage");
    const senden = document.getElementById("ki-senden");
    if (!frage || senden.disabled) return;
    feld.value = "";
    kiNachricht("user", "<p>" + esc(frage) + "</p>");
    const warten = kiNachricht("model warten",
      '<p><span class="punkte"><i></i><i></i><i></i></span> Thinking … <span class="ki-sekunden"></span></p>');
    // Sekunden mitzählen, damit man sieht, dass noch etwas passiert
    const beginn = Date.now();
    const uhr = setInterval(() => {
      const s = Math.round((Date.now() - beginn) / 1000);
      const el = warten.querySelector(".ki-sekunden");
      if (el && s >= 3) el.textContent = s + " s";
    }, 1000);
    // Sicherheitsnetz: nach 2 Minuten nicht mehr warten
    let wecker;
    const zuLange = new Promise((_, nein) => {
      wecker = setTimeout(() => nein(new Error("No answer after 2 minutes. Please try again.")), 120000);
    });
    senden.disabled = true;
    const runde = kiRunde;
    try {
      const ergebnis = await Promise.race([
        window.DataLayer.frageKI(frage, kiVerlauf.slice(), kiKontext()),
        zuLange,
      ]);
      if (runde !== kiRunde) return; // inzwischen "New chat" gedrückt: alte Antwort verwerfen
      const antwort = ergebnis.antwort;
      warten.className = "ki-blase model";
      kiAntwortZeigen(warten, antwort, [ergebnis.modell, ergebnis.sekunden != null ? ergebnis.sekunden + " s" : ""].filter(Boolean).join(" · "));
      kiVerlauf.push({ rolle: "user", text: frage }, { rolle: "model", text: antwort });
    } catch (fehler) {
      warten.className = "ki-blase model fehler";
      warten.innerHTML = "<p>⚠ " + esc(fehler.message) + "</p>";
    } finally {
      clearInterval(uhr);
      clearTimeout(wecker);
    }
    if (runde !== kiRunde) return;
    clearInterval(uhr);
    clearTimeout(wecker);
    senden.disabled = false;
    document.getElementById("ki-verlauf").scrollTop = 1e9;
    feld.focus();
  }

  /** Ask-AI-Schublade öffnen (true) oder schließen (false) – der Chat bleibt dabei erhalten */
  function kiFensterOffen(offen) {
    const knopf = document.getElementById("ki-knopf");
    const fenster = document.getElementById("ki-fenster");
    knopf.setAttribute("aria-expanded", String(offen));
    const schatten = document.getElementById("ki-schatten");
    if (offen) {
      fenster.hidden = false;
      schatten.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fenster.classList.add("offen");
        schatten.classList.add("offen");
      }));
      document.getElementById("ki-frage").focus();
    } else {
      fenster.classList.remove("offen");
      schatten.classList.remove("offen");
      setTimeout(() => {
        if (!fenster.classList.contains("offen")) {
          fenster.hidden = true;
          schatten.hidden = true;
        }
      }, 250);
    }
  }

  /** "New chat": Verlauf leeren und von vorn beginnen (eine laufende Antwort wird verworfen) */
  let kiRunde = 0;
  function kiNeuerChat() {
    kiRunde++;
    kiVerlauf.length = 0;
    kiBegruessung();
    document.getElementById("ki-senden").disabled = false;
    document.getElementById("ki-frage").value = "";
    document.getElementById("ki-frage").focus();
  }

  /** Knopf "Complete with AI" an einer Event-Karte: Chat öffnen und passende Bitte schicken */
  function kiFuerEvent(e) {
    kiFensterOffen(true);
    const fehlt = fehlendeTeile(e);
    kiFragen(fehlt.length
      ? `Please complete the event “${e.titel}” (${e.id}): write the missing description sections (${fehlt.join(", ")}) ` +
        "and check title, summary, tags and ticket info."
      : `Please improve the event “${e.titel}” (${e.id}): suggest a better title, summary, tags, description and ticket info where useful.`);
  }

  function richteKiEin() {
    if (!zustand.benutzer.kiMoeglich) return; // per Doppelklick oder ohne Schlüssel: kein Knopf
    const knopf = document.getElementById("ki-knopf");
    const feld = document.getElementById("ki-frage");
    const setze = kiFensterOffen;
    kiBegruessung();
    if (zustand.model) zeichne(); // Event-Karten bekommen jetzt den Knopf "Complete with AI"
    knopf.hidden = false;
    knopf.addEventListener("click", () => setze(true));
    document.getElementById("ki-schliessen").addEventListener("click", () => setze(false));
    document.getElementById("ki-neu").addEventListener("click", kiNeuerChat);
    // Klick neben die Schublade schließt sie (der Chat bleibt erhalten)
    document.getElementById("ki-schatten").addEventListener("click", () => setze(false));
    // Esc schließt die Schublade (siehe Event-Schublade: gemeinsame Esc-Regel)
    document.getElementById("ki-formular").addEventListener("submit", (ev) => {
      ev.preventDefault();
      kiFragen(feld.value);
    });
    // Enter schickt ab, Umschalt+Enter macht eine neue Zeile
    feld.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        kiFragen(feld.value);
      }
    });
  }

  async function start() {
    // läuft nebenher, die Seite wartet nicht darauf; danach ggf. "Ask AI" einschalten
    zeigeBenutzerMenue().then(richteKiEin);
    try {
      zustand.einstellungen = await window.DataLayer.ladeEinstellungen();
      await ladeNeu();
    } catch (fehler) {
      $inhalt.innerHTML = `<div class="karte"><h2>Could not load data</h2><p class="leise">${esc(fehler.message)}</p></div>`;
      return;
    }

    document.getElementById("zurueck").addEventListener("click", () => {
      const a = ANSICHTEN[zustand.ansicht];
      if (a.blaettern) geheZu(zustand.ansicht, a.schritt(zustand.datum, -1));
    });
    document.getElementById("vor").addEventListener("click", () => {
      const a = ANSICHTEN[zustand.ansicht];
      if (a.blaettern) geheZu(zustand.ansicht, a.schritt(zustand.datum, 1));
    });
    document.getElementById("heute").addEventListener("click", () => {
      const ziel = ANSICHTEN[zustand.ansicht].blaettern ? zustand.ansicht : "week";
      geheZu(ziel, heute());
    });
    document.getElementById("neues-event").addEventListener("click", () => oeffneEventFormular());
    document.getElementById("zuruecksetzen").addEventListener("click", async () => {
      if (!window.confirm("Delete all your changes and restore the demo data?")) return;
      await window.DataLayer.setzeDemoZurueck();
      await ladeNeu();
      zeichne();
      zeigeMeldung("Demo data restored ✓");
    });
    // Suchfeld oben: tippen öffnet die Suche
    const suchfeld = document.getElementById("suche");
    suchfeld.addEventListener("input", () => setzeSuche({ text: suchfeld.value }));
    document.getElementById("suche-formular").addEventListener("submit", (ev) => {
      ev.preventDefault();
      setzeSuche({ text: suchfeld.value });
    });
    // Tastenkürzel "/" springt ins Suchfeld
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$dialog.open) {
        ev.preventDefault();
        suchfeld.focus();
      }
    });
    // Navigation oben: Datum beim Wechseln der Ansicht beibehalten
    document.querySelectorAll(".hauptnav a").forEach((link) =>
      link.addEventListener("click", (ev) => {
        ev.preventDefault();
        geheZu(link.dataset.ansicht, zustand.datum);
      }));

    window.addEventListener("hashchange", zeichne);
    zeichne();
  }

  // Für Tests von außen erreichbar (z. B. in der Browser-Konsole)
  window.EventApp = { zustand, vergleichMonat, vergleichQuartal, baueVorschlaege, sucheEvents };

  start();
})();
