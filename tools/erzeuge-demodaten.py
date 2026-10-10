"""
Erzeugt die ERFUNDENEN Demo-Daten für den Event-Manager.

Was macht dieses Skript?
- Es schreibt data/events.json, data/templates.json und data/model.json.
- Alle Inhalte sind synthetisch (keine echten Namen, Mails oder Teilnehmenden).
- Absichtlich eingebaute Abweichungen vom Modell:
    * Q1 (Jan–März) ist überbucht (Auslastung weit über Ziel)
    * Mai: ein Talk mehr als geplant
    * November: gar keine Workshops (Soll: 2)
- Der Zufall ist "festgenagelt" (seed), damit bei jedem Lauf dasselbe herauskommt.

Ausführen (nur nötig, wenn man die Demo-Daten neu würfeln will):
    python3 tools/erzeuge-demodaten.py
    python3 tools/baue-demo-daten.py
"""
import calendar
import json
import random
from datetime import date
from pathlib import Path

random.seed(2026)
JAHR = 2026
DEMO_HEUTE = date(2026, 10, 10)  # "Heute" in der Demo
DATA = Path(__file__).resolve().parent.parent / "data"

MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
          "August", "September", "Oktober", "November", "Dezember"]
KATEGORIEN = ["Workshop", "Networking", "Talk", "Community Lunch", "Pitch Night"]

# ---------------------------------------------------------------- Modell (Soll)
def soll_fuer_monat(m):
    soll = {"Workshop": 2, "Networking": 1, "Talk": 1, "Community Lunch": 1,
            "Pitch Night": 1 if m in (3, 6, 9, 12) else 0}
    if m == 8:  # Sommerpause ist im Modell schon eingeplant
        soll.update({"Workshop": 1, "Talk": 0})
    return soll

ZIEL_AUSLASTUNG = 75
model = {
    "jahr": JAHR,
    "demoHeute": DEMO_HEUTE.isoformat(),
    "kategorien": KATEGORIEN,
    "monate": [],
    "quartale": [],
}
for m in range(1, 13):
    model["monate"].append({"monat": m, "name": MONATE[m - 1],
                            "soll": soll_fuer_monat(m),
                            "zielAuslastung": ZIEL_AUSLASTUNG})
for q in range(1, 5):
    summe = {k: sum(soll_fuer_monat(m)[k] for m in range(q * 3 - 2, q * 3 + 1))
             for k in KATEGORIEN}
    model["quartale"].append({"quartal": q, "name": f"Q{q}", "soll": summe,
                              "zielAuslastung": ZIEL_AUSLASTUNG})

# ---------------------------------------------------------------- Ist-Planung
# Wie viele Events es pro Monat WIRKLICH gibt (mit Abweichungen)
ist = {m: dict(soll_fuer_monat(m)) for m in range(1, 13)}
ist[5]["Talk"] = 2          # Mai: ein Talk zu viel
ist[11]["Workshop"] = 0     # November: Workshops fehlen


def nter_wochentag(m, wochentag, n):
    """n-ter Wochentag im Monat (0=Mo ... 6=So). n=-1 heißt: der letzte."""
    tage = [d for d in range(1, calendar.monthrange(JAHR, m)[1] + 1)
            if date(JAHR, m, d).weekday() == wochentag]
    return date(JAHR, m, tage[n - 1] if n > 0 else tage[n])


# Feste Rhythmen, angelehnt an typische Hub-Wochen
TERMINE = {
    "Workshop": [(1, 1, "10:00"), (3, 3, "16:00")],    # 1. Di, 3. Do
    "Networking": [(3, 2, "18:00")],                   # 2. Do
    "Talk": [(2, 2, "16:00"), (2, 4, "16:00")],        # 2. Mi, 4. Mi
    "Community Lunch": [(2, -1, "12:30")],             # letzter Mi
    "Pitch Night": [(3, -1, "18:30")],                 # letzter Do
}

TITEL = {
    "Workshop": [
        "Morning Spark: Dein erster Schritt in die Kreislaufwirtschaft",
        "Storytelling für Impact-Startups", "Money Literacy für Gründer:innen",
        "Den inneren Kritiker zähmen", "Pitch-Deck-Klinik",
        "Design Thinking in 3 Stunden", "Social Media mit kleinem Budget",
        "Wirkung messen – ganz einfach", "Fördertöpfe finden & nutzen",
        "Klar priorisieren: Die wirksamsten nächsten Schritte",
        "Prototyping am Nachmittag", "Pricing für soziale Angebote",
        "Freelance-Basics: Rechnungen, Steuern & Co.",
        "Achtsam arbeiten im Coworking", "Community aufbauen von Null",
        "Barrierefrei kommunizieren", "Jahresplanung mit Wirkung",
        "Zeitmanagement für Kreative", "Crowdfunding-Kampagne planen",
        "Feedback-Kultur im kleinen Team", "MasterClass: Zugang zu Kapital",
        "Kreativ-Sprint: Neue Ideen fürs neue Jahr",
    ],
    "Networking": [
        "Founders After Work", "Impact Capital Circle Meetup",
        "Community Crossover Day", "International Dinner – Levante Edition",
        "Willkommensabend für neue Mitglieder", "Sommer-Spritzer am Dach",
        "Sunset Walk & Heuriger", "Speed-Networking: Wer kann was?",
        "Kooperations-Café", "Herbst-Get-Together",
        "Impact Capital Circle Meetup #2", "Punsch & Pläne",
    ],
    "Talk": [
        "Wirtschaften jenseits von Wachstum", "Placemaking: Grünräume in der Stadt",
        "KI für das Gemeinwohl", "Demokratie braucht Unternehmergeist",
        "Kreislauf-Mode: Was wirklich zählt", "Gemeinwohl-Bilanz in der Praxis",
        "Fireside Chat: Scheitern & Neustart", "Energie-Gemeinschaften im Grätzl",
        "Impact-Investing verständlich erklärt", "Ernährungswende in der Stadt",
        "Mental Health im Startup-Alltag", "Inklusion als Geschäftsmodell",
    ],
    "Community Lunch": [
        "Wednesday Wrap: Neujahrs-Edition", "Wednesday Wrap: Suppe & Austausch",
        "Wednesday Wrap: Bring your Bowl", "Wednesday Wrap: Frühlingsküche",
        "Wednesday Wrap: Picknick am Dach", "Wednesday Wrap: Mitglieder kochen",
        "Wednesday Wrap: Sommer-Salate", "Wednesday Wrap: Brot & Ideen",
        "Wednesday Wrap: Erntedank", "Wednesday Wrap: Kürbis-Edition",
        "Wednesday Wrap: Teller-Tausch", "Wednesday Wrap: Keks-Edition",
    ],
    "Pitch Night": [
        "Open Pitch Night: Die nächsten Impact Founders (Q1)",
        "Open Pitch Night: Sommer-Edition",
        "Open Pitch Night: Herbst-Edition",
        "Open Pitch Night: Jahresfinale",
    ],
}
KAPAZITAET = {"Workshop": 20, "Networking": 60, "Talk": 50,
              "Community Lunch": 30, "Pitch Night": 80}
ORTE = {"Workshop": ["Loft – Workshopraum", "Salon", "Online (Demo-Zoom)"],
        "Networking": ["Loft – Eventfläche", "Dachterrasse", "Partner-Location (Demo)"],
        "Talk": ["Loft – Eventfläche", "Salon"],
        "Community Lunch": ["Küche & Lounge"],
        "Pitch Night": ["Loft – Eventfläche"]}
TEAM = ["Community Lead", "Programm-Team", "Host-Team",
        "Membership-Team", "Events-Praktikum"]
TAGS = {
    "Workshop": ["lernen", "praxis", "gründen", "skills", "kreislauf", "finanzen"],
    "Networking": ["community", "kontakte", "afterwork", "mitglieder"],
    "Talk": ["impact", "inspiration", "nachhaltigkeit", "gesellschaft"],
    "Community Lunch": ["mitglieder", "essen", "austausch"],
    "Pitch Night": ["startups", "pitch", "investoren", "bühne"],
}

AUFGABEN = {
    "Idee": [("Speaker:in anfragen", False), ("Raum reservieren", False),
             ("Budget grob klären", False)],
    "Geplant": [("Raum reservieren", True), ("Eventbrite-Seite anlegen", False),
                ("Social-Post planen", False)],
    "Veröffentlicht": [("Eventbrite-Seite live", True), ("Social-Post teilen", None),
                       ("Reminder-Mail senden", False), ("Catering bestätigen", None)],
    "Durchgeführt": [("Fotos teilen", None), ("Feedback-Mail senden", None),
                     ("Zahlen in Notion eintragen", None)],
}

events = []
titel_index = {k: 0 for k in KATEGORIEN}
for m in range(1, 13):
    for kat in KATEGORIEN:
        for i in range(ist[m][kat]):
            wochentag, n, zeit = TERMINE[kat][i]
            tag = nter_wochentag(m, wochentag, n)
            tage_bis = (tag - DEMO_HEUTE).days

            # Status hängt vom Datum relativ zu "heute" ab
            if tage_bis < 0:
                status = "Durchgeführt"
            elif tage_bis <= 30:
                status = "Veröffentlicht"
            elif tag.month == 12 and kat in ("Pitch Night", "Talk"):
                status = "Idee"
            else:
                status = "Geplant"

            kap = KAPAZITAET[kat]
            if status == "Durchgeführt":
                if m <= 3:   # Q1: überbucht (Warteliste wurde reingelassen)
                    quote = random.uniform(1.08, 1.32)
                else:
                    quote = random.uniform(0.64, 0.88)
            elif status == "Veröffentlicht":
                quote = max(0.15, 0.85 - tage_bis * 0.025) * random.uniform(0.8, 1.1)
            else:
                quote = 0
            anmeldungen = round(kap * quote)

            titel_liste = TITEL[kat]
            titel = titel_liste[titel_index[kat] % len(titel_liste)]
            titel_index[kat] += 1

            aufgaben = []
            for text, erledigt in AUFGABEN[status]:
                if erledigt is None:
                    erledigt = random.random() < (0.85 if status == "Durchgeführt" else 0.5)
                aufgaben.append({"text": text, "erledigt": erledigt})

            nr = len(events) + 1
            events.append({
                "id": f"evt-{nr:03d}",
                "titel": titel,
                "datum": tag.isoformat(),
                "startzeit": zeit,
                "kategorie": kat,
                "status": status,
                "ort": random.choice(ORTE[kat]),
                "kapazität": kap,
                "anmeldungen": anmeldungen,
                "verantwortlich": random.choice(TEAM),
                "eventbriteId": f"EB-DEMO-{1000 + nr}" if status in ("Veröffentlicht", "Durchgeführt") else "",
                "kalenderId": f"CAL-DEMO-{2000 + nr}" if status != "Idee" else "",
                "tags": random.sample(TAGS[kat], 2),
                "aufgaben": aufgaben,
            })

events.sort(key=lambda e: (e["datum"], e["startzeit"]))

# ---------------------------------------------------------------- Vorlagen
templates = [
    {
        "kategorie": "Workshop",
        "titelVorlage": "Workshop: [Thema] – kompakt & praktisch",
        "beschreibung": "Ein 2–3-stündiger Praxis-Workshop für Gründer:innen und Mitglieder. "
                        "Kleine Gruppe, viel Ausprobieren, konkrete nächste Schritte zum Mitnehmen.",
        "tags": ["lernen", "praxis", "skills"],
        "socialText": "🛠️ Neuer Workshop im Hub!\n\n„{titel}“\n📅 {datum} um {uhrzeit}\n📍 {ort}\n\n"
                      "Kleine Gruppe, viel Praxis – du gehst mit einem konkreten Plan nach Hause. "
                      "Plätze sind begrenzt, also schnell sein! 👉 Link in Bio\n\n#ImpactHub #Workshop #Lernen",
        "mailText": "Hallo zusammen,\n\nwir freuen uns auf den Workshop „{titel}“ am {datum} um {uhrzeit} ({ort}).\n\n"
                    "Bitte bringt Laptop oder Notizbuch mit. Falls ihr doch nicht kommen könnt, gebt euren Platz "
                    "bitte über Eventbrite frei – die Warteliste freut sich!\n\nBis bald,\neuer Community-Team",
    },
    {
        "kategorie": "Networking",
        "titelVorlage": "[Anlass] – Community Get-Together",
        "beschreibung": "Lockerer Abend zum Kennenlernen: neue Mitglieder, Partner:innen und "
                        "Freund:innen des Hubs. Kurze Begrüßung, dann Getränke und Gespräche.",
        "tags": ["community", "kontakte", "afterwork"],
        "socialText": "🥂 Zeit für neue Kontakte!\n\n„{titel}“\n📅 {datum} ab {uhrzeit}\n📍 {ort}\n\n"
                      "Ob Gründer:in, Freelancer oder einfach neugierig – komm vorbei, stoß mit uns an und "
                      "lern die Community kennen. 💛\n\n#ImpactHub #Networking #Community",
        "mailText": "Hallo zusammen,\n\nnur noch kurz bis „{titel}“ am {datum} ab {uhrzeit} ({ort}).\n\n"
                    "Bringt gerne jemanden mit, der die Community kennenlernen sollte!\n\n"
                    "Bis bald,\neuer Community-Team",
    },
    {
        "kategorie": "Talk",
        "titelVorlage": "Impact Talk: [Thema]",
        "beschreibung": "Ein inspirierender Input (ca. 30 Min.) mit anschließender offener Fragerunde. "
                        "Gäste aus Wirtschaft, Wissenschaft oder Zivilgesellschaft teilen ihre Erfahrungen.",
        "tags": ["impact", "inspiration", "nachhaltigkeit"],
        "socialText": "🎤 Impact Talk im Hub\n\n„{titel}“\n📅 {datum} um {uhrzeit}\n📍 {ort}\n\n"
                      "30 Minuten Inspiration, danach Raum für eure Fragen. Eintritt frei, Anmeldung über "
                      "Eventbrite. 👉 Link in Bio\n\n#ImpactHub #Talk #Nachhaltigkeit",
        "mailText": "Hallo zusammen,\n\nwir erinnern euch gerne an den Talk „{titel}“ am {datum} um {uhrzeit} "
                    "({ort}).\n\nSchreibt uns eure Fragen schon vorab – wir sammeln sie für die Diskussion.\n\n"
                    "Bis bald,\neuer Community-Team",
    },
    {
        "kategorie": "Community Lunch",
        "titelVorlage": "Wednesday Wrap: [Motto]",
        "beschreibung": "Gemeinsames Mittagessen der Mitglieder. Jede:r bringt etwas mit oder wir "
                        "kochen zusammen – Zeit zum Austauschen, Fragen stellen und Neues teilen.",
        "tags": ["mitglieder", "essen", "austausch"],
        "socialText": "🥗 Mittagspause mit der Community!\n\n„{titel}“\n📅 {datum} um {uhrzeit}\n📍 {ort}\n\n"
                      "Bring dein Essen (oder deinen Hunger) mit – wir teilen Tisch, Ideen und gute Laune. "
                      "Nur für Mitglieder. 💛\n\n#ImpactHub #CommunityLunch",
        "mailText": "Hallo ihr Lieben,\n\nam {datum} um {uhrzeit} ist wieder Wednesday Wrap – diesmal "
                    "„{titel}“ ({ort}).\n\nTragt euch bitte kurz ein, damit wir genug Teller und Ideen haben.\n\n"
                    "Bis Mittwoch,\neuer Community-Team",
    },
    {
        "kategorie": "Pitch Night",
        "titelVorlage": "Open Pitch Night: [Edition]",
        "beschreibung": "Junge Impact-Startups pitchen in je 3 Minuten vor Community, Mentor:innen und "
                        "Investor:innen. Danach Feedback, Publikumspreis und Networking.",
        "tags": ["startups", "pitch", "bühne"],
        "socialText": "🚀 Bühne frei für die nächsten Impact Founders!\n\n„{titel}“\n📅 {datum} um {uhrzeit}\n"
                      "📍 {ort}\n\n3 Minuten, eine Idee, ganz viel Wirkung. Feuert die Startups an und stimmt "
                      "für den Publikumspreis ab! 👉 Tickets über den Link in Bio\n\n#ImpactHub #PitchNight #Startups",
        "mailText": "Hallo zusammen,\n\nbald ist es so weit: „{titel}“ am {datum} um {uhrzeit} ({ort}).\n\n"
                    "Einlass ist 30 Minuten vorher. Das Voting läuft über euer Handy – bitte aufgeladen "
                    "mitbringen. 😉\n\nBis bald,\neuer Community-Team",
    },
]


def schreibe(name, daten):
    (DATA / name).write_text(json.dumps(daten, ensure_ascii=False, indent=2) + "\n",
                             encoding="utf-8")


schreibe("events.json", events)
schreibe("templates.json", templates)
schreibe("model.json", model)
print(f"{len(events)} Events, {len(templates)} Vorlagen, Modell für {JAHR} geschrieben.")
