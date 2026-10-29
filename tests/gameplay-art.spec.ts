import {test,expect} from '@playwright/test';
test('required illustrated setup popup protects disclosure and vertical terminal stays aligned',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/fixtures/real.html');await page.getByRole('button',{name:"Let's Fly!"}).click();await page.getByRole('button',{name:'Continue solo',exact:true}).click();await page.getByRole('button',{name:'Play mode',exact:true}).click();await page.getByRole('button',{name:'Begin Mission'}).click();
 const setup=page.getByRole('dialog',{name:'Choose your starting information',exact:true});await expect(setup).toBeVisible();
 await page.keyboard.press('Escape');await expect(setup).toBeVisible();await page.mouse.click(1,1);await expect(setup).toBeVisible();
 await expect(page.locator('.information-marker')).toHaveCount(0);await expect(setup.locator('.starting-option').first()).toBeEnabled();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const b=await setup.boundingBox();expect(b!.width).toBeLessThanOrEqual(width);}
 await page.setViewportSize(info.project.name==='mobile'?{width:390,height:844}:{width:1440,height:1000});await page.screenshot({path:`docs/previews/${info.project.name}-setup-art.png`,fullPage:true});
 await setup.locator('.starting-option').last().click();await expect(setup).toHaveCount(0);await expect(page.locator('dialog[open]')).toHaveCount(0);
 await expect(page.locator('.information-marker')).toHaveCount(3);await expect(page.locator('.pip-cleared')).toHaveCount(0);
 await expect(page.locator('.portrait-frame-art')).toHaveCount(3);await expect(page.locator('.captain-art')).toHaveCount(1);
 const positions=await page.locator('.rack').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {name:el.getAttribute('aria-label'),x:r.x,y:r.y,bottom:r.bottom}}));
 expect(positions[1].y).toBeGreaterThan(positions[0].y);expect(positions[2].y).toBeGreaterThanOrEqual(positions[1].bottom);
 const status=await page.locator('.board-companion').boundingBox();expect(status!.x).toBeGreaterThan(positions[0].x);expect(status!.y).toBeLessThan(positions[1].y);
 const blue=page.locator('.rack-sam .wire-tile:not(.cleared)').first();await expect(blue).toHaveCSS('background-image',/cartridge-blue/);
 await page.screenshot({path:`docs/previews/${info.project.name}-terminal-art.png`,fullPage:true});expect(errors).toEqual([]);
});
