"""
Baut die Dateien für die Google-Apps-Script-Version in den Ordner apps-script/.

Warum? Apps Script kann keine einzelnen Dateien (style.css, app.js …) nachladen.
Darum packt dieses Skript ALLES in eine einzige Datei: apps-script/Index.html
(Aussehen, Demo-Daten, Datenschicht und Oberfläche).

Normalerweise erledigt das GitHub automatisch bei jedem Push auf main
(.github/workflows/apps-script.yml). Die Datei Index.html wird darum NICHT im
Repo gespeichert. Zum lokalen Ausprobieren:
    python3 tools/baue-apps-script.py
Mehr dazu: VEROEFFENTLICHUNG.md
"""
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
ZIEL = WURZEL / "apps-script"


def lies(name):
    return (WURZEL / name).read_text(encoding="utf-8")


def als_skript(name):
    # "</script" im Code würde den Skript-Block zu früh beenden, darum entschärfen
    code = lies(name).replace("</script", "<\\/script")
    return "<script>\n/* ---- " + name + " ---- */\n" + code + "\n</script>"


html = lies("index.html")
ersetzungen = {
    '<link rel="stylesheet" href="style.css">': "<style>\n" + lies("style.css") + "\n</style>",
    '<script src="data/demo-daten.js"></script>': als_skript("data/demo-daten.js"),
    '<script src="data-layer.js"></script>': als_skript("data-layer.js"),
    '<script src="app.js"></script>': als_skript("app.js"),
}
for alt, neu in ersetzungen.items():
    if alt not in html:
        raise SystemExit("Nicht gefunden in index.html: " + alt)
    html = html.replace(alt, neu)

kopf = (
    "<!-- AUTOMATISCH ERZEUGT von tools/baue-apps-script.py – bitte nicht von Hand ändern. -->\n"
)
ZIEL.mkdir(exist_ok=True)
(ZIEL / "Index.html").write_text(kopf + html, encoding="utf-8")
print("apps-script/Index.html aktualisiert.")
