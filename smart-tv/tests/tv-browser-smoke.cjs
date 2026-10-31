/* TV-size Chromium smoke test. Not a Samsung Tizen emulator. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.TV_TEST_BROWSER_CHANNEL ? {channel:process.env.TV_TEST_BROWSER_CHANNEL} : {})});
 const page = await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(() => {
   window.XMLHttpRequest = class {
     open(method,url) { this.url=url; }
     setRequestHeader() {}
     send() {
       const action=new URL(this.url).searchParams.get('action');
       const js=action==='handshake'?{token:'mock-token'}:action==='get_genres'?[{id:'1',title:'News'}]:action==='get_ordered_list'?{data:[{id:'1',name:'Test channel',cmd:'test'}],total_items:1,max_page_items:1}:{cmd:'https://example.org/live.m3u8'};
       this.status=200;this.responseText=JSON.stringify({js});setTimeout(()=>this.onload(),0);
     }
   };
 });
 await page.goto('file://' + path.resolve('smart-tv/shared/index.html'));
 await page.getByRole('button',{name:/Add portal profile/}).waitFor();
 await page.keyboard.press('Enter');
 await page.locator('#editor:not([hidden])').waitFor();
 // Fields stay read-only while navigating; OK enters editing and IME Done exits it.
 for (const [key, id] of [['ArrowDown','portal'],['ArrowDown','endpoint'],['ArrowDown','mac'],['ArrowUp','endpoint'],['ArrowUp','portal'],['ArrowUp','name']]) {
   await page.keyboard.press(key);
   assert.equal(await page.evaluate(()=>document.activeElement.id),id);
   assert.equal(await page.locator('#'+id).evaluate(el=>el.readOnly),true);
 }
 await page.keyboard.press('Enter');
 assert.equal(await page.locator('#name').evaluate(el=>el.readOnly),false);
 await page.locator('#name').fill('Living room');
 await page.keyboard.press('ArrowLeft');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'name');
 await page.locator('#name').dispatchEvent('keydown',{keyCode:65376});
 assert.equal(await page.locator('#name').evaluate(el=>el.readOnly),true);
 await page.keyboard.press('ArrowDown');
 await page.keyboard.press('Enter');
 await page.locator('#portal').fill('https://example.org/portal');
 await page.locator('#portal').dispatchEvent('keydown',{keyCode:65385});
 assert.equal(await page.evaluate(()=>document.activeElement.id),'portal');
 assert.equal(await page.locator('#portal').evaluate(el=>el.readOnly),true);
 await page.keyboard.press('ArrowDown');
 await page.keyboard.press('ArrowDown');
 await page.keyboard.press('Enter');
 await page.locator('#mac').fill('00:1A:79:AA:BB:CC');
 await page.locator('#mac').dispatchEvent('keydown',{keyCode:10009});
 assert.equal(await page.locator('#editor').evaluate(el=>el.hidden),false);
 assert.equal(await page.locator('#mac').evaluate(el=>el.readOnly),true);
 await page.keyboard.press('ArrowDown');
 assert.equal(await page.evaluate(()=>document.activeElement.type),'submit');
 await page.getByRole('button',{name:'Save profile'}).click();
 await page.getByRole('button',{name:/Connect: Living room/}).click();
 await page.locator('#browser:not([hidden])').waitFor();
 await page.getByRole('button',{name:'News',exact:true}).click();
 await page.getByRole('button',{name:'Test channel',exact:true}).click();
 await page.locator('#live-status').getByText(/AVPlay could not prepare/).waitFor();
 assert.equal(await page.evaluate(()=>localStorage.getItem('iptvtoronto.profiles.v1').includes('mock-token')),false);
 await page.getByRole('button',{name:'Disconnect',exact:true}).click();
 await page.reload();
 await page.getByRole('button',{name:/Connect: Living room/}).waitFor();
 await page.getByRole('button',{name:/Living room/}).first().click();
 await page.locator('#editor:not([hidden])').waitFor();
 await page.keyboard.press('Escape');
 await page.locator('#home:not([hidden])').waitFor();
 await page.screenshot({path:'dist/tv-1920x1080-smoke.png',fullPage:true});
 assert.deepEqual(errors,[],'No uncaught browser errors');
 console.log('PASS: field navigation, OK editing, IME Done/Cancel/Back, button navigation, save/reload/edit, Escape');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});



