import {test,expect,type Page} from '@playwright/test';
async function start(page:Page,query='') {
 await page.clock.install();await page.goto('/tests/fixtures/real.html'+query);
 await page.getByRole('button',{name:"Let's Fly!"}).click();await page.getByRole('button',{name:'Continue solo',exact:true}).click();await page.getByRole('button',{name:'Play mode',exact:true}).click();await page.getByRole('button',{name:'Begin Mission'}).click();
}
test('setup shares on first tap; complete desktop board fits and no confirmation interrupts a connection',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});await start(page);
 const setup=page.getByRole('dialog',{name:'Choose your starting information',exact:true});await expect(setup).toBeVisible();
 await page.keyboard.press('Escape');await expect(setup).toBeVisible();
 await setup.locator('.starting-option').last().click();await expect(setup).toHaveCount(0);await expect(page.locator('.information-marker')).toHaveCount(3);
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 await page.screenshot({path:`docs/previews/${info.project.name}-compact.png`,fullPage:true});
 const bounds=await page.locator('.rack').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom}}));expect(bounds).toHaveLength(3);expect(Math.max(...bounds.map(r=>r.bottom))).toBeLessThanOrEqual(900);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(900);
 const horizontal=await page.locator('.rack-scroll').evaluateAll(els=>els.map(el=>el.scrollWidth<=el.clientWidth+1));expect(horizontal.every(Boolean)).toBe(true);
 await page.screenshot({path:`docs/previews/${info.project.name}-compact.png`,fullPage:true});
 await page.locator('.rack-sam .wire-tile').last().click();await page.locator('.rack-nova .wire-tile').first().click();
 await expect(page.locator('dialog[open]')).toHaveCount(0);await expect(page.locator('.rack-nova .wire-tile').first()).toHaveClass(/disclosed|cleared/);
 for(const width of [320,390,768]) {await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 expect(errors).toEqual([]);
});
test('defeat screen uses real approved character and damaged artwork; retry opens immediate setup',async({page},info)=>{
 await start(page,'?fatal=1');await page.locator('.starting-option').last().click();await page.locator('.rack-sam .wire-tile').last().click();await page.locator('.rack-nova .wire-tile').first().click();await expect(page.getByText('0%',{exact:true})).toBeVisible();await page.clock.runFor(1500);
 await expect(page.getByRole('heading',{name:/Mission Failed/})).toBeVisible();await expect(page.locator('.result-portrait img')).toHaveAttribute('src',/sam/);await expect(page.locator('.result-screen')).toHaveCSS('border-image-source',/damaged-monitor/);
 await expect(page.getByText('SAM · TEMP ART')).toHaveCount(0);await page.screenshot({path:`docs/previews/${info.project.name}-defeat-art.png`,fullPage:true});await page.getByRole('button',{name:/Try Again/}).click();await expect(page.locator('.setup-dialog')).toBeVisible();await page.locator('.starting-option').first().click();await expect(page.locator('.setup-dialog')).toHaveCount(0);
});
test('equipment input popup retains illustrated frame, keyboard focus, and activation',async({page})=>{
 await start(page);await page.locator('.starting-option').first().click();await page.locator('.rack-sam').getByRole('button',{name:'Use power',exact:true}).click();
 const popup=page.getByRole('dialog',{name:'Twin Signal',exact:true});await expect(popup).toBeVisible();await expect(popup).toHaveCSS('border-image-source',/setup-popup/);await page.keyboard.press('Escape');await expect(popup).toHaveCount(0);
});
