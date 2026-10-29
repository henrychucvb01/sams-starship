import {test,expect} from '@playwright/test';
test('spaceport artwork loads; five live equal-sized options preserve selected state and navigation',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:"Let's Fly!"}).click();
 const screen=page.locator('.spaceport-selection');await expect(screen).toBeVisible();
 await expect(page.locator('header.topbar, footer, .crew-mode-note,.boarding-pass-tag')).toHaveCount(0);
 await expect(screen).toHaveCSS('max-width','none');
 expect(await screen.evaluate(el=>Math.abs(el.getBoundingClientRect().width-innerWidth))).toBeLessThan(1);
 await expect(screen).toHaveCSS('background-image',/spaceport.*webp/);
 await expect(screen.locator('.boarding-character img')).toHaveCount(5);
 await expect.poll(()=>screen.locator('img').evaluateAll(els=>els.every(el=>(el as HTMLImageElement).complete&&(el as HTMLImageElement).naturalWidth>0))).toBe(true);
 await expect(screen.locator('.crew-portrait')).toHaveCount(0);
 for(const n of [1,2,3,4,5]){
  await page.locator(`input[name="crew-size"][value="${n}"]`).check();
  await expect(screen.locator('.crew-size-option.selected')).toHaveCount(1);
  await expect(screen.locator('.crew-size-option.selected .crew-option-art')).toHaveAttribute('src',/selection-gold/);
  await expect(screen.locator('.crew-size-option:not(.selected) .crew-option-art')).toHaveCount(4);
  await expect(page.getByRole('button',{name:n===1?'Continue solo':`Continue with ${n} players`,exact:true}))[n === 1 ? "toBeEnabled" : "toBeDisabled"]();
 }
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:1000});
  const boxes=await screen.locator('.crew-size-option').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height}}));
  expect(Math.max(...boxes.map(r=>r.width))-Math.min(...boxes.map(r=>r.width))).toBeLessThan(1);
  expect(Math.max(...boxes.map(r=>r.height))-Math.min(...boxes.map(r=>r.height))).toBeLessThan(1);
  expect(boxes.every(r=>r.width>=44&&r.height>=44)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 await page.setViewportSize(info.project.name==='mobile'?{width:390,height:844}:{width:1440,height:1000});
 await page.screenshot({path:`docs/previews/${info.project.name}-spaceport-crew.png`,fullPage:true});
 for(const name of ['Fox','Bunny','Cat','Bear']) await page.getByRole('button',{name:`Choose ${name}`,exact:true}).click();
 await page.getByRole('button',{name:'Continue with 5 players',exact:true}).click();
 await page.getByRole('button',{name:'Play mode',exact:true}).click();
 await expect(page.getByRole('heading',{name:/Your crew.*launchpad/ })).toBeVisible();
 await page.getByRole('button',{name:/Back to crew selection/}).click();
 await page.locator('input[value="1"][name="crew-size"]').check();
 for(const name of ['Fox','Bunny','Cat','Bear']) await page.getByRole('button',{name:`Choose ${name}`,exact:true}).click();
 await page.getByRole('button',{name:'Continue solo',exact:true}).click();
 await expect(page.getByRole('button',{name:'Play mode'})).toBeEnabled();expect(errors).toEqual([]);
});
test('spaceport keeps radio keyboard focus, native labels and reduced-motion controls',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.getByRole('button',{name:"Let's Fly!"}).click();
 const first=page.locator('input[name="crew-size"][value="1"]');await first.focus();
 for(const n of [2,3,4,5]){await page.keyboard.press('ArrowRight');await expect(page.locator(`input[name="crew-size"][value="${n}"]`)).toBeChecked();}
 expect(await page.locator('.character-sprite').evaluateAll(els=>els.every(el=>getComputedStyle(el).animationName==='none'))).toBe(true);
 await expect(page.locator('.crew-size-option.selected')).toHaveCSS('outline-style','solid');
 for(const name of ['Fox','Bunny','Cat','Bear']) await page.getByRole('button',{name:`Choose ${name}`,exact:true}).click();
 await page.locator('input[name="crew-size"][value="5"]').focus();
 await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Continue with 5 players',exact:true})).toBeFocused();
 await page.keyboard.press('Enter');await page.getByRole('button',{name:'Play mode',exact:true}).click();await expect(page.getByRole('heading',{name:/Your crew.*launchpad/ })).toBeVisible();
});
test('player chooses a character independently, retains it when going back and sees it in solo',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:"Let's Fly!"}).click();
 await page.getByRole('button',{name:'Choose Fox',exact:true}).click();
 await expect(page.getByRole('button',{name:'Choose Fox',exact:true})).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('button',{name:'Choose Sam',exact:true})).toHaveAttribute('aria-pressed','false');
 await page.locator('input[name="crew-size"][value="3"]').check();
 await expect(page.locator('.parade-member')).toHaveCount(1);
 await expect(page.getByRole('button',{name:'Continue with 3 players',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Choose Bear',exact:true}).click();await page.getByRole('button',{name:'Choose Cat',exact:true}).click();
 await expect(page.getByRole('button',{name:'Continue with 3 players',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Choose Bear',exact:true}).click();await page.getByRole('button',{name:'Choose Cat',exact:true}).click();
 await page.locator('input[name="crew-size"][value="1"]').check();
 await page.getByRole('button',{name:'Continue solo',exact:true}).click();
 await page.getByRole('button',{name:'Back to crew selection'}).click();
 await expect(page.getByRole('button',{name:'Choose Fox',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Continue solo',exact:true}).click();await page.getByRole('button',{name:'Play mode',exact:true}).click();await page.getByRole('button',{name:'Begin Mission'}).click();
 await expect(page.getByRole('img',{name:'Fox',exact:true})).toBeVisible();
});
