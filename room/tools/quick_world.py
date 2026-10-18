"""Quick look: jump to every place at a mobile and a desktop viewport and screenshot it; report where the
character projects on screen relative to the info card (for the 'never covered' check)."""
import asyncio, os, sys
from playwright.async_api import async_playwright
BASE = os.environ.get('BASE', 'http://localhost:8765/world/'); Q = os.environ.get('Q', '?hd')
OUT = os.environ.get('OUT', '/workspace/site_build/redesign_shots/iter/'); PFX = os.environ.get('PFX', 'q_')
ONLY = os.environ.get('ONLY', '')
VP = {'mobile': ({'width': 412, 'height': 915}, True), 'desktop': ({'width': 1440, 'height': 900}, False)}
PLACES = ['home', 'campus', 'about', 'research', 'teaching', 'projects', 'leadership', 'contact']
PROBE = '''(() => { const w = __world, T = w._T, c = w.stage.camera, g = w.character.group.position;
  const pr = (y) => { const v = new T.Vector3(g.x, g.y + y, g.z).project(c); return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight]; };
  const pan = Object.values(w.panels.el).find((p) => !p.hidden); const b = pan ? pan.getBoundingClientRect() : null;
  const ib = document.querySelector('.iconbar').getBoundingClientRect(); const joy = document.querySelector('.joy'); const jb = joy ? joy.getBoundingClientRect() : null;
  return { head: pr(1.75).map(Math.round), feet: pr(0).map(Math.round), card: b && [b.left, b.top, b.right, b.bottom].map(Math.round), icon: [ib.left, ib.top, ib.right, ib.bottom].map(Math.round), joy: jb && [jb.left, jb.top, jb.right, jb.bottom].map(Math.round) }; })()'''
async def run(p, name):
    vp, mob = VP[name]
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob)
    pg = await ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    await pg.goto(BASE + Q); await pg.wait_for_selector('.gate.ready', timeout=90000)
    await pg.click('#start-quiet')
    for _ in range(200):                                    # wait for the START brush to hand over, then skip the establishing shot
        if await pg.evaluate('__world._estT !== undefined'): break
        await pg.wait_for_timeout(200)
    await pg.evaluate('__world._estT = 1'); await pg.wait_for_timeout(300)
    for i, pl in enumerate(PLACES):
        if ONLY and pl not in ONLY.split(','): continue
        await pg.evaluate(f'__world.path.jump({i}); __world.path.section = -1')
        for _ in range(60):
            if await pg.evaluate(f'__world.path.section === {i} && __world.world.locations[{i}].built'): break
            await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(2200)
        await pg.screenshot(path=f'{OUT}{PFX}{name}_{i}_{pl}.png')
        print(name, pl, await pg.evaluate(PROBE), flush=True)
        if mob and pl in ('teaching', 'campus'):
            await pg.click(f'#panel-{pl} .panel-toggle'); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'{OUT}{PFX}{name}_{i}_{pl}_open.png'); print(name, pl, 'open', await pg.evaluate(PROBE), flush=True)
            await pg.click(f'#panel-{pl} .panel-toggle'); await pg.wait_for_timeout(800)
    print(name, 'errors:', errs or 'none', flush=True)
    await b.close()
async def main():
    async with async_playwright() as p:
        for n in (sys.argv[1:] or ['mobile', 'desktop']): await run(p, n)
asyncio.run(main())
