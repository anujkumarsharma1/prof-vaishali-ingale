#!/usr/bin/env python3
"""Make root-index.html: the office as the site's front page.

room/index.html is written for /room/ (main-site pages one level up). The site root needs
the same page with two bases flipped and the static asset paths pointing into room/:
  data-site-base="./"   main-site pages live next to it (./about/, ./publications/ ...)
  data-room-base="room/" scripts, fonts, models and the portrait stay in /room/

Usage: python3 tools/make_root_index.py [--src index.html] [--out root-index.html]
Copy the output to the repository root as index.html (and move the bio page to /about/).
"""
import argparse, pathlib, re, sys

ap = argparse.ArgumentParser()
ap.add_argument('--src', default='index.html')
ap.add_argument('--out', default='root-index.html')
ap.add_argument('--title', default='Prof. Vaishali S. Ingale · Information Technology, AIT Pune')
a = ap.parse_args()
here = pathlib.Path(__file__).resolve().parent.parent
s = (here / a.src).read_text(encoding='utf-8')

def sub(pat, rep, count=0):
    global s
    s2, n = re.subn(pat, rep, s, count=count)
    if not n:
        sys.exit('pattern not found: ' + pat)
    s = s2

sub(r'data-site-base="[^"]*"', 'data-site-base="./"')
sub(r'data-room-base="[^"]*"', 'data-room-base="room/"')
sub(r'<title>[^<]*</title>', '<title>' + a.title + '</title>')
# this folder's own files first: "css/x" -> "room/css/x"
sub(r'(href|src)="(css|js|fonts|vendor|assets)/', r'\1="room/\2/')
# then main-site links: "../x" -> "x"
sub(r'(href|src)="\.\./', r'\1="')
if '../' in s:
    sys.exit('a ../ path is left in the output')
s = s.replace('<html lang="en"', '<!-- Generated from room/index.html by room/tools/make_root_index.py. Edit that file, then re-run. -->\n<html lang="en"', 1)
(here / a.out).write_text(s, encoding='utf-8')
print('wrote', a.out)
