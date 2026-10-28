import {test,expect} from '@playwright/test';
test('game mode cards use approved art and preserve difficulty locks and launch flow',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/tests/fixtures/real.html');await page.getByRole('button',{name:"Let's Fly!"}).click();await page.getByRole('button',{name:'Continue solo',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Choose your game mode.',exact:true})).toBeVisible();
 const cards=page.locator('.game-modes-page .mission-card');await expect(cards).toHaveCount(4);
 await expect(cards.locator('.mode-artwork img')).toHaveCount(4);
 await expect.poll(()=>cards.locator('img').evaluateAll(els=>els.every(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0))).toBe(true);
 await expect(cards.first()).toContainText('MODE 01');await expect(cards.first().locator('.mode-ready')).toHaveText('Ready');
 await expect(page.locator('.game-modes-page')).not.toContainText('MISSION');
 for(const card of (await cards.all()).slice(1)){await expect(card.getByRole('combobox')).toBeDisabled();await expect(card.getByRole('button')).toBeDisabled();await expect(card.locator('.mode-lock').first()).toBeVisible();}
 const difficulty=cards.first().getByRole('combobox');for(const level of ['Medium','Hard']){await difficulty.selectOption(level);await expect(cards.first().getByRole('button')).toBeDisabled();await expect(cards.first().locator('.mode-status')).toContainText('Coming Soon');}
 await difficulty.selectOption('Easy');await expect(cards.first().getByRole('button',{name:/Play mode/})).toBeEnabled();
 for(const width of [320,390,768,1280]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const heights=await cards.getByRole('button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));expect(heights.every(h=>h>=44)).toBe(true);}
 await page.setViewportSize(info.project.name==='mobile'?{width:390,height:844}:{width:1440,height:1000});
 await page.screenshot({path:`docs/previews/${info.project.name}-game-modes.png`,fullPage:true});
 await cards.first().getByRole('button',{name:/Play mode/}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Begin Mission'})).toBeVisible();await page.getByRole('button',{name:'Begin Mission'}).click();await expect(page.locator('.wire-tile')).toHaveCount(48);expect(errors).toEqual([]);
});
test('game mode artwork respects reduced motion and retains training navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/tests/fixtures/real.html');await page.getByRole('button',{name:"Let's Fly!"}).click();await page.getByRole('button',{name:'Continue solo',exact:true}).click();
 expect(await page.locator('.mode-artwork img').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none'))).toBe(true);
 await page.getByRole('button',{name:/Circuit Training 4/}).click();await expect(page.getByRole('button',{name:'Begin Mission'})).toBeVisible();
});
