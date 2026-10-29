import {test,expect,type Page} from '@playwright/test';
import {generateMissionCircuits} from '../src/engine/puzzles';
async function begin(page:Page,query=''){
 await page.clock.install();await page.goto('/tests/fixtures/real.html'+query);
 await page.getByRole('button',{name:"Let's Fly!"}).click();
  await page.getByRole("button", {name:"Continue solo", exact:true}).click();
  await page.getByRole("button", {name:"Play mode", exact:true}).click();await page.getByRole('button',{name:'Begin Mission'}).click();
}
async function setup(page:Page){await page.locator('.starting-option').last().click();await expect(page.locator('.setup-dialog')).toHaveCount(0);}
async function human(page:Page){for(let i=0;i<10;i++){if((await page.locator('.turn-pill').innerText()).includes("Sam's"))return;await page.clock.runFor(1500);}}
test('real setup: one-tap choice, Captain first turn, markers and accessible explanations',async({page},info)=>{
 await begin(page,'?captain=1');
 await expect(page.locator('.rack-nova .captain-badge')).toHaveCount(1);
 await expect(page.locator('.rack-sam .wire-tile').first()).toBeDisabled();
 await expect(page.locator('.starting-option').first()).toBeEnabled();
 await page.clock.runFor(10000);await expect(page.getByText('5:00',{exact:true})).toBeVisible();
 await page.locator('.starting-option').first().click();await expect(page.locator('dialog[open]')).toHaveCount(0);
 await expect(page.locator('.information-marker')).toHaveCount(3);await expect(page.locator('.turn-pill')).toContainText("Nova's");
 await expect(page.locator('.rack-sam [data-slot="sam-0"] .information-marker')).toHaveCount(1);
 const badge=page.locator('.rack-nova .captain-badge');if(info.project.name==='desktop')await badge.hover();else await badge.tap();
 await expect(page.getByRole('tooltip')).toContainText('Leads the crew');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Settings',exact:true}).focus();await badge.focus();await expect(page.getByRole('tooltip')).toBeVisible();await page.keyboard.press('Escape');
 await human(page);await expect(page.locator('.rack-nova .captain-badge')).toHaveCount(1);
 const power=page.getByRole('button',{name:'Sam: Twin Signal information',exact:true});await power.focus();await expect(page.getByRole('tooltip')).toContainText('Two hidden circuits in one teammate hand');await page.keyboard.press('Escape');
 await page.screenshot({path:`docs/previews/${info.project.name}-real-crew.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('real personal power: same-room selection, cancel, modal focus, single execution and hidden unchosen target',async({page})=>{
 await page.emulateMedia({reducedMotion: 'reduce'});
 await begin(page);await setup(page);
 await expect(page.locator('.captain-badge')).toHaveCSS('animation-name','none');
 const use=page.locator('.rack-sam').getByRole('button',{name:'Use power',exact:true});await use.click();
 let modal=page.getByRole('dialog',{name:'Twin Signal',exact:true});
 await expect(modal.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled();
 await modal.getByLabel('Sam circuit',{exact:true}).selectOption('sam-0');
 await modal.getByLabel('Hidden crew circuit 1',{exact:true}).selectOption('pip-0');
 await modal.getByLabel('Hidden crew circuit 2',{exact:true}).selectOption('nova-1');
 await expect(modal.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled();
 await modal.getByLabel('Hidden crew circuit 2',{exact:true}).selectOption('pip-1');
 await page.keyboard.press('Escape');await expect(page.locator('.rack-sam .personal-power')).toContainText('1 left');await expect(use).toBeFocused();
 await use.click();await modal.getByLabel('Sam circuit',{exact:true}).selectOption('sam-0');await modal.getByLabel('Hidden crew circuit 1',{exact:true}).selectOption('pip-0');await modal.getByLabel('Hidden crew circuit 2',{exact:true}).selectOption('pip-1');
 await expect(modal).toHaveJSProperty('open',true);expect(await modal.evaluate(e=>e.matches(':modal'))).toBe(true);
 await modal.getByRole('button',{name:'Confirm',exact:true}).dblclick();await expect(modal).toHaveCount(0);
 await expect(page.locator('.rack-sam .personal-power')).toContainText('Used');await expect(page.locator('[data-slot="sam-0"]')).toHaveClass(/cleared/);await expect(page.locator('[data-slot="pip-0"]')).toHaveClass(/cleared/);await expect(page.locator('[data-slot="pip-1"] strong')).toHaveText('?');await expect(page.getByText('100%',{exact:true})).toBeVisible();
});
test('real shared equipment: unlock through Self-Connection, any-turn modal survives AI delay, cancel and one-use exhaustion',async({page})=>{
 await begin(page,'?equipment=1');await setup(page);
 await expect(page.locator('.equipment-locked')).toHaveCount(3);
 await page.locator('[data-slot="sam-2"]').click();await page.getByRole('button',{name:'Self-Connection',exact:true}).click();
 await expect(page.locator('dialog[open]')).toHaveCount(0);
 await expect(page.locator('.equipment-ready')).toHaveCount(3);await expect(page.locator('.turn-pill')).toContainText("Nova's");
 const probe=page.locator('.equipment-card').filter({has:page.getByRole('heading',{name:'Pulse Probe',exact:true})});await probe.getByRole('button',{name:'Use equipment',exact:true}).click();
 let modal=page.getByRole('dialog',{name:'Pulse Probe',exact:true});await modal.getByLabel('Hidden crew circuit',{exact:true}).selectOption('nova-0');await modal.getByLabel('Threshold',{exact:true}).selectOption('6');
 await page.clock.runFor(3000);await expect(modal).toBeVisible();await expect(page.locator('.turn-pill')).toContainText("Nova's");await page.keyboard.press('Escape');await expect(probe).toHaveClass(/equipment-ready/);
 await probe.getByRole('button',{name:'Use equipment',exact:true}).click();await modal.getByLabel('Hidden crew circuit',{exact:true}).selectOption('nova-0');await modal.getByLabel('Threshold',{exact:true}).selectOption('6');await modal.getByRole('button',{name:'Confirm',exact:true}).dblclick();await expect(probe).toHaveClass(/equipment-used/);await expect(page.locator('[data-slot="nova-0"] strong')).toHaveText('?');await expect(page.locator('[data-slot="nova-0"] .scanner-result')).toContainText('below 6');
 for(const name of ['Hull Buffer','Logic Relay']){const card=page.locator('.equipment-card').filter({has:page.getByRole('heading',{name,exact:true})});await card.getByRole('button',{name:'Use equipment',exact:true}).click();const dialog=page.getByRole('dialog',{name,exact:true});await dialog.getByRole('button',{name:'Confirm',exact:true}).dblclick();await expect(card).toHaveClass(/equipment-used/);}
 await expect(page.locator('.equipment-used')).toHaveCount(3);await expect(page.locator('.rack-sam .personal-power')).toContainText('1 left');
});
test('real Isolate Overload: engine eligibility, all own reds previewed, free cancel and safe power-down',async({page})=>{
 await begin(page,'?safe=1');await setup(page);
 await expect(page.getByRole('button',{name:'Isolate Overload',exact:true})).toBeDisabled();
 const truth=generateMissionCircuits(1,2,4,1,{yellowPositions:[],redPositions:[1.25,1.75],redInstantFailure:true,redSafeRule:'after-other-circuits',showCandidates:true});
 for(let i=0;i<8;i++){
  await human(page);
  const blue=await page.locator('.rack-sam .wire-tile.circuit-blue:not(.cleared)').all();if(!blue.length)break;
  const ownId=(await blue[0].getAttribute('data-slot'))!,value=truth.find(t=>t.id===ownId)!.value;
  const active=new Set(await page.locator('.rack-nova .wire-tile:not(.cleared),.rack-pip .wire-tile:not(.cleared)').evaluateAll(els=>els.map(e=>e.getAttribute('data-slot'))));
  const target=truth.find(t=>active.has(t.id)&&t.kind==='blue'&&t.value===value)!;
  await blue[0].click();await page.locator(`[data-slot="${target.id}"]`).click();await page.clock.runFor(3100);
 }
 await human(page);const isolate=page.getByRole('button',{name:'Isolate Overload',exact:true});await expect(isolate).toBeEnabled();await isolate.click();const modal=page.getByRole('dialog',{name:'Isolate Overload',exact:true});await expect(modal).toContainText('Sam, slot 2');await expect(modal).toContainText('Sam, slot 3');await page.keyboard.press('Escape');await expect(page.locator('.rack-sam .circuit-red.cleared')).toHaveCount(0);await isolate.click();await modal.getByRole('button',{name:'Confirm',exact:true}).dblclick();await expect(page.locator('.rack-sam .circuit-red.cleared')).toHaveCount(2);await expect(page.getByText('100%',{exact:true})).toBeVisible();
 await expect(page.locator('.wire-isolate')).toHaveCount(2);
});
