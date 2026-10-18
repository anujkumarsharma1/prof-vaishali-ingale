import asyncio, sys
from playwright.async_api import async_playwright
OUT='/workspace/site_build/redesign_shots/'
import os
BASE=os.environ.get('BASE','http://localhost:8765/world/')
Q=os.environ.get('Q','')            # e.g. Q=?hd forces the full-quality path on swiftshader
PFX=os.environ.get('PFX','')        # screenshot prefix, e.g. real_
URL=BASE+Q
# is the character clear of the card, the icon bar and the title? (projected head/feet vs DOM rects)
VIS='''(() => { const w = __world, T = w._T, c = w.stage.camera, g = w.character.group.position;
  const pr = (y) => { const v = new T.Vector3(g.x, g.y + y, g.z).project(c); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight }; };
  const h = pr(1.7), f = pr(0.05), pan = Object.values(w.panels.el).find((p) => !p.hidden), b = pan && pan.getBoundingClientRect();
  const ib = document.querySelector('.iconbar').getBoundingClientRect(), br = document.querySelector('.brand').getBoundingClientRect();
  const hit = (r) => r && f.y > r.top && h.y < r.bottom && Math.max(h.x, f.x) > r.left && Math.min(h.x, f.x) < r.right;
  const on = h.x > 0 && h.x < innerWidth && h.y > 0 && f.y < innerHeight;
  return { onScreen: on, coveredByCard: !!hit(b), coveredByIcons: !!hit(ib), underTitle: !!hit(br), head: [Math.round(h.x), Math.round(h.y)], feet: [Math.round(f.x), Math.round(f.y)] }; })()'''
async def _sz(r, acc):
    try: acc[0] += len(await r.body())
    except Exception: pass
async def run(p, name, vp, mobile):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page(); pg.set_default_timeout(120000); errs=[]; bytes_in=[0]
    pg.on('response', lambda r: asyncio.ensure_future(_sz(r, bytes_in)))
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    await pg.goto(URL); await pg.wait_for_selector('.gate.ready', timeout=60000)
    await pg.screenshot(path=OUT+PFX+f'{name}_0_gate.png')
    print(name, await pg.evaluate('({mode:__world.mode,tier:__world.quality.tier,r:__world.quality.reason, model:__world.modelLoaded})'))
    print(name, 'transfer before start: %.2f MB' % (bytes_in[0] / 1e6))
    await pg.click('#start-quiet'); await pg.wait_for_timeout(1400)
    await pg.screenshot(path=OUT+PFX+f'{name}_1a_establishing.png')
    for _ in range(400):                                   # establishing shot finished (swiftshader runs slower than real time)
        if await pg.evaluate('__world._estT === undefined || __world._estT >= 1'): break
        await pg.wait_for_timeout(250)
    await pg.wait_for_timeout(400)
    await pg.screenshot(path=OUT+PFX+f'{name}_1_home_gate.png')
    print(name, 'visible home', await pg.evaluate(VIS))
    await pg.keyboard.press('ArrowDown')                  # walk through the gate and down the walkway
    for i, ms in enumerate((450, 450, 600)):
        await pg.wait_for_timeout(ms)
        await pg.screenshot(path=OUT+PFX+f'{name}_1{"bcd"[i]}_walk_{i}.png')
    await pg.wait_for_timeout(3500)
    await pg.screenshot(path=OUT+PFX+f'{name}_2_campus.png')
    print(name, 'visible campus', await pg.evaluate(VIS))
    await pg.evaluate('__world.portraitCam = true'); await pg.wait_for_timeout(600)
    await pg.screenshot(path=OUT+PFX+f'{name}_2p_character_portrait.png')
    await pg.evaluate('__world.portraitCam = false'); await pg.wait_for_timeout(200)
    if mobile:
        # phones start with the sheet peeked; open it, check, and peek it again
        print(name, 'sheet collapsed by default', await pg.evaluate("document.getElementById('panel-campus').classList.contains('collapsed')"))
        await pg.click('#panel-campus .panel-toggle'); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=OUT+PFX+f'{name}_2b_campus_open.png')
        await pg.click('#panel-campus .panel-toggle'); await pg.wait_for_timeout(800)
    # mid-transition shot + contact via menu
    await pg.click('#menu-btn'); await pg.wait_for_timeout(400)
    await pg.screenshot(path=OUT+PFX+f'{name}_3_menu.png')
    # ride hops: sample many timesteps; count frames where an opaque mesh still blocks the rider
    async def ride(idx, tag):
        await pg.evaluate(f'__world.go({idx})'); bad = 0; n = 0
        for k in range(20):
            await pg.wait_for_timeout(130)
            n += 1; b = await pg.evaluate('__world.world.opaqueBlockers()')
            # a blocker counts only if it stays opaque after the fade had time (two samples in a row)
            if b: bad += 1
            if k in (5, 12): await pg.screenshot(path=OUT+PFX+f'{name}_ride_{tag}_{k:02d}.png')
        print(name, 'ride', tag, 'samples', n, 'frames with an opaque blocker', bad)
    await pg.keyboard.press('Escape')
    await ride(2, 'campus_to_about'); await pg.wait_for_timeout(1500)
    for idx, tag in ((3, 'about_to_research'), (4, 'research_to_teaching'), (5, 'teaching_to_projects'), (6, 'projects_to_leadership'), (7, 'leadership_to_contact')):
        await ride(idx, tag)
        # swiftshader runs slower than real time: wait until she has actually arrived, then let her step off
        for _ in range(400):
            if await pg.evaluate('Math.abs(__world.path.t-__world.path.target) < 0.001'): break
            await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+PFX+f'{name}_place_{tag.split("_to_")[1]}.png')
        print(name, 'visible', tag.split('_to_')[1], await pg.evaluate(VIS))
        print(name, 'arrived', tag, await pg.evaluate('({speed:+__world.character.speed.toFixed(2), ride:+__world.character.ride.toFixed(2), t:+__world.path.t.toFixed(4), target:__world.path.target})'))
    print(name, 'render info at contact', await pg.evaluate('({calls: __world.stage.renderer.info.render.calls, tris: __world.stage.renderer.info.render.triangles, geos: __world.stage.renderer.info.memory.geometries, tex: __world.stage.renderer.info.memory.textures})'))
    print(name, 'transfer after full ride: %.2f MB' % (bytes_in[0] / 1e6))
    print(name, 'a11y', await pg.evaluate('''(() => { const imgs=[...document.images].filter(i=>!i.alt).length; const btn=[...document.querySelectorAll('button')].filter(b=>!(b.innerText.trim()||b.getAttribute('aria-label')||b.querySelector('.sr-only'))).length; const links=[...document.querySelectorAll('a')].filter(a=>!(a.innerText.trim()||a.getAttribute('aria-label'))).length; const h=document.querySelectorAll('h1').length; return {imgsNoAlt:imgs, unnamedButtons:btn, unnamedLinks:links, h1:h, pubsListed: document.querySelectorAll('#panel-research .pubs li').length}; })()'''))
    if mobile:
        await pg.evaluate('__world.path.jump(2); __world.path.section = -1'); await pg.wait_for_timeout(1200)
        box = await pg.locator('.joy').bounding_box()
        if box:
            t0 = await pg.evaluate('__world.path.target')
            cx, cy = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            await pg.mouse.move(cx, cy); await pg.mouse.down(); await pg.mouse.move(cx, cy - 40, steps=4); await pg.wait_for_timeout(900)
            await pg.screenshot(path=OUT+PFX+f'{name}_7_joystick.png'); await pg.mouse.up()
            print(name, 'joystick moved target', round(t0, 4), '->', round(await pg.evaluate('__world.path.target'), 4))
        else: print(name, 'joystick: not shown')
    await pg.evaluate('__world.path.jump(1); __world.path.section = -1'); await pg.wait_for_timeout(1500)
    await pg.click('#menu-btn'); await pg.wait_for_timeout(300)
    await pg.click('#menu-list li:nth-child(3) button'); await pg.wait_for_timeout(700)
    await pg.screenshot(path=OUT+PFX+f'{name}_3b_scooter_ride.png')
    await pg.wait_for_timeout(3000)
    await pg.screenshot(path=OUT+PFX+f'{name}_3c_about.png')
    print(name, 'visible about', await pg.evaluate(VIS))
    await pg.click('#menu-btn'); await pg.wait_for_timeout(300)
    await pg.click('#menu-list li:nth-child(1) button'); await pg.wait_for_timeout(3000)
    await pg.click('#menu-btn'); await pg.wait_for_timeout(300)
    await pg.click('#menu-list li:nth-child(8) button'); await pg.wait_for_timeout(330)
    await pg.screenshot(path=OUT+PFX+f'{name}_4_brush.png')
    await pg.wait_for_timeout(3000)
    await pg.screenshot(path=OUT+PFX+f'{name}_5_contact.png')
    print(name, 'section', await pg.evaluate('__world.path.section'), 'hash', await pg.evaluate('location.hash'))
    print(name, 'total transfer (3D session): %.2f MB' % (bytes_in[0] / 1e6))
    await pg.goto(BASE+'?static'); await pg.wait_for_selector('.gate.ready'); await pg.click('#start')
    await pg.wait_for_timeout(800); await pg.screenshot(path=OUT+PFX+f'{name}_6_static.png', full_page=True)
    print(name, 'static panels visible', await pg.evaluate("[...document.querySelectorAll('.panel')].filter(p=>!p.hidden).length"), 'pubs', await pg.evaluate("document.querySelectorAll('#panel-research .pubs li').length"))
    print(name,'errors:', errs or 'none')
    await b.close()
async def main():
    async with async_playwright() as p:
        runs = os.environ.get('RUN', 'desktop,mobile').split(',')
        if 'desktop' in runs: await run(p,'desktop',{'width':1440,'height':900},False)
        if 'mobile' in runs: await run(p,'mobile',{'width':412,'height':915},True)
asyncio.run(main())
