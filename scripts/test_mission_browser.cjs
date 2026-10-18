// Author: Sandeep Belgavi. Run with PLAYWRIGHT_MODULE and LAB_BASE_URL when needed.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
(async()=>{
 const browser=await chromium.launch({channel:process.env.CI?undefined:'chrome',headless:true});
 const context=await browser.newContext({acceptDownloads:true});
 let analyticsRequests=0;await context.route('https://www.googletagmanager.com/**',route=>{analyticsRequests++;return route.fulfill({contentType:'text/javascript',body:'/* Stub: no production analytics in tests. */'});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=(process.env.LAB_BASE_URL||'http://127.0.0.1:9194')+'/mcp/labs.html';
 await page.goto(url);assert.equal(analyticsRequests,0);
 const complete=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('aicassindra.missions.v1')).completed.length);
 const fixtures={
 architecture:[{steps:['identity','budget','minimize','model','validate','approval','action','audit','deliver']},{steps:['identity','budget','minimize','model','validate','action','approval','audit','deliver']},{steps:[]}],
 contract:[{choice:'proceed',probabilities:{proceed:.9,review:.08,block:.02}},{choice:'proceed',probabilities:{proceed:.8,review:.18,block:.02}},{choice:'review',probabilities:{proceed:.9,review:.08,block:.02}}],
 minimizer:[{order_status:'Delivered',refund_rule:'review',extra:'SYNTHETIC-PRIVATE-MARKER'},{order_status:'Delivered'},{order_status:'FAKE-SECRET',refund_rule:'review'}],
 budget:[{remaining:2,requests:[{authorized:false,providerFails:false},{authorized:true,providerFails:true},{authorized:true,providerFails:false},{authorized:true,providerFails:false}]},{remaining:0,requests:[{authorized:true,providerFails:false}]},{remaining:-1,requests:[]}],
 partition:[{table:'demo.events',partition:{tenant_id:'demo'},columns:['status'],limit:20},{table:'system.local'},{table:'demo.events',partition:{tenant_id:'demo'},columns:['status'],limit:101}]
 };
 const expected={architecture:['ORDER_ACCEPTED','UNSAFE_ORDER','INVALID_INPUT'],contract:['AWAITING_APPROVAL','NEEDS_REVIEW','INVALID_OUTPUT'],minimizer:['MINIMIZED','MISSING_EVIDENCE','MINIMIZED'],budget:['SIMULATED','SIMULATED','INVALID_INPUT'],partition:['QUERY_PLAN_ONLY','DENIED','INVALID_INPUT']};
 const arch=page.locator('#architecture');await arch.locator('textarea').fill(JSON.stringify(fixtures.architecture[0]));await arch.locator('[data-run]').click();assert.equal(await complete(),0,'A run without a correct prediction cannot complete a checkpoint');
 for(const [id,cases] of Object.entries(fixtures))for(let n=0;n<3;n++){
  const section=page.locator('#'+id);await section.locator('[data-level]').selectOption(String(n));await section.locator('textarea').fill(JSON.stringify(cases[n]));await section.locator('[data-prediction]').selectOption(expected[id][n]);await section.locator('[data-run]').click();assert.equal(await section.locator('[data-status]').textContent(),expected[id][n]);assert.match(await section.locator('[data-checkpoint]').textContent(),/Checkpoint complete/);
 }
 assert.equal(await complete(),15);await page.locator('#partition [data-run]').click();assert.equal(await complete(),15);
 let downloadPromise=page.waitForEvent('download');await page.locator('#partition [data-artifact]').click();let download=await downloadPromise;let artifact=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(artifact.input.limit,101);assert.equal(artifact.author,'Sandeep Belgavi');
 await page.reload();assert.equal(await complete(),15);assert.match(await page.locator('#progress-summary').textContent(),/All 15/);assert.equal(JSON.parse(await page.locator('#partition textarea').inputValue()).limit,101);
 downloadPromise=page.waitForEvent('download');await page.locator('#export-progress').click();download=await downloadPromise;artifact=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(artifact.completed.length,15);assert.ok(!('drafts' in artifact));assert.ok(!JSON.stringify(artifact).includes('SYNTHETIC-PRIVATE-MARKER'));
 await page.locator('#share-metrics').check();await page.waitForFunction(()=>document.querySelector('[data-mission-analytics]'));await page.locator('#minimizer [data-run]').click();
 const payloads=await page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));assert.ok(payloads.some(x=>x[1]==='mission_analytics_opt_in'));assert.ok(!JSON.stringify(payloads).includes('FAKE-SECRET'));
 await page.locator('#share-metrics').uncheck();const before=await page.evaluate(()=>window.dataLayer.length);await page.locator('#minimizer [data-run]').click();assert.equal(await page.evaluate(()=>window.dataLayer.length),before);
 await page.evaluate(()=>{const state=JSON.parse(localStorage.getItem('aicassindra.missions.v1'));state.lastVisit='2026-01-01';state.completed=state.completed.filter(x=>x!=='contract:1');localStorage.setItem('aicassindra.missions.v1',JSON.stringify(state));});await page.reload();assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('aicassindra.missions.v1')).events.some(x=>x.event==='mission_return_visit')));await page.locator('#resume-mission').click();assert.equal(await page.locator('#contract [data-level]').inputValue(),'1');
 await page.locator('#partition [data-level]').selectOption('2');await page.locator('#partition textarea').fill('null');await page.locator('#partition [data-prediction]').selectOption('INVALID_INPUT');await page.locator('#partition [data-run]').click();assert.doesNotMatch(await page.locator('#partition [data-checkpoint]').textContent(),/^Checkpoint complete/);
 page.on('dialog',d=>d.accept());await page.locator('#clear-progress').click();assert.equal(await complete(),0);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#mission-dashboard').screenshot({path:require('node:path').join(require('node:os').tmpdir(),'mission-dashboard-mobile.png')});
 const blocked=await context.newPage();await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});await blocked.goto(url);assert.match(await blocked.locator('#storage-status').textContent(),/unavailable/);await blocked.locator('#architecture [data-run]').click();assert.equal(await blocked.locator('#architecture [data-status]').textContent(),'UNSAFE_ORDER');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: 15 checkpoints, prediction gate, reload, deduplication, artifacts, report, opt-in/out, return visit, resume, null input, clear, mobile, blocked storage.');
})().catch(e=>{console.error(e);process.exit(1)});
