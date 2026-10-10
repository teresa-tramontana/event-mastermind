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
 *   7. Start          – Daten laden, Knöpfe verbinden
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
  };

  const KATEGORIEN = ["Workshop", "Networking", "Talk", "Community Lunch", "Pitch Night"];
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
  /** "Community Lunch" -> "kat-Community-Lunch" (CSS-Klasse für die Farbe) */
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
  function vergleiche(events, soll, zielAuslastung) {
    const schwelle = zustand.einstellungen.schwelleProzent / 100;
    const kategorien = KATEGORIEN.map((kat) => {
      const ist = events.filter((e) => e.kategorie === kat).length;
      const s = (soll && soll[kat]) || 0;
      let abw = 0;
      if (s > 0) abw = (ist - s) / s;
      else if (ist > 0) abw = Infinity; // stattgefunden, aber nicht eingeplant
      return { kat, ist, soll: s, abw, auffaellig: Math.abs(abw) > schwelle };
    });

    const erledigt = events.filter((e) => e.status === "Done" && Number(e["kapazität"]) > 0);
    const plaetze = erledigt.reduce((s, e) => s + Number(e["kapazität"]), 0);
    const anmeldungen = erledigt.reduce((s, e) => s + Number(e.anmeldungen || 0), 0);
    const auslastung = plaetze > 0 ? anmeldungen / plaetze : null;
    const ziel = (zielAuslastung || 0) / 100;
    const auslastungAbw = auslastung !== null && ziel > 0 ? (auslastung - ziel) / ziel : null;

    const istGesamt = kategorien.reduce((s, k) => s + k.ist, 0);
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

  function sollMonat(monat) {
    return zustand.model.monate.find((m) => m.monat === monat) || { soll: {}, zielAuslastung: 0 };
  }
  function sollQuartal(q) {
    return zustand.model.quartale.find((x) => x.quartal === q) || { soll: {}, zielAuslastung: 0 };
  }
  function vergleichMonat(jahr, monat) {
    const m = sollMonat(monat);
    return vergleiche(eventsImMonat(jahr, monat), m.soll, m.zielAuslastung);
  }
  function vergleichQuartal(jahr, q) {
    const m = sollQuartal(q);
    return vergleiche(eventsImQuartal(jahr, q), m.soll, m.zielAuslastung);
  }

  /** Abweichungsstärke -> Heatmap-Stufe 0 bis 4 */
  function heatStufe(staerke) {
    if (staerke <= 0) return 0;
    if (staerke < 0.35) return 1;
    if (staerke < 0.6) return 2;
    if (staerke < 0.95) return 3;
    return 4;
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

  // ---------------------------------------------------------------- Year
  ANSICHTEN.year = {
    blaettern: true,
    titel: (d) => "Year " + d.getFullYear(),
    schritt: (d, r) => new Date(d.getFullYear() + r, d.getMonth(), 1),
    zeichne(d) {
      const jahr = d.getFullYear();
      const jahresEvents = eventsZwischen(new Date(jahr, 0, 1), new Date(jahr, 11, 31));
      const sollJahr = zustand.model.monate.reduce(
        (s, m) => s + Object.values(m.soll).reduce((a, b) => a + b, 0), 0);
      const jahresVergleich = vergleiche(jahresEvents, {}, zustand.model.monate[0].zielAuslastung);
      const auffaelligeMonate = [];

      const kacheln = MONATE.map((name, i) => {
        const v = vergleichMonat(jahr, i + 1);
        const stufe = heatStufe(v.staerke);
        if (v.abweichungen.length) auffaelligeMonate.push(name);
        const punkte = eventsImMonat(jahr, i + 1)
          .map((e) => `<span class="kat-punkt ${katKlasse(e.kategorie)}" title="${esc(e.titel)}"></span>`)
          .join("");
        const groesste = v.abweichungen.slice().sort((a, b) =>
          (b.abw === Infinity ? 9 : Math.abs(b.abw)) - (a.abw === Infinity ? 9 : Math.abs(a.abw)))[0];
        const istHeute = heute().getFullYear() === jahr && heute().getMonth() === i;
        return `
          <button class="kachel stufe-${stufe} ${istHeute ? "heute-monat" : ""}" data-monat="${i + 1}"
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
          <div class="kennzahl"><div class="wert">${jahresEvents.length}</div><div class="label">events this year (target ${sollJahr})</div></div>
          <div class="kennzahl"><div class="wert">${jahresEvents.filter((e) => e.status === "Done").length}</div><div class="label">already done</div></div>
          <div class="kennzahl"><div class="wert">${jahresVergleich.auslastung !== null ? prozent(jahresVergleich.auslastung) : "–"}</div><div class="label">⌀ occupancy (target ${zustand.model.monate[0].zielAuslastung}%)</div></div>
          <div class="kennzahl"><div class="wert">${auffaelligeMonate.length}</div><div class="label">months deviating &gt; ${zustand.einstellungen.schwelleProzent}%</div></div>
          <a class="kennzahl ${eventsMitLuecken().length ? "warnend" : ""}" href="#/deviations/${alsText(d)}/fehlende-infos"><div class="wert">${eventsMitLuecken().length ? "⚠ " + eventsMitLuecken().length : "✓"}</div><div class="label">events with missing description info</div></a>
        </div>
        <div class="heatmap">${kacheln}</div>
        <div class="abschnitt gitter-2">
          <div class="skala">Deviation from model:
            <i style="background:var(--heat-0)"></i>none
            <i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i>
            <i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i>strong
          </div>
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
          <div class="kennzahl"><div class="wert">${v.auslastung !== null ? prozent(v.auslastung) : "–"}</div><div class="label">occupancy (target ${prozent(v.ziel)})</div></div>
          <div class="kennzahl"><div class="wert">${v.abweichungen.length}</div><div class="label">deviations &gt; ${zustand.einstellungen.schwelleProzent}%</div></div>
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

      let zellen = WOCHENTAGE_KURZ.map((t) => `<div class="wochentag">${t}</div>`).join("");
      for (let tag = new Date(start); tag <= ende; tag = plusTage(tag, 1)) {
        const text = alsText(tag);
        const fremd = tag.getMonth() !== monat - 1;
        const events = fremd ? [] : zustand.events.filter((e) => e.datum === text)
          .sort((a, b) => a.startzeit.localeCompare(b.startzeit));
        const chips = events.map((e) => `
          <button class="ev-chip ${katKlasse(e.kategorie)} ${e.status === "Idea" ? "idee" : ""}" data-event="${esc(e.id)}" data-datum="${text}"
                  title="${esc(e.titel)} · ${esc(e.status)}">
            ${beschreibungsStand(e) !== "ok" ? `<span class="chip-warnung" title="Description ${beschreibungsStand(e) === "keine" ? "missing" : "incomplete"}">⚠</span>` : ""}<span class="zeit">${esc(e.startzeit)}</span> ${esc(e.titel)}
          </button>`).join("");
        zellen += `
          <div class="tag-zelle ${fremd ? "fremd" : ""} ${text === heuteText ? "heute" : ""} ${events.length ? "" : "ohne-events"}">
            <button class="tag-nr" data-datum="${text}" title="Open week">${WOCHENTAGE_KURZ[(tag.getDay() + 6) % 7]} ${tag.getDate()}</button>
            ${chips}
          </div>`;
      }

      const sollZeile = v.kategorien.filter((k) => k.ist || k.soll).map((k) =>
        `<span class="${katKlasse(k.kat)}"><span class="kat-punkt"></span>${k.kat}: <strong>${k.ist}</strong>/${k.soll}</span>`).join("");

      $inhalt.innerHTML = `
        ${abweichungsBanner(v, MONATE[monat - 1])}
        <div class="legende" style="margin-bottom:12px">Actual/target: ${sollZeile}</div>
        <div class="kalender">${zellen}</div>
        <p class="leise abschnitt">Tip: click an event or a day to open the week view with all details.</p>`;

      $inhalt.querySelectorAll(".tag-nr").forEach((b) =>
        b.addEventListener("click", () => geheZu("week", alsDatum(b.dataset.datum))));
      $inhalt.querySelectorAll(".ev-chip").forEach((b) =>
        b.addEventListener("click", () => geheZu("week", alsDatum(b.dataset.datum), b.dataset.event)));
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
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${katPille(e.kategorie)} ${statusPille(e.status)} ${lueckenAbzeichen(e)}</div>
            <h3>${esc(e.titel)}</h3>
            ${e.zusammenfassung ? `<p class="summary">${esc(e.zusammenfassung)}</p>` : ""}
          </div>
          <div class="tags">${tagPillen(e.tags)}</div>
        </div>
        <div class="event-meta">
          <span>🕒 ${esc(e.startzeit)}</span><span>📍 ${esc(e.ort)}</span><span>👤 ${esc(e.verantwortlich)}</span>
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
        ${lueckenHinweis(e)}
        ${beschreibungsStand(e) !== "keine" ? `<details class="beschreibung"><summary>Description${beschreibungsStand(e) === "luecken" ? " (incomplete)" : ""}</summary>${beschreibungHtml(e.beschreibung, e.kategorie)}</details>` : ""}
        ${r ? `<div class="reminder ${r.stufe}">${esc(r.text)}</div>` : ""}
        <div class="event-aktionen">
          <button class="knopf klein" data-aktion="social">✨ Social post suggestion</button>
          <button class="knopf klein" data-aktion="mail">✉️ Reminder email suggestion</button>
          <button class="knopf klein leise" data-aktion="bearbeiten">Edit</button>
        </div>
      </article>`;
  }

  /** Knöpfe und Häkchen in Event-Karten verbinden */
  function verbindeEventKarten() {
    $inhalt.querySelectorAll(".event-karte").forEach((karte) => {
      const event = zustand.events.find((e) => e.id === karte.dataset.event);
      karte.querySelectorAll("[data-aufgabe]").forEach((box) =>
        box.addEventListener("change", async () => {
          event.aufgaben[Number(box.dataset.aufgabe)].erledigt = box.checked;
          await window.DataLayer.speichereEvent(event);
          await ladeNeu();
          zeichne();
        }));
      karte.querySelector('[data-aktion="social"]').addEventListener("click", () => zeigeVorschlag(event, "social"));
      karte.querySelector('[data-aktion="mail"]').addEventListener("click", () => zeigeVorschlag(event, "mail"));
      karte.querySelector('[data-aktion="bearbeiten"]').addEventListener("click", () => oeffneEventFormular(event));
    });
  }

  ANSICHTEN.week = {
    blaettern: true,
    titel: (d) => {
      const s = wochenStart(d), e = plusTage(s, 6);
      const von = s.getMonth() === e.getMonth() ? String(s.getDate()) : s.getDate() + " " + MONATE_KURZ[s.getMonth()];
      return `Week ${kalenderwoche(s)} · ${von} – ${e.getDate()} ${MONATE_KURZ[e.getMonth()]}`;
    },
    schritt: (d, r) => plusTage(d, 7 * r),
    imJahr: (d, jahr) => wochenStart(d).getFullYear() === jahr || plusTage(wochenStart(d), 6).getFullYear() === jahr,
    zeichne(d, fokus) {
      const start = wochenStart(d);
      const heuteText = alsText(heute());
      let html = "";
      let anzahl = 0;
      for (let i = 0; i < 7; i++) {
        const tag = plusTage(start, i);
        const text = alsText(tag);
        const events = eventsZwischen(tag, tag);
        anzahl += events.length;
        html += `
          <section class="wochen-tag ${events.length ? "" : "leer-tag"}">
            <div class="wochen-tag-kopf ${text === heuteText ? "heute" : ""}">
              <h2>${WOCHENTAGE[i]}</h2><span class="leise">${tag.getDate()} ${MONATE[tag.getMonth()]}${text === heuteText ? " · today (demo)" : ""}</span>
              ${events.length ? "" : '<span class="leer">no events</span>'}
            </div>
            ${events.map(eventKarte).join("")}
          </section>`;
      }
      $inhalt.innerHTML = `<p class="leise" style="margin-top:0">${anzahl ? anzahl + (anzahl === 1 ? " event" : " events") + " this week" : "Nothing planned this week."}</p>` + html;
      verbindeEventKarten();

      if (fokus) {
        const ziel = document.getElementById("event-" + fokus);
        if (ziel) {
          ziel.scrollIntoView({ block: "center" });
          ziel.animate([{ boxShadow: "0 0 0 4px var(--warnung)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1600 });
        }
      }
    },
  };

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
    titel: () => "Search",
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
        <div id="suchergebnisse" class="abschnitt"></div>`;

      const gross = document.getElementById("suche-gross");
      gross.addEventListener("input", () => setzeSuche({ text: gross.value }));
      document.getElementById("filter-kategorie").addEventListener("change", (ev) => setzeSuche({ kategorie: ev.target.value }));
      document.getElementById("filter-status").addEventListener("change", (ev) => setzeSuche({ status: ev.target.value }));
      document.getElementById("filter-kommend").addEventListener("change", (ev) => setzeSuche({ nurKommende: ev.target.checked }));
      document.getElementById("filter-luecken").addEventListener("change", (ev) => setzeSuche({ nurLuecken: ev.target.checked }));
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
      <article class="treffer ${katKlasse(e.kategorie)}">
        <div class="treffer-datum"><strong>${alsDatum(e.datum).getDate()}</strong><span>${MONATE_KURZ[alsDatum(e.datum).getMonth()]}</span></div>
        <div class="treffer-inhalt">
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${katPille(e.kategorie)} ${statusPille(e.status)} ${lueckenAbzeichen(e)}
            <span class="leise" style="font-size:.82rem">${esc(datumSchoen(e.datum))} · ${esc(e.startzeit)} · ${markiere(e.ort, woerter)}</span></div>
          <h3>${markiere(e.titel, woerter)}</h3>
          ${e.zusammenfassung ? `<p class="summary">${markiere(e.zusammenfassung, woerter)}</p>` : ""}
          ${fundstellen.filter(([name]) => !["Summary", "Location", "Category", "Status", "Tags", "Missing"].includes(name)).slice(0, 2).map(([name, wert]) =>
            `<p class="fundstelle"><span>${name}:</span> ${markiere(ausschnitt(wert, woerter, 140), woerter)}</p>`).join("")}
          <div class="tags">${(e.tags || []).map((t) => `<button class="tag tag-knopf" data-tag="${esc(t)}">${markiere(t, woerter)}</button>`).join("")}</div>
        </div>
        <div class="treffer-aktionen">
          <button class="knopf klein" data-oeffnen="${esc(e.id)}">Open in week</button>
          <button class="knopf klein leise" data-bearbeiten="${esc(e.id)}">Edit</button>
        </div>
      </article>`).join("");

    ziel.querySelectorAll("[data-oeffnen]").forEach((b) => b.addEventListener("click", () => {
      const e = zustand.events.find((x) => x.id === b.dataset.oeffnen);
      geheZu("week", alsDatum(e.datum), e.id);
    }));
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
    titel: () => "Deviations & missing info",
    zeichne(d, fokus) {
      const schwelle = zustand.einstellungen.schwelleProzent;
      $inhalt.innerHTML = `
        <section class="karte">
          <h2>When should we warn you?</h2>
          <p class="untertitel">A period is flagged when actual and target differ by more than this percentage
            (number of events per category, or occupancy).</p>
          <div class="schwelle abschnitt">
            <input type="range" id="schwelle" min="5" max="100" step="5" value="${schwelle}" aria-label="Threshold in percent">
            <output id="schwelle-wert">${schwelle}%</output>
            <button class="knopf klein leise" id="schwelle-standard">Default (20%)</button>
          </div>
        </section>
        <div id="fehlende-infos-box"></div>
        <div id="warnliste"></div>`;
      zeichneFehlendeInfos();
      if (fokus === "fehlende-infos") document.getElementById("fehlende-infos-box").scrollIntoView({ block: "start" });

      const regler = document.getElementById("schwelle");
      const setze = async (wert) => {
        zustand.einstellungen.schwelleProzent = wert;
        regler.value = wert;
        document.getElementById("schwelle-wert").textContent = wert + "%";
        zeichneWarnliste();
        aktualisiereWarnZaehler();
        await window.DataLayer.speichereEinstellungen(zustand.einstellungen);
      };
      regler.addEventListener("input", () => setze(Number(regler.value)));
      document.getElementById("schwelle-standard").addEventListener("click", () => setze(20));
      zeichneWarnliste();
    },
  };

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
            <td><button class="knopf klein" data-ergaenzen="${esc(e.id)}">Fill in</button></td>
          </tr>`).join("")}</tbody></table></div>` : '<p class="leise">All events have a complete description. 🎉</p>'}
      </section>`;
    box.querySelectorAll("[data-ergaenzen]").forEach((b) => b.addEventListener("click", () =>
      oeffneEventFormular(zustand.events.find((x) => x.id === b.dataset.ergaenzen))));
  }

  function zeichneWarnliste() {
    const jahr = zustand.model.jahr;
    const zeilen = (art) => {
      const anzahl = art === "month" ? 12 : 4;
      let html = "", zeitraeume = 0;
      for (let i = 1; i <= anzahl; i++) {
        const v = art === "month" ? vergleichMonat(jahr, i) : vergleichQuartal(jahr, i);
        if (!v.abweichungen.length) continue;
        zeitraeume++;
        const name = art === "month" ? MONATE[i - 1] : "Q" + i;
        const ziel = art === "month" ? alsText(new Date(jahr, i - 1, 1)) : alsText(new Date(jahr, (i - 1) * 3, 1));
        v.abweichungen.forEach((a, n) => {
          const istAuslastung = a.art === "auslastung";
          const klasse = a.abw < 0 ? "zu-wenig" : "zu-viel";
          html += `<tr>
            <td>${n === 0 ? `<a href="#/${art}/${ziel}"><strong>${name}</strong></a>` : ""}</td>
            <td>${istAuslastung ? "📊 Occupancy" : katPille(a.kat)}</td>
            <td class="zahl">${istAuslastung ? prozent(a.ist) : a.ist}</td>
            <td class="zahl">${istAuslastung ? prozent(a.soll) : a.soll}</td>
            <td class="zahl"><span class="abw ${klasse}">${vorzeichenProzent(a.abw)}</span></td>
            <td>${esc(istAuslastung ? (a.abw > 0 ? "overbooked" : "too empty") : a.abw === Infinity ? "not planned" : a.abw < 0 ? "too few events" : "more than planned")}</td>
          </tr>`;
        });
      }
      return { html, zeitraeume };
    };
    const m = zeilen("month"), q = zeilen("quarter");
    const tabelle = (titel, z, leerText) => `
      <section class="karte abschnitt">
        <h2>${titel} <span class="leise">(${z.zeitraeume} flagged)</span></h2>
        ${z.html ? `<div class="tabellen-rahmen"><table class="tabelle abschnitt">
          <thead><tr><th>Period</th><th>What</th><th class="zahl">Actual</th><th class="zahl">Target</th><th class="zahl">Deviation</th><th>Meaning</th></tr></thead>
          <tbody>${z.html}</tbody></table></div>` : `<p class="leise">${leerText}</p>`}
      </section>`;
    document.getElementById("warnliste").innerHTML =
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
        <p class="leise" style="margin-top:0">This is where the real services will be connected later. Nothing is connected in the demo –
          all numbers and names are fictional.</p>
        <div class="verbindungen">${liste.map((v) => `
          <article class="karte verbindung">
            <div class="verbindung-logo" style="background:${VERBINDUNG_FARBE[v.id] || "var(--akzent)"}" aria-hidden="true">${VERBINDUNG_KUERZEL[v.id] || "?"}</div>
            <h2>${esc(v.name)}</h2>
            <span class="verbindung-status">${v.verbunden ? "connected" : "not connected (demo)"}</span>
            <p style="margin:0">${esc(v.zweck)}</p>
            <p class="leise" style="margin:0;font-size:.88rem"><strong>Later:</strong> ${esc(v.spaeter)}</p>
            <button class="knopf klein" disabled title="Coming in a later stage">Connect (soon)</button>
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
    oeffneDialog(`
      <div class="dialog-kopf"><h2>${art === "social" ? "✨ Social post suggestion" : "✉️ Reminder email suggestion"}</h2>
        <button class="knopf rund leise" data-schliessen aria-label="Close">×</button></div>
      <div class="dialog-koerper">
        <p class="leise" style="margin-top:0">Based on the “${esc(vorlage.kategorie)}” template – you can still edit the text here.</p>
        <div class="formular"><label class="breit">Text
          <textarea id="vorschlag-text" rows="12">${esc(text)}</textarea></label></div>
        <p class="leise" style="font-size:.82rem">Later (roadmap): suggestions will be refined with AI${art === "mail" ? " and saved as a Gmail draft" : ""}.</p>
      </div>
      <div class="dialog-fuss">
        <button class="knopf leise" data-schliessen>Close</button>
        <button class="knopf haupt" id="kopieren">Copy text</button>
      </div>`);
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
  function oeffneEventFormular(vorlage) {
    const neu = !vorlage || !vorlage.id;
    const e = vorlage || {
      titel: "", datum: alsText(zustand.datum || heute()), startzeit: "18:00", kategorie: KATEGORIEN[0],
      status: "Idea", ort: "Loft – Event Space", "kapazität": 30, anmeldungen: 0,
      verantwortlich: "Community Lead", eventbriteId: "", kalenderId: "", tags: [],
      zusammenfassung: "", beschreibung: normBeschreibung(null),
      aufgaben: STANDARD_AUFGABEN.map((text) => ({ text, erledigt: false })),
    };
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

    oeffneDialog(`
      <form id="event-formular" novalidate>
        <div class="dialog-kopf"><h2>${neu ? (e.ausVorlage ? "New draft from template" : "New event") : "Edit event"}</h2>
          <button type="button" class="knopf rund leise" data-schliessen aria-label="Close">×</button></div>
        <div class="dialog-koerper">
          <div class="formular">
            <label>Category<select name="kategorie">${auswahl(KATEGORIEN, e.kategorie)}</select></label>
            <label>Status<select name="status">${auswahl(STATUS, e.status)}</select></label>
            <label class="breit">Title *<input name="titel" required value="${esc(e.titel)}" placeholder="e.g. Storytelling for Impact Startups"></label>
            <div class="breit feld-gruppe">
              <span class="feld-titel">Tags</span>
              <div class="tag-auswahl">${tagAuswahl}</div>
            </div>
            <div class="breit vorschlag-box">
              <label>Topic (for suggestions)<input name="thema" id="thema" value="${esc(themaAusTitel(e.titel))}" placeholder="e.g. crowdfunding, circular fashion"></label>
              <button type="button" class="knopf" id="vorschlaege-knopf">✨ Suggest title, description &amp; summary</button>
              <div id="vorschlaege"></div>
            </div>
            <label class="breit">Summary (one line)<input name="zusammenfassung" maxlength="200" value="${esc(e.zusammenfassung)}" placeholder="Short teaser, e.g. for Eventbrite"></label>
            <fieldset class="breit beschreibung-felder">
              <legend>Description <span class="leise" id="luecken-info"></span></legend>
              ${BESCHREIBUNG_TEILE.map((t) => `
                <label>${esc(t.frage)}<textarea name="b-${t.schluessel}" rows="${t.schluessel === "agenda" ? 5 : 3}" placeholder="⚠ Missing – ${esc(t.hilfe)}">${esc(eb[t.schluessel])}</textarea></label>`).join("")}
            </fieldset>
            <label>Date *<input type="date" name="datum" required min="${jahr}-01-01" max="${jahr}-12-31" value="${esc(e.datum)}"></label>
            <label>Start time<input type="time" name="startzeit" value="${esc(e.startzeit)}"></label>
            <label class="breit">Location<input name="ort" list="orte" value="${esc(e.ort)}"></label>
            <label>Capacity (spots)<input type="number" name="kapazität" min="0" value="${esc(e["kapazität"])}"></label>
            <label>Registrations<input type="number" name="anmeldungen" min="0" value="${esc(e.anmeldungen)}"></label>
            <label class="breit">Owner (a role, no real names)<input name="verantwortlich" list="team" value="${esc(e.verantwortlich)}"></label>
            <label>Eventbrite ID<input name="eventbriteId" value="${esc(e.eventbriteId)}" placeholder="automatic later"></label>
            <label>Calendar ID<input name="kalenderId" value="${esc(e.kalenderId)}" placeholder="automatic later"></label>
          </div>
          <datalist id="team">${team.map((t) => `<option value="${esc(t)}">`).join("")}</datalist>
          <datalist id="orte">${orte.map((t) => `<option value="${esc(t)}">`).join("")}</datalist>
          <p class="leise" style="font-size:.82rem">Saved in this browser only. “Reset demo data” (bottom of the page) undoes everything.</p>
          <p id="formular-fehler" style="color:var(--kritisch)"></p>
        </div>
        <div class="dialog-fuss">
          ${neu ? "" : '<button type="button" class="knopf gefahr leise links" id="loeschen">Delete</button>'}
          <button type="button" class="knopf leise" data-schliessen>Cancel</button>
          <button type="submit" class="knopf haupt">Save</button>
        </div>
      </form>`);

    const formular = document.getElementById("event-formular");
    const feld = (name) => formular.elements[name];

    // Leere Description-Felder rot markieren und mitzählen
    const markiereLuecken = () => {
      let fehlt = 0;
      BESCHREIBUNG_TEILE.forEach((t) => {
        const leer = !feld("b-" + t.schluessel).value.trim();
        feld("b-" + t.schluessel).classList.toggle("fehlt", leer);
        if (leer) fehlt++;
      });
      const info = document.getElementById("luecken-info");
      info.textContent = fehlt ? `⚠ ${fehlt} of ${BESCHREIBUNG_TEILE.length} sections missing` : "✓ complete";
      info.className = fehlt ? "text-kritisch" : "leise";
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
      $dialog.close();
      const fehlt = fehlendeTeile(ergebnis).length;
      zeigeMeldung((neu ? "Event created ✓" : "Changes saved ✓") + (fehlt ? ` – ⚠ ${fehlt} description sections still missing` : ""));
      geheZu("week", alsDatum(ergebnis.datum), ergebnis.id);
      zeichne(); // falls sich die Adresse nicht geändert hat
    });
    const loeschen = document.getElementById("loeschen");
    if (loeschen) {
      loeschen.addEventListener("click", async () => {
        if (!window.confirm(`Really delete “${e.titel}”?`)) return;
        await window.DataLayer.loescheEvent(e.id);
        await ladeNeu();
        $dialog.close();
        zeigeMeldung("Event deleted");
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
    const ansicht = ANSICHTEN[teile[0]] ? teile[0] : "year";
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

    a.zeichne(zustand.datum, fokus);
    aktualisiereWarnZaehler();
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

  async function start() {
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
