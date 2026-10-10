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

  // ---------------------------------------------------------------- Quartal
  /** Ein Balken "Ist gegen Soll" */
  function balkenZeile(name, klasse, ist, soll, max, istText, sollText, abw) {
    const breite = max > 0 ? Math.min(100, (ist / max) * 100) : 0;
    const sollPos = max > 0 ? Math.min(100, (soll / max) * 100) : 0;
    const schwelle = zustand.einstellungen.schwelleProzent / 100;
    const abwKlasse = abw === null ? "" : Math.abs(abw) <= schwelle ? "passt" : abw < 0 ? "zu-wenig" : "zu-viel";
    return `
      <div class="balken-zeile ${klasse}">
        <div class="balken-name"><span class="kat-punkt"></span>${esc(name)}</div>
        <div class="balken-spur" title="Ist ${istText} · Soll ${sollText}">
          <div class="balken-ist" style="width:${breite}%"></div>
          <div class="balken-soll" style="left:calc(${sollPos}% - 1px)"></div>
        </div>
        <div class="balken-wert"><strong>${istText}</strong> <span class="leise">/ ${sollText}</span><br>
          ${abw === null ? '<span class="abw leise">–</span>' : `<span class="abw ${abwKlasse}">${vorzeichenProzent(abw)}</span>`}</div>
      </div>`;
  }

  ANSICHTEN.quartal = {
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

      const auslastungZeile = balkenZeile("Auslastung", "kat-auslastung", v.auslastung || 0, v.ziel, Math.max(1.3, (v.auslastung || 0) * 1.1),
        v.auslastung !== null ? prozent(v.auslastung) : "–", prozent(v.ziel), v.auslastungAbw);

      const monatsLinks = [0, 1, 2].map((i) => {
        const monat = (q - 1) * 3 + i + 1;
        const vm = vergleichMonat(jahr, monat);
        return `<button class="knopf klein" data-monat="${monat}">${vm.abweichungen.length ? "⚠ " : ""}${MONATE[monat - 1]} · ${vm.istGesamt}/${vm.sollGesamt}</button>`;
      }).join("");

      $inhalt.innerHTML = `
        <div class="kennzahlen">
          <div class="kennzahl"><div class="wert">${v.istGesamt} <span class="leise" style="font-size:1rem">/ ${v.sollGesamt}</span></div><div class="label">Events Ist / Soll</div></div>
          <div class="kennzahl"><div class="wert">${v.auslastung !== null ? prozent(v.auslastung) : "–"}</div><div class="label">Auslastung (Ziel ${prozent(v.ziel)})</div></div>
          <div class="kennzahl"><div class="wert">${v.abweichungen.length}</div><div class="label">Abweichungen &gt; ${zustand.einstellungen.schwelleProzent} %</div></div>
        </div>
        ${abweichungsBanner(v, "diesem Quartal")}
        <div class="gitter-2">
          <section class="karte">
            <h2>Kategorien-Mix</h2>
            <p class="untertitel">Farbiger Balken = Ist · schwarzer Strich = Soll laut Modell</p>
            <div class="abschnitt">${zeilen}</div>
          </section>
          <section class="karte">
            <h2>Auslastung</h2>
            <p class="untertitel">Anmeldungen geteilt durch Plätze – nur bereits durchgeführte Events</p>
            <div class="abschnitt">${auslastungZeile}</div>
            <h3 class="abschnitt">Monate in diesem Quartal</h3>
            <div class="monats-links">${monatsLinks}</div>
          </section>
        </div>`;

      $inhalt.querySelectorAll("[data-monat]").forEach((b) =>
        b.addEventListener("click", () => geheZu("monat", new Date(jahr, Number(b.dataset.monat) - 1, 1))));
    },
  };

  /** Hinweis-Kasten mit allen Abweichungen eines Zeitraums */
  function abweichungsBanner(v, wo, ohneIn) {
    wo = ohneIn ? wo : "in " + wo;
    if (!v.abweichungen.length) {
      return `<div class="banner ok"><span class="banner-symbol">✓</span><div><strong>Alles im Plan.</strong>
        Keine Abweichung über ${zustand.einstellungen.schwelleProzent} % ${wo}.</div></div>`;
    }
    return `<div class="banner warnung"><span class="banner-symbol">⚠</span><div>
      <strong>${v.abweichungen.length === 1 ? "1 Abweichung" : v.abweichungen.length + " Abweichungen"} vom Modell ${wo}</strong>
      <span class="leise">(Schwelle ${zustand.einstellungen.schwelleProzent} %)</span>
      <ul>${v.abweichungen.map((a) => `<li>${esc(a.text)} <span class="leise">(${vorzeichenProzent(a.abw)})</span></li>`).join("")}</ul>
    </div></div>`;
  }

  // ---------------------------------------------------------------- Monat
  ANSICHTEN.monat = {
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
          <button class="ev-chip ${katKlasse(e.kategorie)} ${e.status === "Idee" ? "idee" : ""}" data-event="${esc(e.id)}" data-datum="${text}"
                  title="${esc(e.titel)} · ${esc(e.status)}">
            <span class="zeit">${esc(e.startzeit)}</span> ${esc(e.titel)}
          </button>`).join("");
        zellen += `
          <div class="tag-zelle ${fremd ? "fremd" : ""} ${text === heuteText ? "heute" : ""} ${events.length ? "" : "ohne-events"}">
            <button class="tag-nr" data-datum="${text}" title="Woche öffnen">${WOCHENTAGE_KURZ[(tag.getDay() + 6) % 7]} ${tag.getDate()}.</button>
            ${chips}
          </div>`;
      }

      const sollZeile = v.kategorien.filter((k) => k.ist || k.soll).map((k) =>
        `<span class="${katKlasse(k.kat)}"><span class="kat-punkt"></span>${k.kat}: <strong>${k.ist}</strong>/${k.soll}</span>`).join("");

      $inhalt.innerHTML = `
        ${abweichungsBanner(v, "im " + MONATE[monat - 1], true)}
        <div class="legende" style="margin-bottom:12px">Ist/Soll: ${sollZeile}</div>
        <div class="kalender">${zellen}</div>
        <p class="leise abschnitt">Tipp: Klick auf ein Event oder einen Tag öffnet die Wochenansicht mit allen Details.</p>`;

      $inhalt.querySelectorAll(".tag-nr").forEach((b) =>
        b.addEventListener("click", () => geheZu("woche", alsDatum(b.dataset.datum))));
      $inhalt.querySelectorAll(".ev-chip").forEach((b) =>
        b.addEventListener("click", () => geheZu("woche", alsDatum(b.dataset.datum), b.dataset.event)));
    },
  };

  // ---------------------------------------------------------------- Woche
  /** Was sollte als Nächstes passieren? (Reminder-Hinweis) */
  function reminderHinweis(e) {
    const d = tageBis(e.datum);
    const offen = (e.aufgaben || []).filter((a) => !a.erledigt).map((a) => a.text);
    const tagVorher = (n) => datumSchoen(alsText(plusTage(alsDatum(e.datum), -n)));
    if (e.status === "Durchgeführt" || d < 0) {
      if (offen.length) return { stufe: "ruhig", text: "📝 Nachbereitung offen: " + offen.join(", ") };
      return null;
    }
    if (e.status === "Idee") {
      return { stufe: d <= 30 ? "dringend" : "ruhig", text: `💡 Noch eine Idee – Termin, Raum und Speaker:in bestätigen${d <= 30 ? ` (nur noch ${d} Tage!)` : ""}.` };
    }
    if (e.status === "Geplant") {
      if (d <= 21) return { stufe: "dringend", text: `📣 Noch nicht veröffentlicht – nur noch ${d} Tage bis zum Event!` };
      return { stufe: "ruhig", text: `📣 Auf Eventbrite veröffentlichen bis spätestens ${tagVorher(21)}.` };
    }
    // Veröffentlicht
    if (offen.includes("Reminder-Mail senden")) {
      if (d <= 1) return { stufe: "dringend", text: `⏰ Reminder-Mail ${d === 0 ? "heute früh" : "heute"} senden – das Event ist ${d === 0 ? "heute" : "morgen"}!` };
      if (d <= 7) return { stufe: "", text: `⏰ Reminder-Mail am ${tagVorher(2)} senden (2 Tage vorher).` };
      return { stufe: "ruhig", text: `⏰ Reminder-Mail ist für ${tagVorher(2)} vorgemerkt.` };
    }
    return { stufe: "ruhig", text: "✓ Reminder ist raus." };
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
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">${katPille(e.kategorie)} ${statusPille(e.status)}</div>
            <h3>${esc(e.titel)}</h3>
          </div>
          <div class="tags">${(e.tags || []).map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>
        </div>
        <div class="event-meta">
          <span>🕒 ${esc(e.startzeit)} Uhr</span><span>📍 ${esc(e.ort)}</span><span>👤 ${esc(e.verantwortlich)}</span>
          ${e.eventbriteId ? `<span title="Eventbrite-ID (Demo)">🎟 ${esc(e.eventbriteId)}</span>` : ""}
          ${e.kalenderId ? `<span title="Kalender-ID (Demo)">📅 ${esc(e.kalenderId)}</span>` : ""}
        </div>
        <div class="event-raster">
          <div>
            <strong>${esc(e.anmeldungen)}</strong> <span class="leise">von ${kap} Plätzen angemeldet</span>
            <div class="fortschritt ${quote > 1 ? "ueber" : ""}"><span style="width:${Math.min(100, quote * 100)}%"></span></div>
            <span class="leise" style="font-size:.82rem">${quote > 1 ? `⚠ überbucht (${prozent(quote)})` : prozent(quote) + " belegt"}</span>
          </div>
          <div>
            <strong>Aufgaben</strong> <span class="leise">(${offen ? offen + " offen" : "alles erledigt"})</span>
            <ul class="aufgaben">${aufgaben || '<li class="leise">Keine Aufgaben</li>'}</ul>
          </div>
        </div>
        ${r ? `<div class="reminder ${r.stufe}">${esc(r.text)}</div>` : ""}
        <div class="event-aktionen">
          <button class="knopf klein" data-aktion="social">✨ Social-Post-Vorschlag</button>
          <button class="knopf klein" data-aktion="mail">✉️ Reminder-Mail-Vorschlag</button>
          <button class="knopf klein leise" data-aktion="bearbeiten">Bearbeiten</button>
        </div>
      </article>`;
  }

  ANSICHTEN.woche = {
    blaettern: true,
    titel: (d) => {
      const s = wochenStart(d), e = plusTage(s, 6);
      const von = s.getMonth() === e.getMonth() ? s.getDate() + "." : s.getDate() + ". " + MONATE_KURZ[s.getMonth()];
      return `KW ${kalenderwoche(s)} · ${von} – ${e.getDate()}. ${MONATE_KURZ[e.getMonth()]}`;
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
              <h2>${WOCHENTAGE[i]}</h2><span class="leise">${tag.getDate()}. ${MONATE[tag.getMonth()]}${text === heuteText ? " · heute (Demo)" : ""}</span>
              ${events.length ? "" : '<span class="leer">keine Events</span>'}
            </div>
            ${events.map(eventKarte).join("")}
          </section>`;
      }
      $inhalt.innerHTML = `<p class="leise" style="margin-top:0">${anzahl ? anzahl + " Event(s) in dieser Woche" : "In dieser Woche ist nichts geplant."}</p>` + html;

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

      if (fokus) {
        const ziel = document.getElementById("event-" + fokus);
        if (ziel) {
          ziel.scrollIntoView({ block: "center" });
          ziel.animate([{ boxShadow: "0 0 0 4px var(--warnung)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1600 });
        }
      }
    },
  };

  // ---------------------------------------------------------------- Abweichungen
  ANSICHTEN.warnungen = {
    blaettern: false,
    titel: () => "Abweichungen vom Modell",
    zeichne() {
      const schwelle = zustand.einstellungen.schwelleProzent;
      $inhalt.innerHTML = `
        <section class="karte">
          <h2>Ab wann soll gewarnt werden?</h2>
          <p class="untertitel">Ein Zeitraum gilt als auffällig, wenn Ist und Soll um mehr als diesen Prozentsatz auseinanderliegen
            (Anzahl Events je Kategorie oder Auslastung).</p>
          <div class="schwelle abschnitt">
            <input type="range" id="schwelle" min="5" max="100" step="5" value="${schwelle}" aria-label="Schwelle in Prozent">
            <output id="schwelle-wert">${schwelle} %</output>
            <button class="knopf klein leise" id="schwelle-standard">Standard (20 %)</button>
          </div>
        </section>
        <div id="warnliste"></div>`;

      const regler = document.getElementById("schwelle");
      const setze = async (wert) => {
        zustand.einstellungen.schwelleProzent = wert;
        regler.value = wert;
        document.getElementById("schwelle-wert").textContent = wert + " %";
        zeichneWarnliste();
        aktualisiereWarnZaehler();
        await window.DataLayer.speichereEinstellungen(zustand.einstellungen);
      };
      regler.addEventListener("input", () => setze(Number(regler.value)));
      document.getElementById("schwelle-standard").addEventListener("click", () => setze(20));
      zeichneWarnliste();
    },
  };

  function zeichneWarnliste() {
    const jahr = zustand.model.jahr;
    const zeilen = (art) => {
      const anzahl = art === "monat" ? 12 : 4;
      let html = "", zeitraeume = 0;
      for (let i = 1; i <= anzahl; i++) {
        const v = art === "monat" ? vergleichMonat(jahr, i) : vergleichQuartal(jahr, i);
        if (!v.abweichungen.length) continue;
        zeitraeume++;
        const name = art === "monat" ? MONATE[i - 1] : "Q" + i;
        const ziel = art === "monat" ? alsText(new Date(jahr, i - 1, 1)) : alsText(new Date(jahr, (i - 1) * 3, 1));
        v.abweichungen.forEach((a, n) => {
          const istAuslastung = a.art === "auslastung";
          const klasse = a.abw < 0 ? "zu-wenig" : "zu-viel";
          html += `<tr>
            <td>${n === 0 ? `<a href="#/${art}/${ziel}"><strong>${name}</strong></a>` : ""}</td>
            <td>${istAuslastung ? "📊 Auslastung" : katPille(a.kat)}</td>
            <td class="zahl">${istAuslastung ? prozent(a.ist) : a.ist}</td>
            <td class="zahl">${istAuslastung ? prozent(a.soll) : a.soll}</td>
            <td class="zahl"><span class="abw ${klasse}">${vorzeichenProzent(a.abw)}</span></td>
            <td>${esc(istAuslastung ? (a.abw > 0 ? "überbucht" : "zu leer") : a.abw === Infinity ? "nicht eingeplant" : a.abw < 0 ? "zu wenig Events" : "mehr als geplant")}</td>
          </tr>`;
        });
      }
      return { html, zeitraeume };
    };
    const m = zeilen("monat"), q = zeilen("quartal");
    const tabelle = (titel, z, leerText) => `
      <section class="karte abschnitt">
        <h2>${titel} <span class="leise">(${z.zeitraeume} auffällig)</span></h2>
        ${z.html ? `<div class="tabellen-rahmen"><table class="tabelle abschnitt">
          <thead><tr><th>Zeitraum</th><th>Was</th><th class="zahl">Ist</th><th class="zahl">Soll</th><th class="zahl">Abweichung</th><th>Bedeutung</th></tr></thead>
          <tbody>${z.html}</tbody></table></div>` : `<p class="leise">${leerText}</p>`}
      </section>`;
    document.getElementById("warnliste").innerHTML =
      tabelle("Monate", m, "Kein Monat weicht stärker als die Schwelle ab. 🎉") +
      tabelle("Quartale", q, "Kein Quartal weicht stärker als die Schwelle ab. 🎉");
  }

  // ---------------------------------------------------------------- Vorlagen
  ANSICHTEN.vorlagen = {
    blaettern: false,
    titel: () => "Vorlagen",
    zeichne() {
      const jahr = zustand.model.jahr;
      $inhalt.innerHTML = `
        <p class="leise" style="margin-top:0">Jede Kategorie hat eine Vorlage. Daraus entstehen neue Event-Entwürfe sowie Social-Post- und Mail-Vorschläge.
          Platzhalter wie <code>{titel}</code>, <code>{datum}</code>, <code>{uhrzeit}</code> und <code>{ort}</code> werden automatisch ersetzt.</p>
        <div class="vorlagen">${zustand.templates.map((t, i) => {
          const anzahl = zustand.events.filter((e) => e.kategorie === t.kategorie && e.datum.startsWith(String(jahr))).length;
          return `
          <article class="karte vorlage ${katKlasse(t.kategorie)}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">${katPille(t.kategorie)}
              <span class="leise" style="font-size:.82rem">${anzahl} Events in ${jahr}</span></div>
            <div class="titel-vorlage" title="Titel-Vorlage">${esc(t.titelVorlage)}</div>
            <p style="margin:0">${esc(t.beschreibung)}</p>
            <div class="tags">${t.tags.map((tag) => `<span class="tag">#${esc(tag)}</span>`).join("")}</div>
            <details><summary>Social-Post-Text</summary><pre>${esc(t.socialText)}</pre></details>
            <details><summary>Mail-Text</summary><pre>${esc(t.mailText)}</pre></details>
            <button class="knopf haupt klein" data-vorlage="${i}">+ Neues Event aus Vorlage</button>
          </article>`;
        }).join("")}</div>`;
      $inhalt.querySelectorAll("[data-vorlage]").forEach((b) =>
        b.addEventListener("click", () => oeffneEventFormular(entwurfAusVorlage(zustand.templates[Number(b.dataset.vorlage)]))));
    },
  };

  // ---------------------------------------------------------------- Verbindungen
  const VERBINDUNG_FARBE = { notion: "#2b2320", eventbrite: "#d2552e", gmail: "#d9677a", gcal: "#d99a1e" };
  const VERBINDUNG_KUERZEL = { notion: "N", eventbrite: "Eb", gmail: "M", gcal: "31" };

  ANSICHTEN.verbindungen = {
    blaettern: false,
    titel: () => "Verbindungen",
    async zeichne() {
      const liste = await window.DataLayer.ladeVerbindungen();
      $inhalt.innerHTML = `
        <p class="leise" style="margin-top:0">Hier werden später die echten Dienste angeschlossen. In der Demo ist noch nichts verbunden –
          alle Zahlen und Namen sind erfunden.</p>
        <div class="verbindungen">${liste.map((v) => `
          <article class="karte verbindung">
            <div class="verbindung-logo" style="background:${VERBINDUNG_FARBE[v.id] || "var(--akzent)"}" aria-hidden="true">${VERBINDUNG_KUERZEL[v.id] || "?"}</div>
            <h2>${esc(v.name)}</h2>
            <span class="verbindung-status">${v.verbunden ? "verbunden" : "nicht verbunden (Demo)"}</span>
            <p style="margin:0">${esc(v.zweck)}</p>
            <p class="leise" style="margin:0;font-size:.88rem"><strong>Später:</strong> ${esc(v.spaeter)}</p>
            <button class="knopf klein" disabled title="Kommt in einer späteren Ausbaustufe">Verbinden (bald)</button>
          </article>`).join("")}</div>
        <section class="karte abschnitt">
          <h2>So geht es weiter</h2>
          <ol>
            <li>Notion als Datenquelle (nur lesen)</li>
            <li>Soll-Ist-Abgleich mit echten Modell-Daten</li>
            <li>Eventbrite: Entwürfe aus Vorlagen anlegen</li>
            <li>Google Calendar und Gmail (Login, minimale Rechte)</li>
            <li>Social-Vorschläge und Mail-Intelligenz mit KI</li>
          </ol>
          <p class="leise" style="margin-bottom:0">Technisch wird dafür nur die Datei <code>data-layer.js</code> ausgetauscht – die Oberfläche bleibt gleich.</p>
        </section>`;
    },
  };

  // ======================================================================
  // 5. DIALOGE
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
      uhrzeit: e.startzeit + " Uhr",
      ort: e.ort,
      kategorie: e.kategorie,
    };
    return String(text || "").replace(/\{(\w+)\}/g, (alles, name) => (name in werte ? werte[name] : alles));
  }

  /** Social-Post- oder Mail-Vorschlag aus der passenden Vorlage */
  function zeigeVorschlag(e, art) {
    const vorlage = zustand.templates.find((t) => t.kategorie === e.kategorie);
    if (!vorlage) {
      zeigeMeldung("Für diese Kategorie gibt es keine Vorlage.");
      return;
    }
    const text = fuelleVorlage(art === "social" ? vorlage.socialText : vorlage.mailText, e);
    oeffneDialog(`
      <div class="dialog-kopf"><h2>${art === "social" ? "✨ Social-Post-Vorschlag" : "✉️ Reminder-Mail-Vorschlag"}</h2>
        <button class="knopf rund leise" data-schliessen aria-label="Schließen">×</button></div>
      <div class="dialog-koerper">
        <p class="leise" style="margin-top:0">Aus der Vorlage „${esc(vorlage.kategorie)}“ – du kannst den Text hier noch anpassen.</p>
        <div class="formular"><label class="breit">Text
          <textarea id="vorschlag-text" rows="11">${esc(text)}</textarea></label></div>
        <p class="leise" style="font-size:.82rem">Später (Roadmap): Vorschläge werden mit KI verfeinert${art === "mail" ? " und als Gmail-Entwurf angelegt" : ""}.</p>
      </div>
      <div class="dialog-fuss">
        <button class="knopf leise" data-schliessen>Schließen</button>
        <button class="knopf haupt" id="kopieren">Text kopieren</button>
      </div>`);
    document.getElementById("kopieren").addEventListener("click", async () => {
      const feld = document.getElementById("vorschlag-text");
      try {
        await navigator.clipboard.writeText(feld.value);
      } catch (err) {
        feld.select();
        document.execCommand("copy");
      }
      zeigeMeldung("Text kopiert ✓");
    });
  }

  const STANDARD_AUFGABEN = ["Speaker:in anfragen", "Raum reservieren", "Eventbrite-Seite anlegen",
    "Social-Post planen", "Reminder-Mail senden"];

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
      status: "Idee",
      ort: ueblich(t.kategorie, "ort", "Loft – Eventfläche"),
      "kapazität": Number(ueblich(t.kategorie, "kapazität", 30)),
      anmeldungen: 0,
      verantwortlich: "Community Lead",
      eventbriteId: "",
      kalenderId: "",
      tags: t.tags.slice(),
      aufgaben: STANDARD_AUFGABEN.map((text) => ({ text, erledigt: false })),
    };
  }

  /** Formular zum Anlegen (ohne id) oder Bearbeiten (mit id) */
  function oeffneEventFormular(vorlage) {
    const neu = !vorlage || !vorlage.id;
    const e = vorlage || {
      titel: "", datum: alsText(zustand.datum || heute()), startzeit: "18:00", kategorie: KATEGORIEN[0],
      status: "Idee", ort: "Loft – Eventfläche", "kapazität": 30, anmeldungen: 0,
      verantwortlich: "Community Lead", eventbriteId: "", kalenderId: "", tags: [],
      aufgaben: STANDARD_AUFGABEN.map((text) => ({ text, erledigt: false })),
    };
    const jahr = zustand.model.jahr;
    const team = [...new Set(zustand.events.map((x) => x.verantwortlich))].sort();
    const orte = [...new Set(zustand.events.map((x) => x.ort))].sort();
    const auswahl = (werte, aktuell) => werte.map((w) =>
      `<option ${w === aktuell ? "selected" : ""}>${esc(w)}</option>`).join("");

    oeffneDialog(`
      <form id="event-formular" novalidate>
        <div class="dialog-kopf"><h2>${neu ? (vorlage ? "Neuer Entwurf aus Vorlage" : "Neues Event") : "Event bearbeiten"}</h2>
          <button type="button" class="knopf rund leise" data-schliessen aria-label="Schließen">×</button></div>
        <div class="dialog-koerper">
          <div class="formular">
            <label class="breit">Titel *<input name="titel" required value="${esc(e.titel)}" placeholder="z. B. Storytelling für Impact-Startups"></label>
            <label>Datum *<input type="date" name="datum" required min="${jahr}-01-01" max="${jahr}-12-31" value="${esc(e.datum)}"></label>
            <label>Startzeit<input type="time" name="startzeit" value="${esc(e.startzeit)}"></label>
            <label>Kategorie<select name="kategorie">${auswahl(KATEGORIEN, e.kategorie)}</select></label>
            <label>Status<select name="status">${auswahl(STATUS, e.status)}</select></label>
            <label class="breit">Ort<input name="ort" list="orte" value="${esc(e.ort)}"></label>
            <label>Kapazität (Plätze)<input type="number" name="kapazität" min="0" value="${esc(e["kapazität"])}"></label>
            <label>Anmeldungen<input type="number" name="anmeldungen" min="0" value="${esc(e.anmeldungen)}"></label>
            <label class="breit">Verantwortlich (Rolle, keine echten Namen)<input name="verantwortlich" list="team" value="${esc(e.verantwortlich)}"></label>
            <label>Eventbrite-ID<input name="eventbriteId" value="${esc(e.eventbriteId)}" placeholder="später automatisch"></label>
            <label>Kalender-ID<input name="kalenderId" value="${esc(e.kalenderId)}" placeholder="später automatisch"></label>
            <label class="breit">Tags (mit Komma getrennt)<input name="tags" value="${esc((e.tags || []).join(", "))}"></label>
          </div>
          <datalist id="team">${team.map((t) => `<option value="${esc(t)}">`).join("")}</datalist>
          <datalist id="orte">${orte.map((t) => `<option value="${esc(t)}">`).join("")}</datalist>
          <p class="leise" style="font-size:.82rem">Wird nur in diesem Browser gespeichert. „Demo-Daten zurücksetzen“ (unten auf der Seite) macht alles rückgängig.</p>
          <p id="formular-fehler" style="color:var(--kritisch)"></p>
        </div>
        <div class="dialog-fuss">
          ${neu ? "" : '<button type="button" class="knopf gefahr leise links" id="loeschen">Löschen</button>'}
          <button type="button" class="knopf leise" data-schliessen>Abbrechen</button>
          <button type="submit" class="knopf haupt">Speichern</button>
        </div>
      </form>`);

    const formular = document.getElementById("event-formular");
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
        tags: String(f.get("tags")).split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
      });
      const fehler = !gespeichert.titel ? "Bitte einen Titel eingeben."
        : !/^\d{4}-\d{2}-\d{2}$/.test(gespeichert.datum) ? "Bitte ein Datum wählen."
        : !gespeichert.datum.startsWith(String(jahr)) ? `Das Datum muss im Jahr ${jahr} liegen (dafür gibt es ein Modell).`
        : "";
      if (fehler) {
        document.getElementById("formular-fehler").textContent = fehler;
        return;
      }
      const ergebnis = await window.DataLayer.speichereEvent(gespeichert);
      await ladeNeu();
      $dialog.close();
      zeigeMeldung(neu ? "Event angelegt ✓" : "Änderungen gespeichert ✓");
      geheZu("woche", alsDatum(ergebnis.datum), ergebnis.id);
      zeichne(); // falls sich die Adresse nicht geändert hat
    });
    const loeschen = document.getElementById("loeschen");
    if (loeschen) {
      loeschen.addEventListener("click", async () => {
        if (!window.confirm(`„${e.titel}“ wirklich löschen?`)) return;
        await window.DataLayer.loescheEvent(e.id);
        await ladeNeu();
        $dialog.close();
        zeigeMeldung("Event gelöscht");
        zeichne();
      });
    }
  }

  // ======================================================================
  // 6. NAVIGATION & START
  // ======================================================================

  /** Adresse (Hash) wie "#/monat/2026-11-01" -> Ansicht + Datum */
  function leseAdresse() {
    const teile = window.location.hash.replace(/^#\/?/, "").split("/");
    const ansicht = ANSICHTEN[teile[0]] ? teile[0] : "jahr";
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
