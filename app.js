/*
 * app.js – die Oberfläche.
 *
 * Aufbau dieser Datei (von oben nach unten):
 *   1. Zustand        – was gerade angezeigt wird
 *   2. Helfer         – Datum, Texte, Farben
 *   3. Auswertung     – Ist gegen Soll (Modell) vergleichen
 *   4. Ansichten      – Jahr, Quartal, Monat, Woche, Abweichungen, Vorlagen, Verbindungen
 *   5. Dialoge        – Event-Formular, Social-Post-Vorschlag
 *   6. Start          – Daten laden, Knöpfe verbinden
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
    einstellungen: { schwelleProzent: 20 },
    ansicht: "jahr",
    datum: null, // das Datum, um das sich die Ansicht dreht ("Cursor")
  };

  const KATEGORIEN = ["Workshop", "Networking", "Talk", "Community Lunch", "Pitch Night"];
  const STATUS = ["Idee", "Geplant", "Veröffentlicht", "Durchgeführt"];
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
    "August", "September", "Oktober", "November", "Dezember"];
  const MONATE_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const WOCHENTAGE_KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

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
  /** "Mi, 14. Oktober" */
  function datumSchoen(text, mitJahr) {
    const d = alsDatum(text);
    return WOCHENTAGE_KURZ[(d.getDay() + 6) % 7] + ", " + d.getDate() + ". " + MONATE[d.getMonth()] +
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
  function prozent(wert) {
    return Math.round(wert * 100) + " %";
  }
  function vorzeichenProzent(wert) {
    if (wert === Infinity) return "ungeplant";
    const p = Math.round(wert * 100);
    return (p > 0 ? "+" : p < 0 ? "−" : "±") + Math.abs(p) + " %";
  }
  function zeigeMeldung(text) {
    const el = document.getElementById("meldung");
    el.textContent = text;
    el.classList.add("sichtbar");
    clearTimeout(zeigeMeldung.timer);
    zeigeMeldung.timer = setTimeout(() => el.classList.remove("sichtbar"), 2600);
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
   * Auslastung wird nur aus bereits durchgeführten Events berechnet
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

    const erledigt = events.filter((e) => e.status === "Durchgeführt" && Number(e["kapazität"]) > 0);
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
          ? `${k.kat}: ${k.ist} Event(s), obwohl keines geplant war`
          : k.ist < k.soll
            ? `${k.kat}: nur ${k.ist} statt ${k.soll}`
            : `${k.kat}: ${k.ist} statt ${k.soll}`,
      }));
    if (auslastungAbw !== null && Math.abs(auslastungAbw) > schwelle) {
      abweichungen.push({
        art: "auslastung", kat: "Auslastung", ist: auslastung, soll: ziel, abw: auslastungAbw,
        text: auslastung > ziel
          ? `Überbucht: ${prozent(auslastung)} belegt (Ziel ${prozent(ziel)})`
          : `Schwach besucht: ${prozent(auslastung)} belegt (Ziel ${prozent(ziel)})`,
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
  // 4. ANSICHTEN
  // ======================================================================
  const ANSICHTEN = {};

  // ---------------------------------------------------------------- Jahr
  ANSICHTEN.jahr = {
    blaettern: true,
    titel: (d) => "Jahr " + d.getFullYear(),
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
                  aria-label="${name}: ${v.istGesamt} von ${v.sollGesamt} Events. Öffnen">
            <div class="kachel-kopf"><strong>${name}</strong>
              <span class="leise">${v.auslastung !== null ? "⌀ " + prozent(v.auslastung) : "offen"}</span></div>
            <div><span class="zahl">${v.istGesamt}</span> <span class="leise">/ ${v.sollGesamt} Events</span></div>
            <div class="mini-punkte">${punkte}</div>
            <div class="hinweis">${groesste ? "⚠ " + esc(groesste.text) : "✓ im Plan"}</div>
          </button>`;
      }).join("");

      $inhalt.innerHTML = `
        <div class="kennzahlen">
          <div class="kennzahl"><div class="wert">${jahresEvents.length}</div><div class="label">Events im Jahr (Soll ${sollJahr})</div></div>
          <div class="kennzahl"><div class="wert">${jahresEvents.filter((e) => e.status === "Durchgeführt").length}</div><div class="label">schon durchgeführt</div></div>
          <div class="kennzahl"><div class="wert">${jahresVergleich.auslastung !== null ? prozent(jahresVergleich.auslastung) : "–"}</div><div class="label">⌀ Auslastung (Ziel ${zustand.model.monate[0].zielAuslastung} %)</div></div>
          <div class="kennzahl"><div class="wert">${auffaelligeMonate.length}</div><div class="label">Monate mit Abweichung &gt; ${zustand.einstellungen.schwelleProzent} %</div></div>
        </div>
        <div class="heatmap">${kacheln}</div>
        <div class="abschnitt gitter-2">
          <div class="skala">Abweichung vom Modell:
            <i style="background:var(--heat-0)"></i>keine
            <i style="background:var(--heat-1)"></i><i style="background:var(--heat-2)"></i>
            <i style="background:var(--heat-3)"></i><i style="background:var(--heat-4)"></i>stark
          </div>
          <div class="legende">${KATEGORIEN.map((k) =>
            `<span class="${katKlasse(k)}"><span class="kat-punkt"></span>${k}</span>`).join("")}</div>
        </div>
        <p class="leise abschnitt">Tipp: Klick auf einen Monat öffnet den Kalender. „⌀“ = durchschnittliche Auslastung der bereits durchgeführten Events.</p>`;

      $inhalt.querySelectorAll(".kachel").forEach((k) =>
        k.addEventListener("click", () => geheZu("monat", new Date(jahr, Number(k.dataset.monat) - 1, 1))));
    },
  };

  // Platzhalter für die Ansichten der nächsten Schritte
  ["quartal", "monat", "woche", "warnungen", "vorlagen", "verbindungen"].forEach((name) => {
    ANSICHTEN[name] = {
      blaettern: false,
      titel: () => name.charAt(0).toUpperCase() + name.slice(1),
      zeichne() {
        $inhalt.innerHTML = `<div class="karte"><p>Diese Ansicht wird im nächsten Bauschritt ergänzt. 🛠️</p></div>`;
      },
    };
  });

  // ======================================================================
  // 5. DIALOGE (werden in Schritt b/c ergänzt)
  // ======================================================================
  function oeffneEventFormular() {
    zeigeMeldung("Das Formular kommt in Schritt (c).");
  }

  // ======================================================================
  // 6. NAVIGATION & START
  // ======================================================================

  /** Adresse (Hash) wie "#/monat/2026-11-01" -> Ansicht + Datum */
  function leseAdresse() {
    const teile = window.location.hash.replace(/^#\/?/, "").split("/");
    const ansicht = ANSICHTEN[teile[0]] ? teile[0] : "jahr";
    let datum = teile[1] && /^\d{4}-\d{2}-\d{2}$/.test(teile[1]) ? alsDatum(teile[1]) : null;
    return { ansicht, datum };
  }

  function geheZu(ansicht, datum) {
    window.location.hash = "#/" + ansicht + "/" + alsText(datum || zustand.datum);
  }

  function zeichne() {
    const { ansicht, datum } = leseAdresse();
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

    a.zeichne(zustand.datum);
    aktualisiereWarnZaehler();
  }

  function aktualisiereWarnZaehler() {
    const jahr = zustand.model.jahr;
    let anzahl = 0;
    for (let m = 1; m <= 12; m++) if (vergleichMonat(jahr, m).abweichungen.length) anzahl++;
    for (let q = 1; q <= 4; q++) if (vergleichQuartal(jahr, q).abweichungen.length) anzahl++;
    document.getElementById("warn-zaehler").textContent = anzahl || "";
  }

  async function ladeNeu() {
    const daten = await window.DataLayer.ladeAlles();
    zustand.events = daten.events;
    zustand.templates = daten.templates;
    zustand.model = daten.model;
    document.getElementById("datenquelle").textContent =
      "Datenquelle: " + window.DataLayer.quelle +
      (window.DataLayer.hatEigeneAenderungen() ? " · mit deinen Änderungen (nur in diesem Browser)" : "");
  }

  async function start() {
    try {
      zustand.einstellungen = await window.DataLayer.ladeEinstellungen();
      await ladeNeu();
    } catch (fehler) {
      $inhalt.innerHTML = `<div class="karte"><h2>Daten konnten nicht geladen werden</h2><p class="leise">${esc(fehler.message)}</p></div>`;
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
      const ziel = ANSICHTEN[zustand.ansicht].blaettern ? zustand.ansicht : "woche";
      geheZu(ziel, heute());
    });
    document.getElementById("neues-event").addEventListener("click", () => oeffneEventFormular());
    document.getElementById("zuruecksetzen").addEventListener("click", async () => {
      if (!window.confirm("Alle deine Änderungen löschen und die Demo-Daten wiederherstellen?")) return;
      await window.DataLayer.setzeDemoZurueck();
      await ladeNeu();
      zeichne();
      zeigeMeldung("Demo-Daten wiederhergestellt ✓");
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

  // Für spätere Schritte von außen erreichbar (z. B. zum Testen in der Konsole)
  window.EventApp = { zustand, vergleichMonat, vergleichQuartal };

  start();
})();
