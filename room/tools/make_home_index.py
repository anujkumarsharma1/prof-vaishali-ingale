#!/usr/bin/env python3
"""Make the site's front pages (run from the repo root):

  index.html          <- world/index.html   the 3D world, served at the site root
  classic/index.html  <- room/index.html    the previous office homepage, served at /classic/

world/index.html is written for /world/ (main-site pages one level up). At the root the
main-site links lose their "../" and the world's own files gain a "world/" prefix. The JS
loads its assets via import.meta.url, so it works from either place.
room/index.html is written for /room/; /classic/ is also one level deep, so only the
room's own files need a "../room/" prefix.

Usage: python3 room/tools/make_home_index.py
"""
import pathlib, re, sys

here = pathlib.Path(__file__).resolve().parent.parent.parent

def gen(src, out, rules, banner):
    s = (here / src).read_text(encoding='utf-8')
    for pat, rep in rules:
        s2, n = re.subn(pat, rep, s)
        if not n:
            sys.exit(f'{src}: pattern not found: {pat}')
        s = s2
    s = s.replace('<html lang="en"', f'<!-- Generated from {src} by room/tools/make_home_index.py. Edit that file, then re-run. -->\n<html lang="en"', 1)
    (here / out).parent.mkdir(parents=True, exist_ok=True)
    (here / out).write_text(s, encoding='utf-8')
    print('wrote', out)
    return s

root = gen('world/index.html', 'index.html', [
    (r'data-site-base="[^"]*"', 'data-site-base="./"'),
    (r'(href|src)="(css|js|assets)/', r'\1="world/\2/'),   # the world's own files
    (r'(href|src)="\.\./', r'\1="'),                         # main-site files and pages
    (r'"three": "\.\./', '"three": "'),                       # importmap
], 'world')
# share-card / app-icon head lines the previous root homepage had (absolute URLs)
HEAD_EXTRA = '''<!-- Launch kit head lines (added by make_home_index.py) -->
<meta property="og:site_name" content="Prof. Vaishali S. Ingale">
<meta property="og:type" content="website">
<meta property="og:title" content="Prof. Vaishali S. Ingale">
<meta property="og:url" content="https://anujkumarsharma1.github.io/prof-vaishali-ingale/">
<meta property="og:description" content="Prof. Vaishali S. Ingale is an Assistant Professor in the Department of Information Technology at the Army Institute of Technology (AIT), Pune, where she has taught since 2005.">
<meta property="og:image" content="https://anujkumarsharma1.github.io/prof-vaishali-ingale/assets/img/og-image.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Prof. Vaishali S. Ingale, Information Technology, AIT Pune">
<meta property="og:locale" content="en">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Prof. Vaishali S. Ingale">
<meta name="twitter:description" content="Prof. Vaishali S. Ingale is an Assistant Professor in the Department of Information Technology at the Army Institute of Technology (AIT), Pune, where she has taught since 2005.">
<meta name="twitter:image" content="https://anujkumarsharma1.github.io/prof-vaishali-ingale/assets/img/og-image.jpg">
<meta name="twitter:image:alt" content="Prof. Vaishali S. Ingale, Information Technology, AIT Pune">
<link rel="manifest" href="assets/img/site.webmanifest">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">'''
root = root.replace('<link rel="canonical"', HEAD_EXTRA + '\n<link rel="canonical"', 1)
(here / 'index.html').write_text(root, encoding='utf-8')
if '../' in root:
    sys.exit('index.html: a ../ path is left')

gen('room/index.html', 'classic/index.html', [
    (r'data-room-base="[^"]*"', 'data-room-base="../room/"'),
    (r'(href|src)="(css|js|fonts|vendor|assets)/', r'\1="../room/\2/'),
    (r'<title>[^<]*</title>', '<title>Classic site · Prof. Vaishali S. Ingale</title>'),
    (r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="https://anujkumarsharma1.github.io/prof-vaishali-ingale/classic/">'),
], 'room')
