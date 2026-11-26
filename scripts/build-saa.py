"""Erzeugt lib/saa-toc.json und lib/saa-pages.json aus docs/SAA_BPR_Rettungsdienst_2025.txt (Inhaltsverzeichnis + Text je Seite)."""
import json, re, sys
src = sys.argv[1] if len(sys.argv) > 1 else "docs/SAA_BPR_Rettungsdienst_2025.txt"
lines = open(src, encoding="utf-8").read().split("\n")
mark = re.compile(r"^(?:SAA und BPR 2025 (\d+)|(\d+) SAA und BPR 2025)\s*$")
junk = re.compile(r"[!\"#$%&()*+,;<=>?@\\^`{|}~]{3,}|^[A-Za-z!\"#&()*+,.;<=>@\d]{40,}$|ÄLRD in Baden-Württemberg|^Stand: \d|^Behandlungspfad Rettungsdienst \(BPR\)$|^Standard-?[Aa]rbeitsanweisung")
pages, cur = {}, None
for l in lines:
    m = mark.match(l)
    if m:
        cur = int(m.group(1) or m.group(2)); pages.setdefault(cur, []); continue
    if cur is None or junk.search(l) or not l.strip():
        continue
    pages[cur].append(re.sub(r"\s+", " ", l).strip())
# Inhaltsverzeichnis (Seiten 4 bis 7)
toc, group, kind = [], "", ""
for p in range(4, 8):
    for l in pages.get(p, []):
        if l.startswith("STANDARDARBEITSANWEISUNGEN (SAA)"):
            kind, group = "SAA", l.split(")")[-1].strip(); continue
        if l.startswith("BEHANDLUNGSPFADE RETTUNGSDIENST"):
            kind = "BPR"; continue
        m = re.match(r"^•?\s*(.+?)\s+(\d{1,3})$", l)
        if m and kind:
            toc.append({"title": m.group(1).replace("<c>", "<c>").strip(), "kind": kind, "group": group, "page": int(m.group(2))})
        elif kind == "BPR" and not l.startswith("•"):
            group = l.strip()
body = {str(k): "\n".join(v) for k, v in sorted(pages.items()) if k >= 8}
# Klein (auch im Browser nutzbar): Verzeichnis. Groß (nur Server): Text je Seite.
json.dump(toc, open("lib/saa-toc.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
json.dump(body, open("lib/saa-pages.json", "w", encoding="utf-8"), ensure_ascii=False)
print(len(toc), "Einträge,", len(body), "Seiten,", len(json.dumps(body, ensure_ascii=False)) // 1024, "KB")
