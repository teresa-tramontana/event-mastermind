"""
Erzeugt die ERFUNDENEN Demo-Daten für den Event-Manager (Inhalte auf Englisch).

Was macht dieses Skript?
- Es schreibt data/events.json, data/templates.json, data/model.json und data/tags.json.
- Alle Inhalte sind synthetisch (keine echten Namen, Mails oder Teilnehmenden).
- Die 14 Kategorien entsprechen den Kategorien in Notion (Reihenfolge wie dort).
- Absichtlich eingebaute Abweichungen vom Modell:
    * Q1 (Jan–März) ist überbucht (Auslastung weit über Ziel)
    * Mai: ein „Drops of Inspiration“ mehr als geplant
    * November: gar keine Academy-Termine (Soll: 2)
    * einzelne Events mit zu wenigen Anmeldungen (unter 50 %)
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

# ---------------------------------------------------------------- Kategorien
# Alles, was eine Kategorie ausmacht, steht an EINER Stelle:
#   termine   = {Monat: [(Wochentag 0=Mo..6=So, n-ter im Monat (-1 = letzter), Uhrzeit), ...]}
#               -> daraus entsteht auch das Soll im Modell (Anzahl Termine je Monat)
#   kap/orte  = Plätze und mögliche Orte
#   tags      = (immer, manchmal) – Tags aus der festen Liste
#   titel     = Liste aus (Titel, Thema); das Thema landet in Summary und Description
#   vorlage   = Vorlage (Titel-Ideen, Summary, Social-/Mail-Text, Description mit Agenda)
ALLE = range(1, 13)
OHNE_AUGUST = [m for m in ALLE if m != 8]


def jeden_monat(slots, monate=ALLE):
    return {m: list(slots) for m in monate}


def social(emoji, satz, hashtag):
    return (f"{emoji} {satz}\n\n\"{{titel}}\"\n📅 {{datum}} at {{uhrzeit}}\n📍 {{ort}}\n\n{{summary}}\n\n"
            f"Sign up via the link in bio. 💛\n\n#ImpactHub #{hashtag}")


def mail(satz):
    return ("Hi everyone,\n\na friendly reminder: \"{titel}\" takes place on {datum} at {uhrzeit} ({ort}).\n\n"
            f"{satz}\n\nIf you can't make it, please release your spot via Eventbrite.\n\n"
            "See you soon,\nyour Community Team")


# Settings (Format des Events) – vorläufige Platzhalter-Liste, bis die echten Werte aus Notion kommen.
# Steht im Modell (model.json -> "settings"); die App filtert danach.
SETTINGS = ["Workshop", "Training", "1:1 Consulting", "Keynote", "Panel", "Group Setting", "Pairs"]
# Welche Settings je Kategorie vorkommen (der Reihe nach verteilt, ohne Zufall,
# damit sich die übrigen Demo-Daten nicht verändern)
SETTING_JE_KAT = {
    "Community Monthlies": ["Group Setting"],
    "Community Weeklies": ["Group Setting", "Pairs"],
    "Academy": ["Workshop", "Training", "1:1 Consulting"],
    "Drops of Inspiration": ["Keynote", "Panel"],
    "Winedowns": ["Group Setting"],
    "Town Hall": ["Keynote"],
    "Group-Specific": ["Group Setting", "Pairs"],
    "Collaboration": ["Panel", "Workshop"],
    "Idea Starter Pack": ["Training", "Workshop"],
    "Cross-Community": ["Panel", "Group Setting"],
    "Community Quarterlies": ["Group Setting"],
    "Partner Deliverable": ["Training", "1:1 Consulting"],
    "Community Summer": ["Group Setting"],
    "Community": ["Group Setting", "Pairs"],
    "HiveMind": ["Group Setting", "Pairs"],
    "Morning Spark": ["Keynote", "Training"],
}

KAT = {
    "Community Monthlies": {
        "termine": jeden_monat([(2, 1, "18:00")]),                       # 1. Mittwoch
        "kap": 60, "orte": ["Loft – Event Space", "Rooftop Terrace"],
        "tags": (["Community/Gathering", "Guided networking"], ["Informal", "Matchmaking", "Collaboration"]),
        "titel": [("Monthly Meetup: New Year, New Faces", "new faces in the community"),
                  ("Monthly Meetup: Asks & Offers", "asks and offers"),
                  ("Monthly Meetup: Spring Projects", "spring projects"),
                  ("Monthly Meetup: Member Spotlights", "member spotlights"),
                  ("Monthly Meetup: Skills Market", "the skills in our community"),
                  ("Monthly Meetup: Midsummer Edition", "summer plans"),
                  ("Monthly Meetup: Rooftop Edition", "rooftop evenings"),
                  ("Monthly Meetup: Holiday Stories", "holiday stories"),
                  ("Monthly Meetup: Back to Work", "fresh starts after summer"),
                  ("Monthly Meetup: Autumn Goals", "autumn goals"),
                  ("Monthly Meetup: Thank-You Edition", "gratitude"),
                  ("Monthly Meetup: Year in Review", "the year in review")],
        "vorlage": {
            "titelVorlage": "Monthly Meetup: [Theme]",
            "titelIdeen": ["Monthly Meetup: {thema}", "{thema} – Community Evening", "Meet the Hub: {thema}"],
            "summaryVorlage": "Our monthly community evening around {thema} – {merkmale}.",
            "socialText": social("🥂", "Our monthly community evening is coming up!", "CommunityMonthlies"),
            "mailText": mail("Feel free to bring someone who should get to know the community!"),
            "beschreibung": {
                "worum": "Our monthly community evening – this time around {thema}. A short welcome, member news, "
                         "then drinks and conversations that actually go somewhere.",
                "rahmen": "Evening format in the {ort} for around {kapazitaet} guests, drinks & snacks.",
                "haeufigkeit": "Monthly – every 1st Wednesday evening.",
                "warum": "Good collaborations start with a good conversation. Members find partners and friends, "
                         "newcomers find their way into the community.",
                "zielgruppe": "All members, alumni and partners – newcomers especially welcome.",
                "ergebnis": "• 3–5 meaningful new contacts\n• Knowing who can help with what\n• Feeling at home at the Hub",
                "agenda": [[0, "Doors open, welcome drink"], [20, "Welcome & member news"],
                           [40, "Guided networking rounds"], [100, "Open mingling"], [150, "End"]],
                "tickets": "Free for members and guests. Please register via Eventbrite ({kapazitaet} spots).",
                "betreuung": "On site: Host Team (welcome & bar), Membership Team",
            },
        },
    },
    "Community Weeklies": {
        "termine": {m: [(0, n, "09:30") for n in (1, 2, 3, 4)] if m != 8 else [(0, 1, "09:30"), (0, 3, "09:30")]
                    for m in ALLE},                                       # jeden Montag
        "kap": 25, "orte": ["Kitchen & Lounge"],
        "tags": (["Community/Gathering", "Informal"], ["Peer feedback/exchange", "Small groups", "Unwind"]),
        "titel": [("Monday Kick-off: Weekly Goals", "weekly goals"),
                  ("Monday Kick-off: Asks & Offers", "asks and offers"),
                  ("Monday Kick-off: Wins of Last Week", "last week's wins"),
                  ("Monday Kick-off: Coffee & Focus", "focus for the week"),
                  ("Monday Kick-off: Who's New?", "new members"),
                  ("Monday Kick-off: Tool Tip", "a useful tool")],
        "vorlage": {
            "titelVorlage": "Monday Kick-off: [Theme]",
            "titelIdeen": ["Monday Kick-off: {thema}", "Coffee & {thema}", "Start the Week: {thema}"],
            "summaryVorlage": "Weekly coffee kick-off around {thema} – {merkmale}.",
            "socialText": social("☕", "Start your week with the community!", "CommunityWeeklies"),
            "mailText": mail("Coffee is on us – just drop by the kitchen."),
            "beschreibung": {
                "worum": "Our weekly kick-off with coffee – this time with a focus on {thema}. Everyone shares one "
                         "goal for the week and one thing they could use help with.",
                "rahmen": "30 minutes standing round in the {ort}, up to {kapazitaet} people, coffee on the house.",
                "haeufigkeit": "Weekly – every Monday morning.",
                "warum": "A shared ritual makes the Hub feel like a team: people know what others work on and ask "
                         "for help early.",
                "zielgruppe": "Everyone working at the Hub this week – members, residents and the team.",
                "ergebnis": "• A clear goal for the week\n• Quick help from neighbours\n• Knowing who's in the house",
                "agenda": [[0, "Coffee & arrival"], [5, "Round: one goal, one ask"], [25, "Announcements"], [30, "End"]],
                "tickets": "Free, members only, no registration needed (max. {kapazitaet}).",
                "betreuung": "On site: Host Team (coffee & moderation)",
            },
        },
    },
    "Academy": {
        "termine": {m: ([] if m == 8 else [(1, 1, "10:00")] if m == 12 else [(1, 1, "10:00"), (3, 3, "14:00")])
                    for m in ALLE},                                       # 1. Di, 3. Do
        "kap": 20, "orte": ["Loft – Workshop Room", "Salon", "Online (demo Zoom)"],
        "tags": (["Workshop", "Practical exercises"],
                 ["Small groups", "Expert guidance", "Group work", "1:1 sessions", "Coaching/consulting", "Skillshare"]),
        "titel": [("Academy: Your First Circular Business Move", "circular business"),
                  ("Academy: Storytelling for Impact Startups", "storytelling"),
                  ("Academy: Money Literacy for Founders", "money literacy"),
                  ("Academy: Taming Your Inner Critic", "dealing with your inner critic"),
                  ("Academy: Pitch Deck Clinic", "pitch decks"),
                  ("Academy: Design Thinking in 3 Hours", "design thinking"),
                  ("Academy: Social Media on a Small Budget", "social media on a budget"),
                  ("Academy: Measuring Impact Made Simple", "impact measurement"),
                  ("Academy: Finding & Using Funding", "funding"),
                  ("Academy: Pricing for Social Ventures", "pricing"),
                  ("Academy: Freelance Basics", "freelance basics"),
                  ("Academy: Inclusive Communication", "inclusive communication"),
                  ("Academy: Planning a Crowdfunding Campaign", "crowdfunding"),
                  ("Academy: Feedback Culture in Small Teams", "feedback culture"),
                  ("Academy: Access to Finance", "access to finance"),
                  ("Academy: Time Management for Creatives", "time management"),
                  ("Academy: Annual Planning with Impact", "annual planning")],
        "vorlage": {
            "titelVorlage": "Academy: [Topic]",
            "titelIdeen": ["Academy: {thema}", "{thema}: A Hands-on Session", "Learn by Doing: {thema}"],
            "summaryVorlage": "Practical Academy session on {thema} – {merkmale}.",
            "socialText": social("🛠️", "New Academy session at the Hub!", "Academy"),
            "mailText": mail("Please bring a laptop or notebook."),
            "beschreibung": {
                "worum": "A hands-on Academy session on {thema}. Instead of endless slides, we work on real cases "
                         "from the room – you bring your project, we bring the methods.",
                "rahmen": "3-hour session in the {ort}, max. {kapazitaet} participants. Coffee and snacks included.",
                "haeufigkeit": "Twice a month – 1st Tuesday morning and 3rd Thursday afternoon.",
                "warum": "Members get a fast, practical boost on {thema} and meet peers facing the same questions.",
                "zielgruppe": "Founders, freelancers and intrapreneurs in early stages. No prior knowledge needed.",
                "ergebnis": "• A concrete next step for your project\n• Tools and templates on {thema}\n"
                            "• Feedback from peers",
                "agenda": [[0, "Arrival & check-in"], [15, "Input on {thema}"], [45, "Exercises in small teams"],
                           [120, "Share-back & peer feedback"], [160, "Wrap-up: next steps"], [180, "End"]],
                "tickets": "Free for members, €15 for guests. {kapazitaet} spots, registration via Eventbrite.",
                "betreuung": "On site: Host Team · Facilitation: external trainer (demo)",
            },
        },
    },
    "Drops of Inspiration": {
        "termine": jeden_monat([(2, 2, "12:30")], OHNE_AUGUST),          # 2. Mittwoch
        "kap": 40, "orte": ["Salon", "Loft – Event Space"],
        "tags": (["Keynote/panel"], ["Expert guidance", "Informal", "Peer feedback/exchange"]),
        "titel": [("Drops of Inspiration: Leading Beyond Growth", "business beyond growth"),
                  ("Drops of Inspiration: Green Spaces in the City", "urban green spaces"),
                  ("Drops of Inspiration: AI for the Common Good", "AI for the common good"),
                  ("Drops of Inspiration: Democracy & Entrepreneurship", "democracy and entrepreneurship"),
                  ("Drops of Inspiration: Circular Fashion", "circular fashion"),
                  ("Drops of Inspiration: Failing & Starting Over", "failing and starting over"),
                  ("Drops of Inspiration: Energy Communities", "energy communities"),
                  ("Drops of Inspiration: Impact Investing", "impact investing"),
                  ("Drops of Inspiration: Food Transition", "the urban food transition"),
                  ("Drops of Inspiration: Mental Health", "mental health in startup life"),
                  ("Drops of Inspiration: Inclusion as a Business Model", "inclusion")],
        "vorlage": {
            "titelVorlage": "Drops of Inspiration: [Topic]",
            "titelIdeen": ["Drops of Inspiration: {thema}", "{thema} in 20 Minutes", "Rethinking {thema}"],
            "summaryVorlage": "A short lunchtime input on {thema} – {merkmale}.",
            "socialText": social("💧", "A drop of inspiration for your lunch break!", "DropsOfInspiration"),
            "mailText": mail("Bring your lunch and your questions."),
            "beschreibung": {
                "worum": "A short, inspiring input on {thema} over lunch: one speaker, 20 minutes, honest stories – "
                         "then questions from the room.",
                "rahmen": "Lunch talk in the {ort}, seating for {kapazitaet}. Bring your own lunch.",
                "haeufigkeit": "Monthly – 2nd Wednesday at lunchtime (summer break in August).",
                "warum": "We bring fresh perspectives into the community and spark discussion on {thema}.",
                "zielgruppe": "Members and guests curious about {thema} – no expert knowledge needed.",
                "ergebnis": "• A new perspective on {thema}\n• Direct exchange with the speaker\n• Ideas for your own work",
                "agenda": [[0, "Arrival with lunch"], [10, "Input on {thema}"], [30, "Q&A"], [60, "End"]],
                "tickets": "Free, open to everyone. {kapazitaet} seats – please register via Eventbrite.",
                "betreuung": "On site: Host Team (tech) · Speaker: external guest (demo)",
            },
        },
    },
    "Winedowns": {
        "termine": jeden_monat([(3, -1, "18:30")], OHNE_AUGUST),         # letzter Donnerstag
        "kap": 50, "orte": ["Rooftop Terrace", "Kitchen & Lounge"],
        "tags": (["Unwind", "Informal"], ["Community/Gathering", "Guided networking"]),
        "titel": [("Winedown: Winter Reds", "winter reds"), ("Winedown: Natural Wines", "natural wines"),
                  ("Winedown: Spring Whites", "spring whites"), ("Winedown: Local Vineyards", "local vineyards"),
                  ("Winedown: Rosé on the Roof", "rosé"), ("Winedown: Sparkling Edition", "sparkling wines"),
                  ("Winedown: Harvest Edition", "the harvest"), ("Winedown: Orange Wines", "orange wines"),
                  ("Winedown: Alcohol-Free Pairings", "alcohol-free pairings"),
                  ("Winedown: Mulled Wine Edition", "mulled wine")],
        "vorlage": {
            "titelVorlage": "Winedown: [Theme]",
            "titelIdeen": ["Winedown: {thema}", "Wine & Wind Down: {thema}", "{thema} on the Roof"],
            "summaryVorlage": "End-of-month wine evening around {thema} – {merkmale}.",
            "socialText": social("🍷", "Time to wind down with the community!", "Winedowns"),
            "mailText": mail("Alcohol-free options are always there, of course."),
            "beschreibung": {
                "worum": "Our end-of-month Winedown – this time around {thema}. Close the laptop, raise a glass and "
                         "celebrate the month with the community.",
                "rahmen": "Relaxed evening in the {ort} for up to {kapazitaet} guests, wine and alcohol-free drinks.",
                "haeufigkeit": "Monthly – last Thursday evening (summer series replaces it in August).",
                "warum": "Celebrating together builds trust – and that's where new ideas and collaborations start.",
                "zielgruppe": "Members, alumni and their friends.",
                "ergebnis": "• Relaxed conversations beyond work\n• New friends at the Hub\n• A good end to the month",
                "agenda": [[0, "Doors open"], [15, "A few words about {thema}"], [30, "Tasting & mingling"],
                           [150, "End"]],
                "tickets": "€5 for members, €10 for guests (incl. two drinks). {kapazitaet} spots via Eventbrite.",
                "betreuung": "On site: Host Team (bar)",
            },
        },
    },
    "Town Hall": {
        "termine": {m: [(1, 2, "17:00")] for m in (1, 4, 7, 10)},        # 2. Dienstag im Quartal
        "kap": 80, "orte": ["Loft – Event Space"],
        "tags": (["Formal", "Community/Gathering"], ["Peer feedback/exchange", "Group work"]),
        "titel": [("Town Hall: Plans for the Year", "plans for the year"),
                  ("Town Hall: Spring Update", "the spring update"),
                  ("Town Hall: Halfway Check", "the halfway check"),
                  ("Town Hall: Autumn Update & Space Changes", "changes to our spaces")],
        "vorlage": {
            "titelVorlage": "Town Hall: [Topic]",
            "titelIdeen": ["Town Hall: {thema}", "Hub Update: {thema}", "Your Voice: {thema}"],
            "summaryVorlage": "Quarterly Town Hall on {thema} – {merkmale}.",
            "socialText": social("🏛️", "Town Hall – your voice counts!", "TownHall"),
            "mailText": mail("Send us your questions in advance – we'll collect them."),
            "beschreibung": {
                "worum": "Our quarterly Town Hall on {thema}: the team shares numbers, plans and changes – and you "
                         "get to ask questions and give feedback.",
                "rahmen": "Plenary in the {ort}, seating for {kapazitaet}, followed by drinks.",
                "haeufigkeit": "Quarterly – 2nd Tuesday of the first month of each quarter.",
                "warum": "Transparency builds trust. Members understand decisions and help shape the Hub.",
                "zielgruppe": "All members and residents of the Hub.",
                "ergebnis": "• Knowing what's planned and why\n• Your feedback heard\n• Clear next steps",
                "agenda": [[0, "Arrival"], [10, "Update from the team"], [40, "Q&A and feedback"],
                           [80, "Drinks"], [120, "End"]],
                "tickets": "Members only, free. Please register via Eventbrite ({kapazitaet} seats).",
                "betreuung": "On site: whole team · Moderation: Community Lead",
            },
        },
    },
    "Group-Specific": {
        "termine": jeden_monat([(1, 3, "18:00")], OHNE_AUGUST),          # 3. Dienstag
        "kap": 20, "orte": ["Salon", "Loft – Workshop Room"],
        "tags": (["Small groups", "Peer feedback/exchange"], ["Coaching/consulting", "Skillshare", "Formal"]),
        "titel": [("Founders Circle", "founder life"), ("Freelancers Circle", "freelance life"),
                  ("Women in Impact Circle", "women in impact"), ("Creatives Circle", "creative work"),
                  ("Tech for Good Circle", "tech for good"), ("Parents at Work Circle", "parenting and work")],
        "vorlage": {
            "titelVorlage": "[Group] Circle",
            "titelIdeen": ["{thema} Circle", "Peer Circle: {thema}", "Among Peers: {thema}"],
            "summaryVorlage": "Peer circle for one member group around {thema} – {merkmale}.",
            "socialText": social("🫶", "A circle for people like you!", "PeerCircle"),
            "mailText": mail("The circle is confidential – what's said in the room stays in the room."),
            "beschreibung": {
                "worum": "A small peer circle around {thema}: people in the same situation share challenges and "
                         "help each other – honest and confidential.",
                "rahmen": "Small circle in the {ort}, max. {kapazitaet} participants.",
                "haeufigkeit": "Monthly – 3rd Tuesday evening, rotating groups.",
                "warum": "Specific groups have specific questions. Peers are often the best advisors.",
                "zielgruppe": "Members of the specific group (see title).",
                "ergebnis": "• Answers to your current challenge\n• A trusted peer group\n• Less feeling alone",
                "agenda": [[0, "Check-in round"], [15, "Case clinic: two challenges"], [75, "Takeaways"], [90, "End"]],
                "tickets": "Members only, free. {kapazitaet} spots via Eventbrite.",
                "betreuung": "Facilitation: Community Lead or a member host",
            },
        },
    },
    "Collaboration": {
        "termine": {m: [(3, 2, "18:00")] for m in (2, 3, 5, 6, 8, 9, 11, 12)},  # 2. Do, 2x pro Quartal
        "kap": 50, "orte": ["Loft – Event Space", "Partner venue (demo)"],
        "tags": (["Collaboration"], ["Matchmaking", "Group work", "Keynote/panel"]),
        "titel": [("Collab Night with a Climate Network (demo)", "climate action"),
                  ("Collab Night with a Design School (demo)", "design for good"),
                  ("Collab Night with a Food Coop (demo)", "local food"),
                  ("Collab Night with a Neighbourhood Group (demo)", "the neighbourhood"),
                  ("Collab Night with a Tech Meetup (demo)", "open tech"),
                  ("Collab Night with an Arts Collective (demo)", "art and impact")],
        "vorlage": {
            "titelVorlage": "Collab Night with [Partner]",
            "titelIdeen": ["Collab Night: {thema}", "Together for {thema}", "{thema} – Joint Evening"],
            "summaryVorlage": "Joint evening with a partner organisation on {thema} – {merkmale}.",
            "socialText": social("🤝", "Two communities, one evening!", "Collaboration"),
            "mailText": mail("Our partner's community joins too – a great chance to meet new people."),
            "beschreibung": {
                "worum": "A joint evening with a partner organisation on {thema}. Both communities meet, share "
                         "projects and look for ways to work together.",
                "rahmen": "Evening event in the {ort}, around {kapazitaet} guests from both communities.",
                "haeufigkeit": "Twice a quarter – 2nd Thursday.",
                "warum": "Partnerships bring new people, ideas and opportunities into the Hub.",
                "zielgruppe": "Members and the partner's community.",
                "ergebnis": "• New contacts outside your bubble\n• Ideas for joint projects\n• A stronger network",
                "agenda": [[0, "Welcome"], [15, "Short intros from both sides"], [45, "Matchmaking & mingling"],
                           [150, "End"]],
                "tickets": "Free. {kapazitaet} spots via Eventbrite, shared with the partner.",
                "betreuung": "On site: Host Team and partner team (demo)",
            },
        },
    },
    "Idea Starter Pack": {
        "termine": {m: [(1, 4, "17:30")] for m in (3, 4, 5, 9, 10, 11)},  # 4. Dienstag, Frühling & Herbst
        "kap": 15, "orte": ["Loft – Workshop Room", "Salon"],
        "tags": (["Coaching/consulting", "Small groups"], ["Workshop", "1:1 sessions", "Peer feedback/exchange"]),
        "titel": [("Idea Starter Pack 1: From Idea to Problem", "finding the real problem"),
                  ("Idea Starter Pack 2: Talking to Users", "talking to users"),
                  ("Idea Starter Pack 3: First Prototype", "a first prototype")],
        "vorlage": {
            "titelVorlage": "Idea Starter Pack [No.]: [Step]",
            "titelIdeen": ["Idea Starter Pack: {thema}", "From Idea to Action: {thema}", "{thema} – First Steps"],
            "summaryVorlage": "Guided step for early ideas: {thema} – {merkmale}.",
            "socialText": social("💡", "Got an idea? Let's get it started!", "IdeaStarterPack"),
            "mailText": mail("Bring your idea – even if it's only a sentence on a napkin."),
            "beschreibung": {
                "worum": "Part of our three-step programme for early ideas – this step: {thema}. With a coach and a "
                         "small group you take your idea one step further.",
                "rahmen": "Small group in the {ort}, max. {kapazitaet} people, with a coach.",
                "haeufigkeit": "Three sessions in spring and three in autumn – 4th Tuesday evening.",
                "warum": "Many good ideas never start. A clear process and a supportive group help them get going.",
                "zielgruppe": "Members and guests with an early idea for an impact project.",
                "ergebnis": "• A sharper idea\n• A concrete next step\n• Peers who keep you accountable",
                "agenda": [[0, "Check-in"], [10, "Method input: {thema}"], [40, "Work on your idea"],
                           [100, "Feedback round"], [120, "End"]],
                "tickets": "€10 per session, free for members. {kapazitaet} spots via Eventbrite.",
                "betreuung": "Coach: external coach (demo)",
            },
        },
    },
    "Cross-Community": {
        "termine": {m: [(4, 3, "15:00")] for m in (2, 5, 9, 11)},       # 3. Freitag
        "kap": 60, "orte": ["Online (demo Zoom)", "Loft – Event Space"],
        "tags": (["Guided networking", "Collaboration"], ["Matchmaking", "Keynote/panel"]),
        "titel": [("Cross-Hub Exchange: Winter Edition", "exchange between Hubs"),
                  ("Cross-Hub Exchange: Spring Edition", "exchange between Hubs"),
                  ("Cross-Hub Exchange: Autumn Edition", "exchange between Hubs"),
                  ("Cross-Hub Exchange: Year-End Edition", "exchange between Hubs")],
        "vorlage": {
            "titelVorlage": "Cross-Hub Exchange: [Edition]",
            "titelIdeen": ["Cross-Hub Exchange: {thema}", "Hubs Connect: {thema}", "Beyond Our Hub: {thema}"],
            "summaryVorlage": "Exchange with other Hub communities on {thema} – {merkmale}.",
            "socialText": social("🌍", "Meet members from other Hubs!", "CrossCommunity"),
            "mailText": mail("You'll get the online link the day before."),
            "beschreibung": {
                "worum": "Members from several Hub communities meet on {thema}: short intros, matchmaking and "
                         "space for joint projects.",
                "rahmen": "Hybrid format ({ort}), up to {kapazitaet} participants from several Hubs.",
                "haeufigkeit": "Four times a year – 3rd Friday afternoon.",
                "warum": "The global network is one of our biggest assets – we make it tangible for members.",
                "zielgruppe": "Members looking for partners, clients or ideas beyond the city.",
                "ergebnis": "• Contacts in other cities\n• Ideas from other communities\n• Possible joint projects",
                "agenda": [[0, "Welcome"], [10, "Intros from each Hub"], [30, "Breakout matchmaking"],
                           [80, "Wrap-up"], [90, "End"]],
                "tickets": "Free for members. {kapazitaet} spots via Eventbrite.",
                "betreuung": "On site: Host Team · Co-hosts from partner Hubs (demo)",
            },
        },
    },
    "Community Quarterlies": {
        "termine": {m: [(4, -1, "17:00")] for m in (3, 6, 9, 12)},      # letzter Freitag im Quartal
        "kap": 120, "orte": ["Loft – Event Space", "Rooftop Terrace"],
        "tags": (["Community/Gathering", "Keynote/panel"], ["Unwind", "Guided networking"]),
        "titel": [("Quarterly: Spring Celebration", "the first quarter"),
                  ("Quarterly: Summer Party", "the first half of the year"),
                  ("Quarterly: Autumn Harvest Fest", "the third quarter"),
                  ("Quarterly: Year-End Party", "the whole year")],
        "vorlage": {
            "titelVorlage": "Quarterly: [Celebration]",
            "titelIdeen": ["Quarterly: {thema}", "Celebrating {thema}", "The Big Quarterly: {thema}"],
            "summaryVorlage": "Our big quarterly celebration of {thema} – {merkmale}.",
            "socialText": social("🎉", "Our big quarterly celebration is here!", "CommunityQuarterlies"),
            "mailText": mail("Bring friends – the more the merrier."),
            "beschreibung": {
                "worum": "Our big quarterly celebration: we look back at {thema}, celebrate member wins and party "
                         "together.",
                "rahmen": "Big evening event in the {ort} for up to {kapazitaet} guests, food, drinks and music.",
                "haeufigkeit": "Quarterly – last Friday of each quarter.",
                "warum": "Celebrating milestones together makes the community visible and strong.",
                "zielgruppe": "Members, alumni, partners and friends of the Hub.",
                "ergebnis": "• Seeing what the community achieved\n• Meeting people from all corners of the Hub\n"
                            "• A great evening",
                "agenda": [[0, "Doors open"], [30, "Look back & member awards"], [60, "Food, drinks & music"],
                           [240, "End"]],
                "tickets": "Free for members, €10 for guests. {kapazitaet} tickets via Eventbrite.",
                "betreuung": "On site: whole team, Host Team (bar & tech)",
            },
        },
    },
    "Partner Deliverable": {
        "termine": {m: [(4, 2, "10:00")] for m in (2, 5, 9, 11)},       # 2. Freitag, 1x pro Quartal
        "kap": 40, "orte": ["Loft – Event Space", "Partner venue (demo)"],
        "tags": (["Expert guidance", "Formal"], ["Workshop", "Keynote/panel", "Group work"]),
        "titel": [("Partner Session: Sustainable Procurement (demo)", "sustainable procurement"),
                  ("Partner Session: Green Mobility (demo)", "green mobility"),
                  ("Partner Session: Social Innovation Lab (demo)", "social innovation"),
                  ("Partner Session: Digital Inclusion (demo)", "digital inclusion"),
                  ("Partner Session: Circular Construction (demo)", "circular construction")],
        "vorlage": {
            "titelVorlage": "Partner Session: [Topic]",
            "titelIdeen": ["Partner Session: {thema}", "{thema} – in Cooperation with Our Partner",
                           "Impact Lab: {thema}"],
            "summaryVorlage": "Session delivered with a programme partner on {thema} – {merkmale}.",
            "socialText": social("🤝", "In cooperation with our partner:", "Partnership"),
            "mailText": mail("This session is part of a partner programme – please be on time."),
            "beschreibung": {
                "worum": "A session we deliver together with a programme partner on {thema} – with input, "
                         "examples and room for discussion.",
                "rahmen": "Morning session in the {ort}, up to {kapazitaet} participants.",
                "haeufigkeit": "Once a quarter, as agreed with the partner.",
                "warum": "Part of a partner agreement: we bring the community, the partner brings expertise and "
                         "funding.",
                "zielgruppe": "Members and guests working on {thema}, plus the partner's network.",
                "ergebnis": "• Expert knowledge on {thema}\n• Contacts to the partner\n• Fulfilled partner deliverable",
                "agenda": [[0, "Welcome"], [10, "Partner input"], [60, "Group work"], [110, "Wrap-up"], [120, "End"]],
                "tickets": "Free (funded by the partner). {kapazitaet} spots via Eventbrite.",
                "betreuung": "On site: Programme Team · Partner contact: partner team (demo)",
            },
        },
    },
    "Community Summer": {
        "termine": {6: [(3, 3, "18:00")], 7: [(3, 1, "18:00"), (3, 3, "18:00")],
                    8: [(3, 1, "18:00"), (3, 3, "18:00")]},               # Sommer-Donnerstage
        "kap": 70, "orte": ["Rooftop Terrace", "Partner venue (demo)"],
        "tags": (["Unwind", "Community/Gathering"], ["Informal", "Skillshare"]),
        "titel": [("Summer Kick-off on the Rooftop", "the start of summer"),
                  ("Summer Cinema Night", "an open-air film"),
                  ("Summer BBQ", "grilling together"),
                  ("Sunset Walk & Heuriger", "Vienna's vineyards"),
                  ("Summer Closing Party", "the end of summer")],
        "vorlage": {
            "titelVorlage": "Summer [Activity]",
            "titelIdeen": ["Summer Evening: {thema}", "{thema} under the Sky", "Community Summer: {thema}"],
            "summaryVorlage": "Summer evening with the community: {thema} – {merkmale}.",
            "socialText": social("☀️", "Community Summer is on!", "CommunitySummer"),
            "mailText": mail("If it rains, we move inside – we'll let you know."),
            "beschreibung": {
                "worum": "Part of our Community Summer series: {thema} – light, outdoorsy and fun.",
                "rahmen": "Summer evening at the {ort} for up to {kapazitaet} guests.",
                "haeufigkeit": "Summer series – June to August, Thursday evenings.",
                "warum": "Summer is quieter at the Hub – the series keeps the community together.",
                "zielgruppe": "Members, alumni, friends and families.",
                "ergebnis": "• Relaxed summer evenings together\n• New friends\n• Staying connected over summer",
                "agenda": [[0, "Get together"], [30, "Main activity: {thema}"], [180, "End"]],
                "tickets": "Free for members, €5 for guests. {kapazitaet} spots via Eventbrite.",
                "betreuung": "On site: Host Team",
            },
        },
    },
    "Community": {
        "termine": jeden_monat([(2, 4, "12:30")], [m for m in ALLE if m not in (7, 8)]),  # 4. Mittwoch
        "kap": 30, "orte": ["Kitchen & Lounge"],
        "tags": (["Community/Gathering", "Informal"], ["Peer feedback/exchange", "Unwind", "Skillshare"]),
        "titel": [("Community Lunch: New Year Edition", "new year's resolutions"),
                  ("Community Lunch: Soup & Exchange", "soup and stories"),
                  ("Community Lunch: Bring Your Bowl", "favourite recipes"),
                  ("Community Lunch: Spring Kitchen", "spring food"),
                  ("Community Lunch: Members Cook", "members' home cooking"),
                  ("Community Lunch: Rooftop Picnic", "a rooftop picnic"),
                  ("Community Lunch: Harvest Edition", "the harvest season"),
                  ("Community Lunch: Pumpkin Edition", "pumpkin dishes"),
                  ("Community Lunch: Plate Swap", "swapping dishes"),
                  ("Community Lunch: Cookie Edition", "holiday cookies")],
        "vorlage": {
            "titelVorlage": "Community Lunch: [Theme]",
            "titelIdeen": ["Community Lunch: {thema}", "Lunch & Learn: {thema}", "Bring Your Bowl: {thema}"],
            "summaryVorlage": "Members' lunch around {thema} – {merkmale}.",
            "socialText": social("🥗", "Lunch break with the community!", "Community"),
            "mailText": mail("Bring your lunch or a dish to share."),
            "beschreibung": {
                "worum": "One long table, good food and the people you usually only see behind a laptop – this "
                         "time around {thema}.",
                "rahmen": "Informal lunch in the {ort} for up to {kapazitaet} members.",
                "haeufigkeit": "Monthly – 4th Wednesday at lunchtime (not in summer).",
                "warum": "Lunch is where community happens: members get to know each other beyond the desk.",
                "zielgruppe": "All members of the Hub – new members especially welcome.",
                "ergebnis": "• Knowing your coworking neighbours\n• Quick help with a current question\n"
                            "• A real lunch break 🙂",
                "agenda": [[0, "Set the table"], [10, "Quick round: name & project"], [20, "Lunch & conversations"],
                           [60, "Asks & offers"], [75, "End"]],
                "tickets": "Members only, free. Sign-up via Eventbrite ({kapazitaet} seats).",
                "betreuung": "On site: Membership Team (hosting the table)",
            },
        },
    },
    # Eigene Formate (Gruppe Learn), noch ohne Soll im Blueprint und ohne Demo-Termine.
    # Sie stehen als Kategorie zur Auswahl, sobald echte Termine geplant werden.
    "HiveMind": {
        "termine": {},
        "kap": 16, "orte": ["Salon", "Loft – Workshop Room"],
        "tags": (["Peer feedback/exchange", "Small groups"], ["Group work", "Skillshare"]),
        "titel": [("HiveMind: Your Toughest Challenge", "your toughest challenge")],
        "vorlage": {
            "titelVorlage": "HiveMind: [Challenge]",
            "titelIdeen": ["HiveMind: {thema}", "Ask the Hive: {thema}", "Collective Brain: {thema}"],
            "summaryVorlage": "Peer session where the community puts its heads together on {thema} – {merkmale}.",
            "socialText": social("🐝", "Bring a challenge, leave with ideas from the hive!", "HiveMind"),
            "mailText": mail("Think about one question you'd like the group to help you with."),
            "beschreibung": {
                "worum": "A HiveMind session on {thema}: members bring a real challenge and the group works on it "
                         "together – honest questions, ideas and experiences from peers.",
                "rahmen": "Small round in the {ort} for up to {kapazitaet} people, guided by a host.",
                "haeufigkeit": "Regular format – dates are set in the yearly plan.",
                "warum": "The community knows more than any single expert. Sharing challenges builds trust and speed.",
                "zielgruppe": "Members who want peer input on a current question.",
                "ergebnis": "• Fresh perspectives on your challenge\n• Concrete next steps\n• New contacts in the Hub",
                "agenda": [[0, "Welcome & check-in"], [15, "Challenges in the round"], [30, "Group work on the challenges"],
                           [80, "Key takeaways"], [90, "End"]],
                "tickets": "Members only, free. {kapazitaet} spots via Eventbrite.",
                "betreuung": "Hosting: Programme Team",
            },
        },
    },
    "Morning Spark": {
        "termine": {},
        "kap": 30, "orte": ["Kitchen & Lounge", "Loft – Event Space"],
        "tags": (["Expert guidance", "Informal"], ["Keynote/panel", "Skillshare"]),
        "titel": [("Morning Spark: Start Strong", "starting the day strong")],
        "vorlage": {
            "titelVorlage": "Morning Spark: [Topic]",
            "titelIdeen": ["Morning Spark: {thema}", "Coffee & Spark: {thema}", "Rise & Learn: {thema}"],
            "summaryVorlage": "Short morning input on {thema} with coffee – {merkmale}.",
            "socialText": social("☀️", "Start your day with a spark of inspiration!", "MorningSpark"),
            "mailText": mail("Coffee is ready from 08:45 – come a little earlier."),
            "beschreibung": {
                "worum": "A short morning input on {thema} – one idea, explained well, with time for questions.",
                "rahmen": "Breakfast-style session in the {ort} for up to {kapazitaet} people, coffee on the house.",
                "haeufigkeit": "Regular format – dates are set in the yearly plan.",
                "warum": "A good start into the day: new knowledge in a short, easy format.",
                "zielgruppe": "Members and guests curious about {thema}.",
                "ergebnis": "• One clear new idea\n• Answers to your questions\n• An energising start to the day",
                "agenda": [[0, "Coffee & arrival"], [15, "Input"], [40, "Questions"], [60, "End"]],
                "tickets": "Free for members, {kapazitaet} spots via Eventbrite.",
                "betreuung": "Input: guest expert or member",
            },
        },
    },
}
KATEGORIEN = list(KAT)

# ---------------------------------------------------------------- Modell (Soll) = Blueprint
# Blueprint-Monat: gilt für JEDEN Monat (nur Kategorien mit monatlichem Rhythmus).
# Blueprint-Quartal: kommt in JEDEM Quartal zusätzlich zu 3 Blueprint-Monaten dazu
#   (Kategorien mit Quartals-Rhythmus; sie werden nur im Quartal geprüft, nicht im Monat).
# Ausnahmen: einzelne Monate weichen bewusst ab (z. B. Sommerpause) – mit kurzer Notiz.
BASIS_MONAT = {"Community Weeklies": 4, "Community Monthlies": 1, "Academy": 2, "Drops of Inspiration": 1,
               "Winedowns": 1, "Group-Specific": 1, "Community": 1}
BASIS_QUARTAL = {"Town Hall": 1, "Community Quarterlies": 1, "Cross-Community": 1, "Collaboration": 2,
                 "Partner Deliverable": 1}
ISP = {"Idea Starter Pack": 1}
AUSNAHMEN = {
    3: (ISP, "Idea Starter Pack (spring)"), 4: (ISP, "Idea Starter Pack (spring)"),
    5: (ISP, "Idea Starter Pack (spring)"),
    6: ({"Community Summer": 1}, "Community Summer starts"),
    7: ({"Community Summer": 2, "Community": 0}, "Community Summer instead of Community Lunch"),
    8: ({"Community Summer": 2, "Community Weeklies": 2, "Academy": 0, "Drops of Inspiration": 0,
         "Winedowns": 0, "Group-Specific": 0, "Community": 0}, "Summer break – only Community Summer"),
    9: (ISP, "Idea Starter Pack (autumn)"), 10: (ISP, "Idea Starter Pack (autumn)"),
    11: (ISP, "Idea Starter Pack (autumn)"),
    12: ({"Academy": 1}, "Holidays – only one Academy session"),
}
ZIEL_AUSLASTUNG = 75
model = {
    "jahr": JAHR,
    "demoHeute": DEMO_HEUTE.isoformat(),
    "settings": SETTINGS,
    "kategorien": KATEGORIEN,
    "zielAuslastung": ZIEL_AUSLASTUNG,
    "basisMonat": {"soll": BASIS_MONAT},
    "basisQuartal": {"soll": BASIS_QUARTAL},
    "monate": [{"monat": m, "name": MONATE[m - 1],
                "ausnahmen": AUSNAHMEN.get(m, ({}, ""))[0], "notiz": AUSNAHMEN.get(m, ({}, ""))[1]}
               for m in range(1, 13)],
}


def soll_monat(m):
    return {**BASIS_MONAT, **AUSNAHMEN.get(m, ({}, ""))[0]}


def soll_quartal(q):
    summe = dict(BASIS_QUARTAL)
    for m in range(q * 3 - 2, q * 3 + 1):
        for k, n in soll_monat(m).items():
            summe[k] = summe.get(k, 0) + n
    return summe


# Prüfen: Der Demo-Terminplan (KAT[...]["termine"]) muss genau zum Blueprint passen
for m in range(1, 13):
    for k, n in soll_monat(m).items():
        assert len(KAT[k]["termine"].get(m, [])) == n, ("Monat", m, k)
for q in range(1, 5):
    for k in KATEGORIEN:
        plan = sum(len(KAT[k]["termine"].get(m, [])) for m in range(q * 3 - 2, q * 3 + 1))
        assert plan == soll_quartal(q).get(k, 0), ("Quartal", q, k, plan)

# ---------------------------------------------------------------- Vorlagen
# Description-Abschnitte (Schlüssel bleiben deutsch):
#   worum = What is it about? · rahmen = Setting/Framework · haeufigkeit = Frequency
#   warum = Why are we doing this? · zielgruppe = For whom is it? · ergebnis = Outcome for members & goals
#   agenda = What's on the agenda? (Liste aus [Minuten ab Start, Programmpunkt]) · tickets · betreuung
# Platzhalter: {thema}, {ort}, {kapazitaet}, {verantwortlich}
ABSCHNITTE = ["worum", "rahmen", "haeufigkeit", "warum", "zielgruppe", "ergebnis", "agenda", "tickets", "betreuung"]
templates = []
for kat in KATEGORIEN:
    v = KAT[kat]["vorlage"]
    templates.append({
        "kategorie": kat,
        "titelVorlage": v["titelVorlage"],
        "titelIdeen": v["titelIdeen"],
        "summaryVorlage": v["summaryVorlage"],
        "tags": KAT[kat]["tags"][0] + KAT[kat]["tags"][1][:1],
        "socialText": v["socialText"],
        "mailText": v["mailText"],
        "beschreibung": {k: v["beschreibung"][k] for k in ABSCHNITTE},
    })
VORLAGE = {t["kategorie"]: t for t in templates}


def merkmale(tags, kat=""):
    """['small group', 'expert input', 'coaching'] -> 'small group, expert input & coaching'
    (ein Tag, der genauso heißt wie die Kategorie, wird weggelassen – sonst doppelt)"""
    w = [TAG_INFO[t]["kurz"] for t in tags if t in TAG_INFO and t != kat][:3]
    if len(w) <= 1:
        return "".join(w) or "open to everyone"
    return ", ".join(w[:-1]) + " & " + w[-1]


def uhrzeit_plus(start, minuten):
    h, m = map(int, start.split(":"))
    gesamt = h * 60 + m + minuten
    return f"{gesamt // 60:02d}:{gesamt % 60:02d}"


def beschreibung_fuer(kat, thema, tags, startzeit, ort, kap, verantwortlich):
    """Baut die strukturierte Description (dict mit allen Abschnitten)."""
    v = VORLAGE[kat]["beschreibung"]

    def fuelle(text):
        return (text.replace("{thema}", thema).replace("{ort}", ort).replace("{kapazitaet}", str(kap))
                .replace("{verantwortlich}", verantwortlich))

    b = {k: fuelle(v[k]) for k in ABSCHNITTE if k != "agenda"}
    saetze = " ".join(TAG_INFO[t]["satz"] for t in tags if t in TAG_INFO)
    if saetze:
        b["rahmen"] += " " + saetze
    b["agenda"] = "\n".join(f"{uhrzeit_plus(startzeit, minuten)} – {fuelle(punkt)}" for minuten, punkt in v["agenda"])
    return {k: b[k] for k in ABSCHNITTE}


def summary_fuer(kat, thema, tags):
    return VORLAGE[kat]["summaryVorlage"].replace("{thema}", thema).replace("{merkmale}", merkmale(tags, kat))


# ---------------------------------------------------------------- Ist-Planung
# Welche Termine es WIRKLICH gibt (mit Abweichungen)
ist = {m: {k: list(KAT[k]["termine"].get(m, [])) for k in KATEGORIEN} for m in range(1, 13)}
ist[5]["Drops of Inspiration"].append((2, 3, "12:30"))   # Mai: ein Termin zu viel
ist[11]["Academy"] = []                                   # November: Academy fällt aus


def nter_wochentag(m, wochentag, n):
    """n-ter Wochentag im Monat (0=Mo ... 6=So). n=-1 heißt: der letzte."""
    tage = [d for d in range(1, calendar.monthrange(JAHR, m)[1] + 1)
            if date(JAHR, m, d).weekday() == wochentag]
    return date(JAHR, m, tage[n - 1] if n > 0 else tage[n])


TEAM = ["Community Lead", "Programme Team", "Host Team",
        "Membership Team", "Events Intern"]

# Feste Aufgabenliste für jedes Event (Reihenfolge = Anzeige, gleiche Liste wie STANDARD_AUFGABEN in app.js).
# True/False = erledigt ja/nein, None = Zufall. Je Status gleich viele None wie früher,
# damit der feste Zufall (und damit alle anderen Demo-Daten) gleich bleibt.
AUFGABEN_TEXTE = ["Room booked (Huble)", "Eventbrite page live",
                  "Event shared with members (weekly email)", "Reminder sent (email)",
                  "Event shared on Social Media", "Shared on WhatsApp", "KPIs collected"]
AUFGABEN = {
    "Idea": [False, False, False, False, False, False, False],
    "Planned": [True, False, False, False, False, False, False],
    # "Reminder sent" wird unten nach Datum gesetzt (2 Tage vorher)
    "Published": [True, True, None, False, None, False, False],
    "Done": [True, True, True, True, None, None, None],
}
# Im Dezember sind diese Kategorien noch reine Ideen
IDEEN_IM_DEZEMBER = ("Community Quarterlies", "Drops of Inspiration", "Collaboration")

WENIG_ANMELDUNGEN = {(6, "Winedowns"): 0.36, (9, "Drops of Inspiration"): 0.42,
                     (10, "Group-Specific"): 0.30}
events = []
titel_index = {k: 0 for k in KATEGORIEN}
for m in range(1, 13):
    for kat in KATEGORIEN:
        for wochentag, n, zeit in ist[m][kat]:
            tag = nter_wochentag(m, wochentag, n)
            tage_bis = (tag - DEMO_HEUTE).days

            # Status hängt vom Datum relativ zu "heute" ab
            if tage_bis < 0:
                status = "Done"
            elif tage_bis <= 30:
                status = "Published"
            elif tag.month == 12 and kat in IDEEN_IM_DEZEMBER:
                status = "Idea"
            else:
                status = "Planned"

            kap = KAT[kat]["kap"]
            if status == "Done":
                if m <= 3:   # Q1: überbucht (Warteliste wurde reingelassen)
                    quote = random.uniform(1.08, 1.32)
                else:
                    quote = random.uniform(0.64, 0.88)
            elif status == "Published":
                quote = max(0.15, 0.85 - tage_bis * 0.025) * random.uniform(0.8, 1.1)
            else:
                quote = 0
            # Absichtlich schwache Events (Warnung "zu wenige Anmeldungen", unter 50 %)
            if (m, kat) in WENIG_ANMELDUNGEN:
                quote = WENIG_ANMELDUNGEN[(m, kat)]
            anmeldungen = round(kap * quote)

            titel_liste = KAT[kat]["titel"]
            titel, thema = titel_liste[titel_index[kat] % len(titel_liste)]
            setting = SETTING_JE_KAT[kat][titel_index[kat] % len(SETTING_JE_KAT[kat])]
            titel_index[kat] += 1

            immer, manchmal = KAT[kat]["tags"]
            tags = immer + random.sample(manchmal, random.randint(1, min(2, len(manchmal))))

            aufgaben = []
            for text, erledigt in zip(AUFGABEN_TEXTE, AUFGABEN[status]):
                if erledigt is None:
                    erledigt = random.random() < (0.85 if status == "Done" else 0.5)
                if status == "Published" and text == "Reminder sent (email)":
                    erledigt = tage_bis < 2
                aufgaben.append({"text": text, "erledigt": erledigt})

            ort = random.choice(KAT[kat]["orte"])
            nr = len(events) + 1
            events.append({
                "id": f"evt-{nr:03d}",
                "titel": titel,
                "datum": tag.isoformat(),
                "startzeit": zeit,
                "kategorie": kat,
                "status": status,
                "ort": ort,
                "kapazität": kap,
                "anmeldungen": anmeldungen,
                "verantwortlich": random.choice(TEAM),
                "eventbriteId": f"EB-DEMO-{1000 + nr}" if status in ("Published", "Done") else "",
                "kalenderId": f"CAL-DEMO-{2000 + nr}" if status != "Idea" else "",
                "tags": tags,
                "setting": setting,
                "zusammenfassung": summary_fuer(kat, thema, tags),
                "beschreibung": None,  # wird unten gesetzt (braucht den Ort)
                "aufgaben": aufgaben,
                "_thema": thema,
            })

for e in events:
    e["beschreibung"] = beschreibung_fuer(e["kategorie"], e.pop("_thema"), e["tags"], e["startzeit"], e["ort"],
                                          e["kapazität"], e["verantwortlich"])

events.sort(key=lambda e: (e["datum"], e["startzeit"]))

# Absichtlich fehlende Infos, damit man sieht, wie die Warnungen aussehen:
LEER = {k: "" for k in ABSCHNITTE}
for e in events:
    monat, kat = int(e["datum"][5:7]), e["kategorie"]
    if e["status"] == "Idea":                           # Ideen haben noch gar keine Description
        e["beschreibung"] = dict(LEER)
    elif monat == 2 and kat == "Academy" and e["datum"] <= "2026-02-07":   # altes Event, nie ausgefüllt
        e["beschreibung"] = dict(LEER)
    elif monat == 10 and kat == "Community":            # bald! Zielgruppe, Ergebnis und Agenda fehlen
        for k in ("zielgruppe", "ergebnis", "agenda"):
            e["beschreibung"][k] = ""
    elif monat == 11 and kat == "Group-Specific":       # Warum, Tickets und Betreuung fehlen
        for k in ("warum", "tickets", "betreuung"):
            e["beschreibung"][k] = ""


def schreibe(name, daten):
    (DATA / name).write_text(json.dumps(daten, ensure_ascii=False, indent=2) + "\n",
                             encoding="utf-8")


schreibe("events.json", events)
schreibe("templates.json", templates)
schreibe("model.json", model)
schreibe("tags.json", TAGS)
print(f"{len(events)} Events, {len(templates)} Vorlagen, {len(TAGS)} Tags, Modell für {JAHR} geschrieben.")
