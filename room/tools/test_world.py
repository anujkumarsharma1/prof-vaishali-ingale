import asyncio, sys
from playwright.async_api import async_playwright
OUT='/workspace/site_build/redesign_shots/'
URL='http://localhost:8765/world/'
async def _sz(r, acc):
    try: acc[0] += len(await r.body())
    except Exception: pass
async def run(p, name, vp, mobile):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page(); errs=[]; bytes_in=[0]
    pg.on('response', lambda r: asyncio.ensure_future(_sz(r, bytes_in)))
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    await pg.goto(URL); await pg.wait_for_selector('.gate.ready', timeout=60000)
    await pg.screenshot(path=OUT+f'{name}_0_gate.png')
    print(name, await pg.evaluate('({mode:__world.mode,tier:__world.quality.tier,r:__world.quality.reason, model:__world.modelLoaded})'))
    print(name, 'transfer before start: %.2f MB' % (bytes_in[0] / 1e6))
    await pg.click('#start-quiet'); await pg.wait_for_timeout(1400)
    await pg.screenshot(path=OUT+f'{name}_1a_establishing.png')
    await pg.wait_for_timeout(3600)                       # establishing shot (3.2 s) has finished
    await pg.screenshot(path=OUT+f'{name}_1_home_gate.png')
    await pg.keyboard.press('ArrowDown')                  # walk through the gate and down the walkway
    for i, ms in enumerate((450, 450, 600)):
        await pg.wait_for_timeout(ms)
        await pg.screenshot(path=OUT+f'{name}_1{"bcd"[i]}_walk_{i}.png')
    await pg.wait_for_timeout(3500)
    await pg.screenshot(path=OUT+f'{name}_2_campus.png')
    await pg.evaluate('__world.portraitCam = true'); await pg.wait_for_timeout(600)
    await pg.screenshot(path=OUT+f'{name}_2p_character_portrait.png')
    await pg.evaluate('__world.portraitCam = false'); await pg.wait_for_timeout(200)
    if mobile:
        await pg.click('#panel-campus .panel-toggle'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=OUT+f'{name}_2b_campus_collapsed.png')
        await pg.click('#panel-campus .panel-toggle'); await pg.wait_for_timeout(300)
    # mid-transition shot + contact via menu
    await pg.click('#menu-btn'); await pg.wait_for_timeout(400)
    await pg.screenshot(path=OUT+f'{name}_3_menu.png')
    # ride hops: sample many timesteps; count frames where an opaque mesh still blocks the rider
    async def ride(idx, tag):
        await pg.evaluate(f'__world.go({idx})'); bad = 0; n = 0
        for k in range(20):
            await pg.wait_for_timeout(130)
            n += 1; b = await pg.evaluate('__world.world.opaqueBlockers()')
            # a blocker counts only if it stays opaque after the fade had time (two samples in a row)
            if b: bad += 1
            if k in (5, 12): await pg.screenshot(path=OUT+f'{name}_ride_{tag}_{k:02d}.png')
        print(name, 'ride', tag, 'samples', n, 'frames with an opaque blocker', bad)
    await pg.keyboard.press('Escape')
    await ride(2, 'campus_to_about'); await pg.wait_for_timeout(1500)
    for idx, tag in ((3, 'about_to_research'), (4, 'research_to_teaching'), (5, 'teaching_to_projects'), (6, 'projects_to_leadership'), (7, 'leadership_to_contact')):
        await ride(idx, tag)
        # swiftshader runs slower than real time: wait until she has actually arrived, then let her step off
        for _ in range(60):
            if await pg.evaluate('Math.abs(__world.path.t-__world.path.target) < 0.001'): break
            await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=OUT+f'{name}_place_{tag.split("_to_")[1]}.png')
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
            await pg.screenshot(path=OUT+f'{name}_7_joystick.png'); await pg.mouse.up()
            print(name, 'joystick moved target', round(t0, 4), '->', round(await pg.evaluate('__world.path.target'), 4))
        else: print(name, 'joystick: not shown')
    await pg.evaluate('__world.path.jump(1); __world.path.section = -1'); await pg.wait_for_timeout(1500)
    await pg.click('#menu-btn'); await pg.wait_for_timeout(300)
    await pg.click('#menu-list li:nth-child(3) button'); await pg.wait_for_timeout(700)
    await pg.screenshot(path=OUT+f'{name}_3b_scooter_ride.png')
    await pg.wait_for_timeout(3000)
    await pg.screenshot(path=OUT+f'{name}_3c_about.png')
    await pg.click('#menu-btn'); await pg.wait_for_timeout(300)
    await pg.click('#menu-list li:nth-child(1) button'); await pg.wait_for_timeout(3000)
    await pg.click('#menu-btn'); await pg.wait_for_timeout(300)
    await pg.click('#menu-list li:nth-child(8) button'); await pg.wait_for_timeout(330)
    await pg.screenshot(path=OUT+f'{name}_4_brush.png')
    await pg.wait_for_timeout(3000)
    await pg.screenshot(path=OUT+f'{name}_5_contact.png')
    print(name, 'section', await pg.evaluate('__world.path.section'), 'hash', await pg.evaluate('location.hash'))
    await pg.goto(URL+'?static'); await pg.wait_for_selector('.gate.ready'); await pg.click('#start')
    await pg.wait_for_timeout(800); await pg.screenshot(path=OUT+f'{name}_6_static.png', full_page=True)
    print(name, 'static panels visible', await pg.evaluate("[...document.querySelectorAll('.panel')].filter(p=>!p.hidden).length"), 'pubs', await pg.evaluate("document.querySelectorAll('#panel-research .pubs li').length"))
    print(name,'errors:', errs or 'none')
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,'desktop',{'width':1440,'height':900},False)
        await run(p,'mobile',{'width':390,'height':844},True)
asyncio.run(main())
