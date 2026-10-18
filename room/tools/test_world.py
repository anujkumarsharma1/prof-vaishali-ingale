import asyncio, sys
from playwright.async_api import async_playwright
OUT='/workspace/site_build/redesign_shots/'
URL='http://localhost:8765/world/'
async def run(p, name, vp, mobile):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page(); errs=[]
    pg.on('console', lambda m: errs.append(m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: errs.append('pageerror: '+str(e)))
    await pg.goto(URL); await pg.wait_for_selector('.gate.ready', timeout=60000)
    await pg.screenshot(path=OUT+f'{name}_0_gate.png')
    print(name, await pg.evaluate('({mode:__world.mode,tier:__world.quality.tier,r:__world.quality.reason})'))
    await pg.click('#start-quiet'); await pg.wait_for_timeout(2500)
    await pg.screenshot(path=OUT+f'{name}_1_home.png')
    # scroll to About via wheel / keys
    await pg.keyboard.press('ArrowDown'); await pg.wait_for_timeout(3500)
    await pg.screenshot(path=OUT+f'{name}_2_about.png')
    # mid-transition shot + contact via menu
    await pg.click('#menu-btn'); await pg.wait_for_timeout(400)
    await pg.screenshot(path=OUT+f'{name}_3_menu.png')
    await pg.click('#menu-list li:nth-child(1) button'); await pg.wait_for_timeout(3000)
    await pg.click('#menu-btn'); await pg.wait_for_timeout(300)
    await pg.click('#menu-list li:nth-child(3) button'); await pg.wait_for_timeout(330)
    await pg.screenshot(path=OUT+f'{name}_4_brush.png')
    await pg.wait_for_timeout(3000)
    await pg.screenshot(path=OUT+f'{name}_5_contact.png')
    print(name, 'section', await pg.evaluate('__world.path.section'), 'hash', await pg.evaluate('location.hash'))
    await pg.goto(URL+'?static'); await pg.wait_for_selector('.gate.ready'); await pg.click('#start')
    await pg.wait_for_timeout(800); await pg.screenshot(path=OUT+f'{name}_6_static.png', full_page=True)
    print(name,'errors:', errs or 'none')
    await b.close()
async def main():
    async with async_playwright() as p:
        await run(p,'desktop',{'width':1440,'height':900},False)
        await run(p,'mobile',{'width':390,'height':844},True)
asyncio.run(main())
