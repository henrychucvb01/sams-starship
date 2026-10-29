import {test,expect} from '@playwright/test';
test('approved adventure artwork, panel selection, difficulty locks and crew-first launch',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/fixtures/real.html');await page.getByRole('button',{name:"Let's Fly!"}).click();
 await expect(page.getByRole('heading',{name:'Choose Your Adventure!',exact:true})).toBeFocused();
 await expect(page.locator('header.topbar,footer')).toHaveCount(0);
 await expect(page.locator('.combined-panels clipPath path')).toHaveCount(4);
 await expect(page.locator('.individual-panel-art')).toHaveCount(4);
 const modes=page.locator('.adventure-mode');await expect(modes).toHaveCount(4);
 await expect.poll(()=>page.locator('.adventure-heading img').evaluateAll(els=>els.every(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0))).toBe(true);
 for(const name of ['Restore the Lights','Navigation Crisis','Power Overload','Signal Blackout']){
  const select=page.getByRole('button',{name:`Select ${name}`,exact:true});await select.click();await expect(select).toHaveAttribute('aria-pressed','true');
 }
 await modes.first().getByRole('button',{name:'Select Restore the Lights',exact:true}).focus();await page.keyboard.press('Enter');await expect(modes.first()).toHaveClass(/selected/);
 for(const mode of (await modes.all()).slice(1)) await expect(mode.locator('.illustrated-mode-button')).toBeDisabled();
 const difficulty=modes.first().getByRole('combobox');for(const level of ['Medium','Hard']){await difficulty.selectOption(level);await expect(modes.first().locator('.illustrated-mode-button')).toBeDisabled();}
 await difficulty.selectOption('Easy');
 for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await modes.locator('.illustrated-mode-button').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().height>=44))).toBe(true);}
 await page.setViewportSize(info.project.name==='mobile'?{width:390,height:844}:{width:1440,height:1000});
 await page.screenshot({path:`docs/previews/${info.project.name}-adventure-art.png`,fullPage:true});
 await page.getByRole('button',{name:'Play mode',exact:true}).click();await expect(page.getByRole('heading',{name:'Assemble your crew!'})).toBeVisible();
 await page.getByRole('button',{name:'Continue solo',exact:true}).click();await page.getByRole('button',{name:'Begin Mission'}).click();await expect(page.locator('.wire-tile')).toHaveCount(48);await expect(page.locator('header.topbar,footer')).toHaveCount(2);expect(errors).toEqual([]);
});
test('reduced motion and existing training remain accessible',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/tests/fixtures/real.html');await page.getByRole('button',{name:"Let's Fly!"}).click();
 await expect(page.locator('.panel-select').first()).toHaveCSS('transition-duration','0s');
 await page.getByRole('button',{name:/Circuit Training 4/}).click();await expect(page.getByRole('button',{name:'Begin Mission'})).toBeVisible();
});
