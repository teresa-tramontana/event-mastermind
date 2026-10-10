"""
Baut die Dateien für die Google-Apps-Script-Version in den Ordner apps-script/.

Warum? Apps Script kann keine einzelnen Dateien (style.css, app.js …) nachladen.
Darum packt dieses Skript ALLES in eine einzige Datei: apps-script/Index.html
(Aussehen, Demo-Daten, Datenschicht und Oberfläche).

WICHTIG: Nach jeder Änderung an index.html, style.css, app.js, data-layer.js
oder data/*.json dieses Skript ausführen (nach baue-demo-daten.py):
    python3 tools/baue-apps-script.py
Anleitung zum Hochladen: ANLEITUNG-APPS-SCRIPT.md
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
    # Merker für data-layer.js: wir laufen in Apps Script (keine JSON-Dateien abrufbar)
    '<script src="data/demo-daten.js"></script>': "<script>window.APPS_SCRIPT = true;</script>\n"
    + als_skript("data/demo-daten.js"),
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
