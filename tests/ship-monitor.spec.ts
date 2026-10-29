import {test,expect,type Page} from '@playwright/test';
async function launch(page:Page){
 await page.clock.install();await page.goto('/tests/fixtures/harness.html');await page.getByRole('button',{name:"Let's Fly!"}).click();await page.getByRole('button',{name:'Continue solo',exact:true}).click();await page.getByRole('button',{name:'Play mode',exact:true}).click();await page.getByRole('button',{name:'Begin Mission'}).click();
 await expect.poll(()=>page.locator('.ship-damage-visual img').evaluateAll(imgs=>imgs.every(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth===960))).toBe(true);
}
test('registered damage zones progress, repair, and remain deterministic without repeated downloads',async({page},info)=>{
 const errors:string[]=[];const downloads:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.resourceType()==='image'&&/ship-(healthy|damaged)\.webp/.test(r.url()))downloads.push(r.url());});await launch(page);
 await expect(page.locator('.attack-scene')).toHaveCSS('overflow','hidden');
 const ship=page.locator('.ship-damage-visual');const select=page.getByLabel('Hull preview',{exact:true});
 const cases:[number,string,number[]][]=[
  [100,'healthy',[0,0,0,0,0]],[90,'minor',[.5,0,0,0,0]],
  [75,'light',[1,.25,0,0,0]],[50,'moderate',[1,1,.5,0,0]],
  [25,'heavy',[1,1,1,.75,0]],[10,'critical',[1,1,1,1,.5]],
  [0,'destroyed',[1,1,1,1,1]],
 ];
 for(const [hull,condition,strengths] of cases){
  await select.selectOption(String(hull));await expect(ship).toHaveAttribute('data-condition',condition);await expect(page.locator('.ship-monitor-heading strong')).toHaveText(`${hull}%`);await expect(page.getByRole('progressbar',{name:'Hull integrity',exact:true})).toHaveAttribute('value',String(hull));
  expect(await ship.locator('.ship-damage-zone').evaluateAll(els=>els.map(e=>Number(e.getAttribute('data-strength'))))).toEqual(strengths);
  for(let i=0;i<5;i++)await expect(ship.locator('.ship-damage-zone').nth(i)).toHaveCSS('opacity',String(strengths[i]));
  await expect(ship.locator('.ship-damage-full')).toHaveCSS('opacity',hull===0?'1':'0');
  const rectangles=await ship.locator('img').evaluateAll(imgs=>imgs.map(img=>{const r=img.getBoundingClientRect();return [r.x,r.y,r.width,r.height]}));for(const r of rectangles.slice(1))for(let i=0;i<4;i++)expect(Math.abs(r[i]-rectangles[0][i])).toBeLessThan(.1);
  for(const width of [390,1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.setViewportSize(info.project.name==='mobile'?{width:390,height:844}:{width:1440,height:1000});await page.screenshot({path:`docs/previews/${info.project.name}-ship-${hull}.png`,fullPage:true});
 }
 for(const [hull,,strengths] of [...cases].reverse().slice(1)){
  await select.selectOption(String(hull));await expect(ship).toHaveAttribute('data-change','repair');for(let i=0;i<5;i++)await expect(ship.locator('.ship-damage-zone').nth(i)).toHaveCSS('opacity',String(strengths[i]));
 }
 await page.clock.runFor(900);await expect(ship).toHaveAttribute('data-change','idle');const before=await ship.locator('.ship-damage-zone').evaluateAll(els=>els.map(el=>el.getAttribute('style')));await page.getByRole('button',{name:'Rerender unchanged hull',exact:true}).click();expect(await ship.locator('.ship-damage-zone').evaluateAll(els=>els.map(el=>el.getAttribute('style')))).toEqual(before);await expect(ship).toHaveAttribute('data-change','idle');
 expect(downloads).toHaveLength(2);expect(new Set(downloads).size).toBe(2);expect(errors).toEqual([]);
});
test('presentation boundaries and reduced motion keep the ship readable without animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await launch(page);const ship=page.locator('.ship-damage-visual');
 for(const [hull,condition] of [[80,'minor'],[79,'light'],[60,'light'],[59,'moderate'],[40,'moderate'],[39,'heavy'],[20,'heavy'],[19,'critical'],[1,'critical']] as const){await page.getByLabel('Hull preview',{exact:true}).selectOption(String(hull));await expect(ship).toHaveAttribute('data-condition',condition);}
 await expect(ship.locator('.ship-critical-glow')).toHaveCSS('animation-name','none');await expect(ship.locator('.ship-damage-zone').first()).toHaveCSS('transition-duration','0s');await expect(ship.locator('.ship-change-glow')).toHaveCSS('animation-name','none');
 await page.getByLabel('Hull preview',{exact:true}).selectOption('100');await expect(ship).toHaveAttribute('data-condition','healthy');await expect(page.locator('.ship-condition')).toHaveText('Ship healthy');
});
