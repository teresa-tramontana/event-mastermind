"""
Erzeugt die ERFUNDENEN Demo-Daten für den Event-Manager (Inhalte auf Englisch).

Was macht dieses Skript?
- Es schreibt data/events.json, data/templates.json, data/model.json und data/tags.json.
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

MONATE = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]
KATEGORIEN = ["Workshop", "Networking", "Talk", "Community Lunch", "Pitch Night"]

# ---------------------------------------------------------------- Tags
# Feste Tag-Liste. "kurz" = Stichwort für die Summary, "satz" = Satz für die Description.
TAGS = [
    {"tag": "Small groups", "kurz": "small group",
     "satz": "We keep the group small, so everyone gets space to ask questions and contribute."},
    {"tag": "Formal", "kurz": "structured format",
     "satz": "The session follows a clear agenda and a structured flow."},
    {"tag": "Informal", "kurz": "relaxed setting",
     "satz": "The vibe is relaxed and informal – come as you are."},
    {"tag": "Peer feedback/exchange", "kurz": "peer feedback",
     "satz": "You'll share your work and get honest, constructive feedback from peers."},
    {"tag": "Group work", "kurz": "group work",
     "satz": "Expect to roll up your sleeves and work together in small teams."},
    {"tag": "Coaching/consulting", "kurz": "coaching",
     "satz": "Experienced coaches help you work on your own, specific challenges."},
    {"tag": "Workshop", "kurz": "hands-on workshop",
     "satz": "It's a hands-on format – you'll leave with concrete results, not just notes."},
    {"tag": "Skillshare", "kurz": "skillshare",
     "satz": "Community members share skills they have learned in practice."},
    {"tag": "Expert guidance", "kurz": "expert input",
     "satz": "An expert guides you through the topic and answers your questions."},
    {"tag": "Practical exercises", "kurz": "practical exercises",
     "satz": "Practical exercises help you apply what you learn straight away."},
    {"tag": "Community/Gathering", "kurz": "community gathering",
     "satz": "It's a chance to meet the community and feel at home in the Hub."},
    {"tag": "1:1 sessions", "kurz": "1:1 sessions",
     "satz": "You can book short 1:1 slots for your individual questions."},
    {"tag": "Guided networking", "kurz": "guided networking",
     "satz": "Our hosts guide the networking, so you meet the right people – no awkward small talk."},
    {"tag": "Matchmaking", "kurz": "matchmaking",
     "satz": "We match people with complementary needs and offers."},
    {"tag": "Keynote/panel", "kurz": "keynote & panel",
     "satz": "A keynote or panel brings fresh perspectives, followed by an open Q&A."},
    {"tag": "Collaboration", "kurz": "collaboration",
     "satz": "The focus is on collaboration and finding partners for joint projects."},
    {"tag": "Unwind", "kurz": "time to unwind",
     "satz": "Leave the laptop behind and unwind with good people."},
]
TAG_INFO = {t["tag"]: t for t in TAGS}

# Welche Tags passen zu welcher Kategorie? (immer + manchmal)
TAG_POOL = {
    "Workshop": (["Workshop", "Practical exercises"],
                 ["Small groups", "Expert guidance", "Group work", "1:1 sessions",
                  "Coaching/consulting", "Skillshare", "Peer feedback/exchange"]),
    "Networking": (["Guided networking"],
                   ["Matchmaking", "Informal", "Community/Gathering", "Collaboration", "Unwind"]),
    "Talk": (["Keynote/panel"], ["Expert guidance", "Formal", "Peer feedback/exchange"]),
    "Community Lunch": (["Community/Gathering", "Informal"],
                        ["Peer feedback/exchange", "Unwind", "Skillshare"]),
    "Pitch Night": (["Peer feedback/exchange", "Matchmaking"],
                    ["Expert guidance", "Formal", "Coaching/consulting"]),
}

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

# ---------------------------------------------------------------- Vorlagen
# {thema} = Thema des Events, {merkmale} = Stichworte aus den Tags
templates = [
    {
        "kategorie": "Workshop",
        "titelVorlage": "Workshop: [Topic] – compact & practical",
        "titelIdeen": ["{thema}: A Hands-on Workshop", "Learn by Doing: {thema}",
                       "{thema} in 3 Hours", "The {thema} Toolkit"],
        "beschreibung": "A 2–3 hour practical workshop on {thema} for founders, freelancers and members. "
                        "Lots of trying things out, and concrete next steps to take home.",
        "summaryVorlage": "Practical workshop on {thema} – {merkmale}.",
        "tags": ["Workshop", "Practical exercises", "Small groups"],
        "socialText": "🛠️ New workshop at the Hub!\n\n\"{titel}\"\n📅 {datum} at {uhrzeit}\n📍 {ort}\n\n"
                      "{summary}\n\nSpots are limited – grab yours! 👉 Link in bio\n\n#ImpactHub #Workshop #Learning",
        "mailText": "Hi everyone,\n\nwe're looking forward to the workshop \"{titel}\" on {datum} at {uhrzeit} ({ort}).\n\n"
                    "Please bring a laptop or notebook. If you can't make it, please release your spot via "
                    "Eventbrite – the waiting list will thank you!\n\nSee you soon,\nyour Community Team",
    },
    {
        "kategorie": "Networking",
        "titelVorlage": "[Occasion] – Community Get-Together",
        "titelIdeen": ["{thema}: Meet & Connect", "Connect over {thema}",
                       "{thema} – Community Evening", "Who's Who in {thema}"],
        "beschreibung": "A relaxed evening around {thema}: new members, partners and friends of the Hub get to know "
                        "each other. A short welcome, then drinks and good conversations.",
        "summaryVorlage": "Community evening around {thema} – {merkmale}.",
        "tags": ["Guided networking", "Informal", "Community/Gathering"],
        "socialText": "🥂 Time for new connections!\n\n\"{titel}\"\n📅 {datum} from {uhrzeit}\n📍 {ort}\n\n"
                      "{summary}\n\nFounder, freelancer or just curious – drop by and meet the community. 💛\n\n"
                      "#ImpactHub #Networking #Community",
        "mailText": "Hi everyone,\n\nit's almost time for \"{titel}\" on {datum} from {uhrzeit} ({ort}).\n\n"
                    "Feel free to bring someone who should get to know the community!\n\n"
                    "See you soon,\nyour Community Team",
    },
    {
        "kategorie": "Talk",
        "titelVorlage": "Impact Talk: [Topic]",
        "titelIdeen": ["Impact Talk: {thema}", "{thema} – Insights & Q&A",
                       "Rethinking {thema}", "Fireside Chat: {thema}"],
        "beschreibung": "An inspiring input on {thema} (approx. 30 min.) followed by an open Q&A. Guests from business, "
                        "science or civil society share their experience.",
        "summaryVorlage": "Inspiring talk on {thema} – {merkmale}.",
        "tags": ["Keynote/panel", "Expert guidance"],
        "socialText": "🎤 Impact Talk at the Hub\n\n\"{titel}\"\n📅 {datum} at {uhrzeit}\n📍 {ort}\n\n"
                      "{summary}\n\nFree entry, registration via Eventbrite. 👉 Link in bio\n\n"
                      "#ImpactHub #Talk #Sustainability",
        "mailText": "Hi everyone,\n\na friendly reminder about the talk \"{titel}\" on {datum} at {uhrzeit} ({ort}).\n\n"
                    "Send us your questions in advance – we'll collect them for the discussion.\n\n"
                    "See you soon,\nyour Community Team",
    },
    {
        "kategorie": "Community Lunch",
        "titelVorlage": "Wednesday Wrap: [Theme]",
        "titelIdeen": ["Wednesday Wrap: {thema}", "Lunch & Learn: {thema}",
                       "Bring Your Bowl: {thema}"],
        "beschreibung": "A shared lunch for members, this time around {thema}. Everyone brings something or we cook "
                        "together – time to exchange, ask questions and share news.",
        "summaryVorlage": "Members' lunch around {thema} – {merkmale}.",
        "tags": ["Community/Gathering", "Informal", "Unwind"],
        "socialText": "🥗 Lunch break with the community!\n\n\"{titel}\"\n📅 {datum} at {uhrzeit}\n📍 {ort}\n\n"
                      "{summary}\n\nBring your food (or your appetite). Members only. 💛\n\n#ImpactHub #CommunityLunch",
        "mailText": "Hi lovely people,\n\non {datum} at {uhrzeit} it's Wednesday Wrap again – this time "
                    "\"{titel}\" ({ort}).\n\nPlease sign up quickly so we have enough plates and ideas.\n\n"
                    "See you Wednesday,\nyour Community Team",
    },
    {
        "kategorie": "Pitch Night",
        "titelVorlage": "Open Pitch Night: [Edition]",
        "titelIdeen": ["Open Pitch Night: {thema}", "{thema}: Founders on Stage",
                       "Pitch & Feedback Night: {thema}"],
        "beschreibung": "Young impact startups pitch on {thema} in 3 minutes each – in front of the community, mentors "
                        "and investors. Followed by feedback, an audience award and networking.",
        "summaryVorlage": "Startup pitch night on {thema} – {merkmale}.",
        "tags": ["Peer feedback/exchange", "Matchmaking", "Formal"],
        "socialText": "🚀 Stage's yours, next impact founders!\n\n\"{titel}\"\n📅 {datum} at {uhrzeit}\n📍 {ort}\n\n"
                      "{summary}\n\nCheer on the startups and vote for the audience award! 👉 Tickets via link in bio\n\n"
                      "#ImpactHub #PitchNight #Startups",
        "mailText": "Hi everyone,\n\nit's almost time: \"{titel}\" on {datum} at {uhrzeit} ({ort}).\n\n"
                    "Doors open 30 minutes earlier. Voting happens on your phone – please bring it charged. 😉\n\n"
                    "See you soon,\nyour Community Team",
    },
]
VORLAGE = {t["kategorie"]: t for t in templates}


def merkmale(tags, kat=""):
    """['small group', 'expert input', 'coaching'] -> 'small group, expert input & coaching'
    (ein Tag, der genauso heißt wie die Kategorie, wird weggelassen – sonst doppelt)"""
    w = [TAG_INFO[t]["kurz"] for t in tags if t in TAG_INFO and t != kat][:3]
    if len(w) <= 1:
        return "".join(w) or "open to everyone"
    return ", ".join(w[:-1]) + " & " + w[-1]


def beschreibung_fuer(kat, thema, tags):
    intro = VORLAGE[kat]["beschreibung"].replace("{thema}", thema)
    saetze = " ".join(TAG_INFO[t]["satz"] for t in tags if t in TAG_INFO)
    return intro + ("\n\n" + saetze if saetze else "")


def summary_fuer(kat, thema, tags):
    return VORLAGE[kat]["summaryVorlage"].replace("{thema}", thema).replace("{merkmale}", merkmale(tags, kat))


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

# (Titel, Thema) – das Thema wird für Description und Summary verwendet
TITEL = {
    "Workshop": [
        ("Morning Spark: Your First Circular Business Move", "circular business"),
        ("Storytelling for Impact Startups", "storytelling"),
        ("Money Literacy for Founders", "money literacy"),
        ("Taming Your Inner Critic", "dealing with your inner critic"),
        ("Pitch Deck Clinic", "pitch decks"),
        ("Design Thinking in 3 Hours", "design thinking"),
        ("Social Media on a Small Budget", "social media on a budget"),
        ("Measuring Impact Made Simple", "impact measurement"),
        ("Finding & Using Funding", "funding"),
        ("Get Clear on Your Most Effective Next Steps", "prioritising what matters"),
        ("Prototyping Afternoon", "prototyping"),
        ("Pricing for Social Ventures", "pricing"),
        ("Freelance Basics: Invoices, Taxes & Co.", "freelance basics"),
        ("Mindful Coworking", "mindful work"),
        ("Building Community from Scratch", "community building"),
        ("Inclusive Communication", "inclusive communication"),
        ("Annual Planning with Impact", "annual planning"),
        ("Time Management for Creatives", "time management"),
        ("Planning a Crowdfunding Campaign", "crowdfunding"),
        ("Feedback Culture in Small Teams", "feedback culture"),
        ("MasterClass: Access to Finance", "access to finance"),
        ("Creative Sprint: New Ideas for the New Year", "new ideas"),
    ],
    "Networking": [
        ("Founders After Work", "founder life"),
        ("Impact Capital Circle Meetup", "impact capital"),
        ("Community Crossover Day", "cross-community exchange"),
        ("International Dinner – Levant Edition", "food from the Levant"),
        ("Welcome Evening for New Members", "getting started at the Hub"),
        ("Summer Spritz on the Rooftop", "summer vibes"),
        ("Sunset Walk & Heuriger", "Vienna's vineyards"),
        ("Speed Networking: Who Does What?", "skills in the community"),
        ("Collaboration Café", "joint projects"),
        ("Autumn Get-Together", "autumn plans"),
        ("Impact Capital Circle Meetup #2", "impact capital"),
        ("Punch & Plans", "plans for the new year"),
    ],
    "Talk": [
        ("Leading Business Beyond Growth", "business beyond growth"),
        ("Placemaking: Green Spaces in the City", "urban green spaces"),
        ("AI for the Common Good", "AI for the common good"),
        ("Democracy Needs Entrepreneurship", "democracy & entrepreneurship"),
        ("Circular Fashion: What Really Counts", "circular fashion"),
        ("Common Good Balance Sheet in Practice", "the common good balance sheet"),
        ("Fireside Chat: Failing & Starting Over", "failing and starting over"),
        ("Energy Communities in the Neighbourhood", "energy communities"),
        ("Impact Investing Explained", "impact investing"),
        ("Food Transition in the City", "the urban food transition"),
        ("Mental Health in Startup Life", "mental health"),
        ("Inclusion as a Business Model", "inclusion"),
    ],
    "Community Lunch": [
        ("Wednesday Wrap: New Year Edition", "new year's resolutions"),
        ("Wednesday Wrap: Soup & Exchange", "soup and stories"),
        ("Wednesday Wrap: Bring Your Bowl", "favourite recipes"),
        ("Wednesday Wrap: Spring Kitchen", "spring food"),
        ("Wednesday Wrap: Rooftop Picnic", "a rooftop picnic"),
        ("Wednesday Wrap: Members Cook", "members' home cooking"),
        ("Wednesday Wrap: Summer Salads", "summer salads"),
        ("Wednesday Wrap: Bread & Ideas", "fresh bread and ideas"),
        ("Wednesday Wrap: Harvest Edition", "the harvest season"),
        ("Wednesday Wrap: Pumpkin Edition", "pumpkin dishes"),
        ("Wednesday Wrap: Plate Swap", "swapping dishes"),
        ("Wednesday Wrap: Cookie Edition", "holiday cookies"),
    ],
    "Pitch Night": [
        ("Open Pitch Night: Meet the Next Impact Founders", "the next impact founders"),
        ("Open Pitch Night: Summer Edition", "summer ventures"),
        ("Open Pitch Night: Autumn Edition", "autumn ventures"),
        ("Open Pitch Night: Season Finale", "the year's best ideas"),
    ],
}
KAPAZITAET = {"Workshop": 20, "Networking": 60, "Talk": 50,
              "Community Lunch": 30, "Pitch Night": 80}
ORTE = {"Workshop": ["Loft – Workshop Room", "Salon", "Online (demo Zoom)"],
        "Networking": ["Loft – Event Space", "Rooftop Terrace", "Partner venue (demo)"],
        "Talk": ["Loft – Event Space", "Salon"],
        "Community Lunch": ["Kitchen & Lounge"],
        "Pitch Night": ["Loft – Event Space"]}
TEAM = ["Community Lead", "Programme Team", "Host Team",
        "Membership Team", "Events Intern"]

AUFGABEN = {
    "Idea": [("Ask speaker", False), ("Book room", False), ("Clarify budget", False)],
    "Planned": [("Book room", True), ("Create Eventbrite page", False), ("Plan social post", False)],
    "Published": [("Eventbrite page live", True), ("Share social post", None),
                  ("Send reminder email", False), ("Confirm catering", None)],
    "Done": [("Share photos", None), ("Send feedback email", None),
             ("Add numbers to Notion", None)],
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
                status = "Done"
            elif tage_bis <= 30:
                status = "Published"
            elif tag.month == 12 and kat in ("Pitch Night", "Talk"):
                status = "Idea"
            else:
                status = "Planned"

            kap = KAPAZITAET[kat]
            if status == "Done":
                if m <= 3:   # Q1: überbucht (Warteliste wurde reingelassen)
                    quote = random.uniform(1.08, 1.32)
                else:
                    quote = random.uniform(0.64, 0.88)
            elif status == "Published":
                quote = max(0.15, 0.85 - tage_bis * 0.025) * random.uniform(0.8, 1.1)
            else:
                quote = 0
            anmeldungen = round(kap * quote)

            titel_liste = TITEL[kat]
            titel, thema = titel_liste[titel_index[kat] % len(titel_liste)]
            titel_index[kat] += 1

            immer, manchmal = TAG_POOL[kat]
            tags = immer + random.sample(manchmal, random.randint(1, 2))

            aufgaben = []
            for text, erledigt in AUFGABEN[status]:
                if erledigt is None:
                    erledigt = random.random() < (0.85 if status == "Done" else 0.5)
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
                "eventbriteId": f"EB-DEMO-{1000 + nr}" if status in ("Published", "Done") else "",
                "kalenderId": f"CAL-DEMO-{2000 + nr}" if status != "Idea" else "",
                "tags": tags,
                "zusammenfassung": summary_fuer(kat, thema, tags),
                "beschreibung": beschreibung_fuer(kat, thema, tags),
                "aufgaben": aufgaben,
            })

events.sort(key=lambda e: (e["datum"], e["startzeit"]))


def schreibe(name, daten):
    (DATA / name).write_text(json.dumps(daten, ensure_ascii=False, indent=2) + "\n",
                             encoding="utf-8")


schreibe("events.json", events)
schreibe("templates.json", templates)
schreibe("model.json", model)
schreibe("tags.json", TAGS)
print(f"{len(events)} Events, {len(templates)} Vorlagen, {len(TAGS)} Tags, Modell für {JAHR} geschrieben.")
