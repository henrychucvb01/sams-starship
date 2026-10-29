import {test,expect,type Page} from '@playwright/test';
async function launch(page:Page,fixture:string){
 await page.clock.install();await page.goto(fixture);await page.getByRole('button',{name:"Let's Fly!"}).click();await page.getByRole('button',{name:'Continue solo',exact:true}).click();await page.getByRole('button',{name:'Play mode',exact:true}).click();await page.getByRole('button',{name:'Begin Mission'}).click();
 if(await page.locator('.starting-option').count())await page.locator('.starting-option').last().click();
}
test('approved tracker art, HUD border and four original lamps reflect each restored copy',async({page},info)=>{
 await launch(page,'/tests/fixtures/harness.html?tracker=1');const tracker=page.locator('.illustrated-tracker');
 await expect(tracker).toHaveCSS('border-image-source',/tracker-border/);await expect(tracker.locator('.number-marker')).toHaveCount(12);
 await expect(tracker.locator('.tracker-special-art')).toHaveCount(2);await expect(tracker.locator('.badge-yellow img')).toHaveAttribute('src',/tracker-yellow/);await expect(tracker.locator('.badge-red img')).toHaveAttribute('src',/tracker-red/);
 const tile=tracker.locator('.number-marker').nth(2);
 for(const count of [0,1,2,3,4]){
  await page.getByLabel('Tracker progress',{exact:true}).selectOption(String(count));await expect(tile).toHaveAttribute('aria-label',`Number 3: ${count} of 4 resolved${count===4?', completed':''}`);
  await expect(tile.locator('.copy-pips i')).toHaveCount(4);await expect(tile.locator('.pip-cleared')).toHaveCount(count);await expect(tile.locator('.tracker-body-art')).toHaveAttribute('src',count===4?/tracker-green/:/tracker-blue/);
  for(let i=0;i<4;i++)await expect(tile.locator('.copy-pips i').nth(i)).toHaveCSS('filter',i<count?'brightness(1.1) saturate(1.1)':'brightness(0.12) saturate(0.3)');
  await expect(tile.locator('.tracker-unlit-bank')).toHaveCSS('filter','brightness(0.12) saturate(0.3)');
  await page.screenshot({path:`docs/previews/${info.project.name}-tracker-${count}.png`,fullPage:true});
 }
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const images=await tracker.locator('.tracker-body-art').evaluateAll(els=>els.map(el=>{const i=el as HTMLImageElement,r=i.getBoundingClientRect();return Math.abs(r.width/r.height-i.naturalWidth/i.naturalHeight)}));expect(images.every(n=>n<.01)).toBe(true);}
});
test('real crew cartridges are tightly packed and tracker lamps update from a real self-connection',async({page},info)=>{
 await page.setViewportSize({width:1440,height:900});await launch(page,'/tests/fixtures/real.html?self=1');
 const gaps=await page.locator('.wire-row').evaluateAll(rows=>rows.flatMap(row=>{const rects=Array.from(row.querySelectorAll('.wire-tile')).map(e=>e.getBoundingClientRect());return rects.slice(1).filter((r,i)=>Math.abs(r.y-rects[i].y)<1).map((r,i)=>r.x-rects[i].right);}));expect(gaps.every(g=>g>=0&&g<=4)).toBe(true);
 await page.locator('[data-slot="sam-2"]').click();await page.locator('[data-slot="sam-3"]').click();const two=page.getByLabel('Number 2: 4 of 4 resolved, completed',{exact:true});await expect(two.locator('.pip-cleared')).toHaveCount(4);await expect(two.locator('.tracker-body-art')).toHaveAttribute('src',/tracker-green/);
 await page.screenshot({path:`docs/previews/${info.project.name}-packed-crew.png`,fullPage:true});
});
