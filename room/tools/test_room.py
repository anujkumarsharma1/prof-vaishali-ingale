"""End-to-end checks for the office entry. Needs a local server that mirrors GitHub Pages:
   <root>/prof-vaishali-ingale/            root-index.html (the office as the front door)
   <root>/prof-vaishali-ingale/about/ ...  the built main site
   <root>/prof-vaishali-ingale/room/       this folder
Usage: python3 tools/test_room.py http://127.0.0.1:43311/prof-vaishali-ingale/room/
"""
import asyncio, json, sys, time, pathlib
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:43117/prof-vaishali-ingale/room/"
import os
SHOTS = pathlib.Path(os.environ.get("SHOTS_DIR") or pathlib.Path(__file__).resolve().parent.parent / "shots")
SHOTS.mkdir(exist_ok=True)
GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
NOGL = ['--disable-webgl', '--disable-3d-apis']
FOLDERS = ['about', 'research', 'publications', 'leadership', 'awards', 'teaching', 'cv', 'contact']
SITE_ROOT = BASE.rsplit('room/', 1)[0]   # the site root (front door); BASE is the /room/ copy
ROOT = SITE_ROOT
LINKS = {'about': 'about/', 'research': 'about/#research', 'publications': 'publications/', 'leadership': 'leadership/',
         'awards': 'awards/', 'teaching': 'about/#teaching', 'cv': 'cv/'}
all_links = set()
TIMINGS = {}
results, errors = [], []

def check(name, ok, detail=''):
    results.append({'check': name, 'ok': bool(ok), 'detail': str(detail)})
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))

async def page_for(b, w, h, mobile=False, reduced=False, label=''):
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1,
                              is_mobile=mobile, has_touch=mobile, reduced_motion='reduce' if reduced else 'no-preference')
    pg = await ctx.new_page()
    pg.set_default_timeout(150000)
    pg.on('console', lambda m: errors.append(f'[{label}] console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errors.append(f'[{label}] pageerror: {e}'))
    pg.on('requestfailed', lambda r: errors.append(f'[{label}] requestfailed: {r.url}'))
    pg.on('response', lambda r: errors.append(f'[{label}] HTTP {r.status}: {r.url}') if r.status >= 400 else None)
    return ctx, pg

async def state(pg, s, timeout=300000):
    await pg.wait_for_function(f"window.__room && window.__room.state === '{s}'", timeout=timeout)

async def room(pg):
    return await pg.evaluate("[__room.mode, __room.state, __room.reason]")

async def folders_cycle(pg, tag, shots=()):
    site = SITE_ROOT
    for fid in FOLDERS:
        await pg.click(f'.folder[data-id="{fid}"]')
        await pg.wait_for_selector('.win:not([hidden])')
        await asyncio.sleep(0.6)
        title = await pg.text_content('.win-title span')
        focus_in = await pg.evaluate("document.querySelector('.win').contains(document.activeElement)")
        head = await pg.evaluate("(document.querySelector('.w-h a')||{}).href || null")
        check(f'{tag}: folder {fid} opens', title and focus_in and await pg.evaluate("location.hash") == '#' + fid, f'title={title} heading={head}')
        if fid != 'contact':
            want = site + LINKS[fid]
            check(f'{tag}: {fid} heading links to its full page', head == want, f'{head} want {want}')
        links = await pg.evaluate("[...document.querySelectorAll('.win a[href]')].map(a => a.href)")
        for u in links:
            if u.startswith(site):
                all_links.add(u.split('#')[0])
        if fid in shots:
            await pg.screenshot(path=str(SHOTS / f'{tag}_win_{fid}.png'))
        if fid == 'publications':
            n = await pg.evaluate("[document.querySelectorAll('.w-pubs li').length, document.querySelectorAll('.w-pubs li a.w-ptitle').length]")
            check(f'{tag}: publications lists all 18 papers, 15 titles are links', n == [18, 15], n)
            bad = await pg.evaluate("""[...document.querySelectorAll('.w-pubs a.w-ptitle')].filter(a =>
                !a.href.startsWith('https://') || a.target !== '_blank' || a.rel !== 'noopener').map(a => a.href)""")
            first = await pg.evaluate("document.querySelector('.w-pubs a.w-ptitle').href")
            ndoi = await pg.evaluate("[...document.querySelectorAll('.w-pubs a.w-ptitle')].filter(a => a.href.startsWith('https://doi.org/')).length")
            check(f'{tag}: paper titles open DOI/arXiv/publisher links in a new tab (rel=noopener)', not bad and first.startswith('https://doi.org/'), f'{ndoi} DOI links; first={first}; bad={bad}')
        if fid == 'research':
            await pg.go_back()
            await asyncio.sleep(0.5)
            closed = await pg.evaluate("document.querySelector('.win').hidden")
            check(f'{tag}: browser back closes window', closed)
            continue
        await pg.keyboard.press('Escape')
        await asyncio.sleep(0.5)
        closed = await pg.evaluate("document.querySelector('.win').hidden")
        refocus = await pg.evaluate(f"document.activeElement && document.activeElement.dataset.id === '{fid}'")
        check(f'{tag}: Esc closes {fid}, focus returns to folder', closed and refocus)

async def desktop_3d(b):
    """The front door: site root, full intro, desk, folders, stand up, roam, sit."""
    ctx, pg = await page_for(b, 1440, 900, label='desktop-3d')
    t0 = time.time()
    await pg.goto(ROOT + '?3d=1')
    await pg.wait_for_selector('#skip', state='visible')
    sk = await pg.evaluate("[document.getElementById('skip').textContent.trim(), document.getElementById('skip').href]")
    check('desktop: "Skip to pages" visible from the start, links to ./about/', sk[0].startswith('Skip to pages') and sk[1] == SITE_ROOT + 'about/', sk)
    await state(pg, 'game')
    await asyncio.sleep(0.4)
    vis = await pg.is_visible('#skip-intro')
    check('desktop: small "Skip intro" button visible during the intro game', vis)
    await pg.screenshot(path=str(SHOTS / 'g01_title.png'))
    await pg.wait_for_function("!__room.game || __room.game.phase === 'play'")
    await asyncio.sleep(0.3)
    await pg.screenshot(path=str(SHOTS / 'g02_play.png'))
    await pg.wait_for_function("!__room.game || __room.game.step >= 3")
    await asyncio.sleep(0.4)
    await pg.screenshot(path=str(SHOTS / 'g03_step_label.png'))
    await state(pg, 'intro')
    await asyncio.sleep(0.3)
    await pg.screenshot(path=str(SHOTS / 'g04_walkin.png'))
    await state(pg, 'desktop')
    tm = await pg.evaluate('__room.timing')
    TIMINGS['desktop idle'] = tm
    check('idle desktop: no input reaches the desk, total <= 22 s', 0 < tm['total'] <= 22 and tm['walk'] <= 8, f"game {tm['game']:.2f} + fade {tm['fade']} + walk-in {tm['walk']:.2f} = {tm['total']:.2f} s (GSAP clock); {time.time() - t0:.1f}s wall on software WebGL")
    await asyncio.sleep(1.5)
    await pg.screenshot(path=str(SHOTS / 'd01_desktop_after_intro.png'))
    st = await pg.evaluate("[document.getElementById('os').classList.contains('is-full'), getComputedStyle(document.querySelector('.os-office')).display, document.querySelector('.os-office').textContent.trim()]")
    check('desktop: desktop fills the view with a "Stand up" control', st[0] and st[1] != 'none' and 'Stand up' in st[2], st)
    r0 = await pg.evaluate('__room.renders'); await asyncio.sleep(2); r1 = await pg.evaluate('__room.renders')
    check('desktop: 3D rendering paused while the desktop covers it', r1 == r0, f'{r0}->{r1}')
    await folders_cycle(pg, 'd', shots=('about', 'publications', 'leadership', 'research'))
    # stand up and roam
    await pg.click('.os-office')
    await state(pg, 'room')
    check('desktop: Stand up returns to the room', True)
    await asyncio.sleep(2.5)
    await pg.screenshot(path=str(SHOTS / 'd02_room_standing.png'))
    await pg.mouse.move(700, 450); await pg.mouse.down(); await pg.mouse.move(560, 430, steps=6); await pg.mouse.up()
    await asyncio.sleep(2.0)
    check('desktop: dragging looks around without sitting down', await pg.evaluate('__room.state') == 'room')
    await pg.screenshot(path=str(SHOTS / 'd03_room_dragged.png'))
    await pg.mouse.move(700, 450); await pg.mouse.down(); await pg.mouse.move(840, 470, steps=6); await pg.mouse.up()
    await asyncio.sleep(2.0)
    await pg.mouse.move(1440 * 0.47, 900 * 0.53)
    await asyncio.sleep(2.0)
    hover = await pg.evaluate("document.getElementById('stage').classList.contains('is-hover')")
    check('desktop: hovering the laptop shows a pointer', hover)
    await pg.mouse.click(1440 * 0.47, 900 * 0.53)
    await state(pg, 'desktop')
    check('desktop: clicking the laptop sits down again', True)
    await asyncio.sleep(0.8)
    await pg.keyboard.press('Escape')
    await state(pg, 'room')
    check('desktop: Esc with no window open stands up', True)
    await asyncio.sleep(1.5)
    await pg.mouse.click(1440 * 0.83, 900 * 0.45)
    await state(pg, 'desktop')
    await asyncio.sleep(1)
    t = await pg.text_content('.win-title span') if await pg.is_visible('.win') else None
    check('desktop: clicking the bookshelf opens Awards & Books', t == 'Awards & Books', t)
    await pg.screenshot(path=str(SHOTS / 'd04_shelf_to_awards.png'))
    await pg.keyboard.press('Escape'); await asyncio.sleep(0.4)
    await pg.click('#skip')
    await pg.wait_for_load_state('load')
    check('desktop: skip link opens the About page', pg.url == SITE_ROOT + 'about/', pg.url)
    await ctx.close()

async def skip_intro(b):
    """/room/ entry: a click during the intro offers Skip intro; it jumps cleanly to the desk."""
    ctx, pg = await page_for(b, 1440, 900, label='skip')
    await pg.goto(BASE + '?3d=1')
    await state(pg, 'game')
    await pg.wait_for_function("__room.game && __room.game.phase === 'play'")
    # during the game a click is a step, not a skip offer; Tab order is the step button, then Skip intro
    s0 = await pg.evaluate('__room.game.step')
    await pg.mouse.click(720, 450)
    await asyncio.sleep(0.5)
    st = await pg.evaluate("[__room.state, __room.game && __room.game.step, document.getElementById('skip-intro').classList.contains('is-offered')]")
    check('game: a click steps the model and does not offer Skip', st[0] == 'game' and st[1] == s0 + 1 and not st[2], st)
    await pg.focus('.g-step')
    await pg.keyboard.press('Tab')
    fid = await pg.evaluate("document.activeElement.id")
    check('game: Tab from the step button reaches Skip intro', fid == 'skip-intro', fid)
    await pg.screenshot(path=str(SHOTS / 'g05_skip_focused.png'))
    t0 = time.time()
    await pg.keyboard.press('Enter')
    await state(pg, 'desktop', 5000)
    check('skip: Skip intro jumps to the desk', True, f'{time.time() - t0:.2f}s')
    await asyncio.sleep(1.2)
    hidden = await pg.evaluate("document.getElementById('skip-intro').hidden")
    head = await pg.evaluate("document.querySelector('.os-office') && getComputedStyle(document.querySelector('.os-office')).display")
    check('skip: Skip intro goes away, Stand up is offered', hidden and head != 'none')
    await pg.click('.folder[data-id="about"]'); await asyncio.sleep(0.6)
    h = await pg.evaluate("document.querySelector('.w-h a').href")
    check('skip: /room/ entry resolves page links one level up', h == SITE_ROOT + 'about/', h)
    await pg.keyboard.press('Escape'); await asyncio.sleep(0.4)
    # the intro plays once per session: a second load in the same tab goes straight to the desk
    await pg.goto(BASE + '?3d=1')
    seen = set(); t1 = time.time()
    while time.time() - t1 < 30:
        st = await pg.evaluate("window.__room ? window.__room.state : 'none'"); seen.add(st)
        if st == 'desktop': break
        await asyncio.sleep(0.1)
    check('session: a second visit in the same session skips the game and intro', 'desktop' in seen and 'intro' not in seen and 'game' not in seen, sorted(seen))
    # ?intro forces the intro even with the session flag set; Esc in the game phase lands on the desk
    await pg.goto(BASE + '?3d=1&intro')
    await state(pg, 'game', 60000)
    check('?intro: forces the game although the session flag is set', True)
    await asyncio.sleep(1.0)
    await pg.keyboard.press('Escape')
    await state(pg, 'desktop', 5000)
    g = await pg.evaluate("[__room.game, document.querySelectorAll('.g-ui').length]")
    check('skip: Esc during the game lands on the desk and removes the game', g == [None, 0], g)
    # Esc during the walk-in (after the game) also skips; a click there offers Skip as before
    await pg.goto(BASE + '?3d=1&intro')
    await state(pg, 'game', 60000)
    await pg.evaluate("__room.game && 0")
    for _ in range(6):
        await pg.keyboard.press('ArrowRight'); await asyncio.sleep(0.15)
    await state(pg, 'intro', 120000)
    await asyncio.sleep(0.5)
    await pg.mouse.click(720, 450); await asyncio.sleep(0.4)
    off = await pg.evaluate("[document.getElementById('skip-intro').classList.contains('is-offered'), document.activeElement.id]")
    check('walk-in: a click offers and focuses Skip intro (as before)', off == [True, 'skip-intro'], off)
    await pg.keyboard.press('Escape')
    await state(pg, 'desktop', 5000)
    check('skip: Esc during the walk-in skips it', True)
    await ctx.close()

async def gsap_at(pg, t):
    await pg.wait_for_function(f"gsap.ticker.time >= {t}", timeout=120000)

async def game_paced(b, w, h, mobile, n, gap, how, tag, lo, hi):
    """Play the game with inputs paced on the GSAP clock; check the total intro length."""
    ctx, pg = await page_for(b, w, h, mobile=mobile, label=tag)
    await pg.goto(BASE + '?3d=1&intro')
    await state(pg, 'game')
    await pg.wait_for_function("__room.game && __room.game.phase === 'play'")
    t = await pg.evaluate('gsap.ticker.time')
    steps = []
    for i in range(n):
        await gsap_at(pg, t + gap * (i + 1) - (gap if i == 0 else 0) + 0.05)
        if how == 'click': await pg.mouse.click(w * 0.5, h * 0.45)
        elif how == 'tap': await pg.tap('canvas')
        else: await pg.keyboard.press(how[i % len(how)])
        steps.append(await pg.evaluate("__room.game ? __room.game.step : -1"))
    await state(pg, 'desktop', 150000)
    tm = await pg.evaluate('__room.timing')
    TIMINGS[tag] = tm
    check(f'{tag}: {n} inputs play the game to the desk, total {lo}-{hi} s', lo <= tm['total'] <= hi,
          f"steps after each input {steps}; game {tm['game']:.2f} + fade {tm['fade']} + walk-in {tm['walk']:.2f} = {tm['total']:.2f} s")
    await ctx.close()

async def game_mash(b):
    ctx, pg = await page_for(b, 1440, 900, label='mash')
    await pg.goto(BASE + '?3d=1&intro')
    await state(pg, 'game')
    await pg.wait_for_function("__room.game && __room.game.phase === 'play'")
    seen = []
    for i in range(30):
        await pg.mouse.click(700 + (i % 5) * 9, 420)
        seen.append(await pg.evaluate("__room.game ? __room.game.step : 99"))
    await state(pg, 'desktop', 150000)
    tm = await pg.evaluate('__room.timing')
    TIMINGS['mash'] = tm
    mono = all(a <= b2 for a, b2 in zip(seen, seen[1:]))
    check('mashing: 30 rapid clicks, steps never pass 6 or go back, game completes', mono and max(x for x in seen if x != 99) <= 6,
          f'steps seen {sorted(set(seen))}; total {tm["total"]:.2f} s')
    await ctx.close()

async def mobile_3d(b):
    ctx, pg = await page_for(b, 390, 844, mobile=True, label='mobile-3d')
    t0 = time.time()
    await pg.goto(ROOT + '?3d=1')
    await state(pg, 'game')
    await pg.wait_for_function("!__room.game || __room.game.phase === 'play'")
    await asyncio.sleep(0.2)
    await pg.screenshot(path=str(SHOTS / 'gm01_play.png'))
    await pg.wait_for_function("!__room.game || __room.game.step >= 2")
    await asyncio.sleep(0.3)
    await pg.screenshot(path=str(SHOTS / 'gm02_label.png'))
    await state(pg, 'desktop')
    tm = await pg.evaluate('__room.timing')
    TIMINGS['phone idle'] = tm
    check('idle phone: no input reaches the desk, total <= 11 s', 0 < tm['total'] <= 11, f"game {tm['game']:.2f} + fade {tm['fade']} + walk-in {tm['walk']:.2f} = {tm['total']:.2f} s; {time.time() - t0:.1f}s wall")
    await asyncio.sleep(1.2)
    await pg.screenshot(path=str(SHOTS / 'm01_desktop.png'))
    for fid in ('about', 'research', 'publications', 'leadership'):
        await pg.tap(f'.folder[data-id="{fid}"]')
        await pg.wait_for_selector('.win:not([hidden])')
        await asyncio.sleep(0.7)
        await pg.screenshot(path=str(SHOTS / f'm_win_{fid}.png'))
        pad = await pg.evaluate("getComputedStyle(document.querySelector('.win-body')).paddingLeft")
        await pg.tap('.win-back')
        await asyncio.sleep(0.5)
        check(f'mobile: {fid} opens full-screen and Folders closes it', await pg.evaluate("document.querySelector('.win').hidden"), f'padding {pad}')
    overflow = await pg.evaluate("document.documentElement.scrollWidth <= innerWidth")
    check('mobile: no horizontal overflow', overflow)
    await pg.tap('.os-office')
    await state(pg, 'room')
    await asyncio.sleep(1.5)
    await pg.screenshot(path=str(SHOTS / 'm02_room.png'))
    check('mobile: Stand up shows the room', True)
    await pg.tap('#sit')
    await state(pg, 'desktop')
    check('mobile: Tap the laptop returns to the desktop', True)
    # skip on phone (forget the once-per-session flag so the intro plays again)
    await pg.evaluate("sessionStorage.removeItem('vsi-intro')")
    await pg.goto(ROOT + '?3d=1')
    await state(pg, 'game'); await asyncio.sleep(1.0)
    await pg.tap('#skip-intro')
    await state(pg, 'desktop', 5000)
    check('mobile: Skip intro works', True)
    await ctx.close()

async def fallback_default(b, nogl=False):
    tag = 'nowebgl' if nogl else 'default'
    for (w, h, mob) in ((1440, 900, False), (390, 844, True)):
        ctx, pg = await page_for(b, w, h, mobile=mob, label=f'{tag}-{w}')
        t0 = time.time()
        await pg.goto(ROOT)
        await state(pg, 'desktop', 20000)
        m = await room(pg)
        dt = time.time() - t0
        if nogl:
            check(f'{tag} {w}px: WebGL disabled falls back to 2D desktop', m[0] == '2d' and m[2] == 'no-webgl', f'{m} in {dt:.1f}s')
        else:
            check(f'{tag} {w}px: without a real GPU, falls back to 2D desktop', m[0] == '2d', f'{m} in {dt:.1f}s')
        await asyncio.sleep(1)
        await pg.screenshot(path=str(SHOTS / f'{tag}_{w}.png'))
        if w == 1440 and nogl:
            office = await pg.evaluate("getComputedStyle(document.querySelector('.os-office')).display")
            check('2D: no Stand up control without the room', office == 'none', office)
            await folders_cycle(pg, 'nogl', shots=('cv', 'contact', 'awards'))
            await pg.keyboard.press('Escape')
            await pg.focus('.folder[data-id="about"]')
            await pg.keyboard.press('ArrowRight')
            fid = await pg.evaluate("document.activeElement.dataset.id")
            check('2D: arrow keys move between folders', fid == 'research', fid)
            await pg.keyboard.press('Enter'); await asyncio.sleep(0.5)
            check('2D: Enter opens focused folder', await pg.is_visible('.win'))
        await ctx.close()

async def reduced(b):
    ctx, pg = await page_for(b, 1440, 900, reduced=True, label='reduced')
    t0 = time.time()
    await pg.goto(ROOT + '?3d=1')
    await state(pg, 'desktop', 10000)
    dt = time.time() - t0
    check('reduced motion: no intro, straight to the desktop', dt < 4, f'{dt:.2f}s')
    await pg.wait_for_function("document.getElementById('os').classList.contains('has-office')")
    g = await pg.evaluate("[__room.game, document.querySelectorAll('.g-ui').length]")
    check('reduced motion: no intro game', g == [None, 0], g)
    await pg.click('.os-office')
    await state(pg, 'room', 10000)
    t1 = time.time()
    await pg.click('#sit')
    await state(pg, 'desktop', 10000)
    dt = time.time() - t1
    check('reduced motion: stand up and sit down are instant cuts', dt < 2, f'{dt:.2f}s')
    await pg.click('.folder[data-id="about"]')
    op = await pg.evaluate("getComputedStyle(document.querySelector('.win')).opacity")
    check('reduced motion: window appears without animation', op == '1', op)
    await pg.screenshot(path=str(SHOTS / 'reduced_about.png'))
    await pg.goto(ROOT + '?3d=1&intro')
    seen = set(); t1 = time.time()
    while time.time() - t1 < 20:
        st = await pg.evaluate("window.__room ? window.__room.state : 'none'"); seen.add(st)
        if st == 'desktop' and await pg.evaluate("document.getElementById('os').classList.contains('has-office')"): break
        await asyncio.sleep(0.1)
    check('reduced motion + ?intro: still no game, desk at once', 'game' not in seen and 'intro' not in seen, sorted(seen))
    await ctx.close()

async def deeplink(b):
    ctx, pg = await page_for(b, 1440, 900, label='deeplink')
    await pg.goto(BASE + '?3d=1#publications')
    await state(pg, 'desktop')
    await asyncio.sleep(0.8)
    t = await pg.text_content('.win-title span') if await pg.is_visible('.win') else None
    check('deep link #publications opens that folder straight away', t == 'Publications', t)
    await ctx.close()

async def link_targets(b):
    ctx = await b.new_context()
    bad = []
    for u in sorted(all_links):
        r = await ctx.request.get(u)
        if r.status != 200: bad.append(f'{r.status} {u}')
    check('every main-site link in the windows resolves (200)', not bad and all_links, f'{len(all_links)} pages; {bad}')
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GL)
        await desktop_3d(b)
        await skip_intro(b)
        await mobile_3d(b)
        await game_paced(b, 1440, 900, False, 6, 1.2, 'click', 'desktop clicks (1 per 1.2 s)', 15, 20)
        await game_paced(b, 1440, 900, False, 6, 0.7, ['Space'], 'desktop Space x6', 0, 20)
        await game_paced(b, 1440, 900, False, 6, 0.7, ['ArrowDown', 'ArrowRight', 'Enter', 'Space', 'ArrowDown', 'ArrowRight'], 'desktop arrows and Enter', 0, 20)
        await game_paced(b, 390, 844, True, 4, 0.6, 'tap', 'phone taps x4', 0, 10)
        await game_mash(b)
        await reduced(b)
        await deeplink(b)
        await fallback_default(b)
        await b.close()
        b2 = await p.chromium.launch(args=NOGL)
        await fallback_default(b2, nogl=True)
        await link_targets(b2)
        await b2.close()
    check('no console errors or failed requests', not errors, '; '.join(errors[:8]))
    passed = sum(r['ok'] for r in results)
    print(f'\n{passed}/{len(results)} checks passed')
    (SHOTS / 'results.json').write_text(json.dumps({'results': results, 'errors': errors, 'intro_timings_gsap_clock': TIMINGS}, indent=2))
    for k, v in TIMINGS.items():
        print(f"timing {k}: game {v['game']:.2f} + fade {v['fade']} + walk-in {v['walk']:.2f} = {v['total']:.2f} s")

asyncio.run(main())
