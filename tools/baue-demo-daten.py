"""
Kopiert data/events.json, data/templates.json und data/model.json
in EINE Datei: data/demo-daten.js

Warum? Öffnet man index.html per Doppelklick (ohne Webserver), darf der
Browser aus Sicherheitsgründen keine .json-Dateien nachladen. Eine .js-Datei
darf er aber laden. Deshalb gibt es diese Kopie.

WICHTIG: Nach jeder Änderung an einer data/*.json-Datei dieses Skript ausführen:
    python3 tools/baue-demo-daten.py
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"


def lade(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


paket = {
    "events": lade("events.json"),
    "templates": lade("templates.json"),
    "model": lade("model.json"),
}
inhalt = (
    "// AUTOMATISCH ERZEUGT aus data/*.json – bitte nicht von Hand ändern.\n"
    "// Neu bauen mit: python3 tools/baue-demo-daten.py\n"
    "window.DEMO_DATEN = " + json.dumps(paket, ensure_ascii=False, indent=1) + ";\n"
)
(DATA / "demo-daten.js").write_text(inhalt, encoding="utf-8")
print("data/demo-daten.js aktualisiert.")
