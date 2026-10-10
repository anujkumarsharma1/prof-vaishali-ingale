#!/usr/bin/env python3
"""Agent watchdog: run from the repo root while agents work.

1. Ownership: every uncommitted change must belong to the agent that owns the file (OWNERS below).
2. Invented facts: any number that appears in an agent's added lines but nowhere in the baseline
   commit's content files is flagged (a likely hallucinated figure). CSS/JS are skipped (numbers there are styling).
3. Size: diff size per agent, so runaway rewrites stand out.
Usage: python3 tools/portfolio/watch.py [baseline-ref]   (default: the plan commit's parent, main)
"""
import re, subprocess, sys
from collections import defaultdict

BASE = sys.argv[1] if len(sys.argv) > 1 else "main"
OWNERS = {
    "editor": ["_pages/cv.md", "_pages/news.md", "_pages/wishes.md", "_pages/404.md", "_news/", "_data/cv.yml",
               "_data/timeline.yml", "_data/stats.yml", "_data/pub_topics.yml", "_config.yml"],
    "chrome": ["_includes/header.liquid", "assets/custom/site.scss", "assets/custom/motion.css", "assets/custom/chrome.css",
               "assets/js/chrome.js", "_layouts/bib.liquid", "assets/js/pubs.js", "assets/custom/pubs.css", "_pages/publications.md"],
    "home": ["_layouts/about.liquid", "_pages/about.md", "assets/custom/home.css", "assets/js/home.js"],
    "sections": ["_pages/leadership.md", "_pages/awards.md", "_includes/milestones.liquid", "assets/custom/sections.css",
                 "assets/js/sections.js"],
    "lead": ["plan.md", "tools/", "_includes/head.liquid", ".agents/skills/", ".claude/"],
}
CONTENT = re.compile(r"\.(md|yml|liquid|bib|html)$")
NUM = re.compile(r"(?<![\w#.-])\d[\d,]*(?:\.\d+)?\+?(?![\w%])")

def sh(*a):
    return subprocess.run(a, capture_output=True, text=True).stdout

def owner(path):
    for who, prefixes in OWNERS.items():
        if any(path == p or (p.endswith("/") and path.startswith(p)) for p in prefixes):
            return who
    return None

changed = [l[3:] for l in sh("git", "status", "--porcelain").splitlines()]
changed += sh("git", "diff", "--name-only", f"{BASE}...HEAD").split()
changed = sorted(set(c.strip() for c in changed if c.strip()))

base_text = ""
for f in sh("git", "ls-tree", "-r", "--name-only", BASE).split():
    if CONTENT.search(f) and not f.startswith(("docs/", "room/")):
        base_text += sh("git", "show", f"{BASE}:{f}")
base_nums = set(n.rstrip("+").replace(",", "") for n in NUM.findall(base_text))

sizes, flags = defaultdict(int), []
for f in changed:
    who = owner(f)
    if who is None:
        flags.append(f"UNOWNED FILE CHANGED: {f}")
    diff = sh("git", "diff", BASE, "--", f) or ""
    if not diff and subprocess.run(["git", "ls-files", "--error-unmatch", f], capture_output=True).returncode:
        diff = "".join("+" + l for l in open(f, encoding="utf-8", errors="replace"))  # untracked file
    added = [l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    sizes[who or "?"] += len(added)
    if CONTENT.search(f) and who != "lead":
        for line in added:
            if re.search(r"^\s*(#|<!--|\{%-?\s*comment|//)", line) or re.search(r"[;{}]\s*$|\)\s*[;,]?\s*$", line):
                continue
            text = re.sub(r"<[^>]+>|\{[{%].*?[%}]\}|(class|style|id|href|src|width|height|viewBox|d|data-[\w-]+)=\"[^\"]*\"", " ", line)
            for n in NUM.findall(text):
                if n.rstrip("+").replace(",", "") not in base_nums:
                    flags.append(f"NEW NUMBER {n!r} in {f} ({who}): {line.strip()[:110]}")

print("Added lines by agent:", dict(sizes))
print("\n".join(flags) if flags else "No ownership breaches, no numbers absent from the baseline.")
