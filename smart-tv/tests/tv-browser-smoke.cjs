/* TV-size Chromium smoke test. Not a Samsung Tizen emulator. */
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path'),fs=require('node:fs'),http=require('node:http');
(async () => {
 const shared=path.resolve('smart-tv/shared');
 const server=http.createServer((request,response)=>{const pathname=new URL(request.url,'http://localhost').pathname;const target=path.resolve(shared,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));if(!target.startsWith(shared+path.sep)){response.writeHead(403);response.end();return;}fs.readFile(target,(error,data)=>{if(error){response.writeHead(404);response.end();return;}const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm','.woff2':'font/woff2'}[path.extname(target)]||'application/octet-stream';response.writeHead(200,{'Content-Type':mime});response.end(data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser = await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.TV_TEST_BROWSER_CHANNEL ? {channel:process.env.TV_TEST_BROWSER_CHANNEL} : {})});
 const page = await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(() => {
   window.failHandshake=new URL(location.href).searchParams.has('offline');
   window.webapis={avplay:{open(){},setDisplayRect(x,y,width,height){window.lastVideoRect={x,y,width,height};},setListener(value){window.playerListeners=value;},getCurrentTime(){return window.testPosition||0;},getDuration(){return 600000;},seekTo(value){window.testPosition=value;},getTotalTrackInfo(){return [{type:'AUDIO',index:0}];},setSelectTrack(){},setSilentSubtitle(){},setDisplayMethod(){},prepareAsync(ok,error){setTimeout(()=>window.failPrepare?error():ok(),10);},play(){},pause(){},stop(){},close(){}}};
   window.XMLHttpRequest = class {
     open(method,url) { this.url=url; }
     setRequestHeader() {}
     send() {
       const request=new URL(this.url);
       if(request.pathname !== '/stalker_portal/server/load.php') throw new Error('Incorrect default endpoint');
       const action=request.searchParams.get('action');
       if(action==='handshake' && window.failHandshake) { this.status=403;this.responseText='';setTimeout(()=>this.onload(),40);return; }
       const type=request.searchParams.get('type');
       const channels=[{id:'1',number:'1000',name:'Test channel',cmd:'test'},...['City News','Weather Network','World News','Documentaries','Live Sports','Movies','Arts & Culture','Family','Music','Travel','Business','Local TV'].map((name,i)=>({id:String(i+2),number:String(1002+i*2),name,cmd:'test'}))];
       let js={};
       if(action==='handshake')js={token:'mock-token'};
       else if(action==='get_genres')js=[{id:'1',title:'News'}];
       else if(action==='get_categories')js=[{id:'1',title:'Featured'}];
       else if(action==='get_ordered_list' && type==='vod')js={data:[{id:'m1',name:'Test film',description:'A film supplied by the test fixture.',cmd:'movie'}],total_items:1,max_page_items:1};
       else if(action==='get_ordered_list' && type==='series')js={data:[{id:'s1',name:'Test series',description:'A series supplied by the test fixture.',cmd:'episode',series:[1,2]}],total_items:1,max_page_items:1};
       else if(action==='get_ordered_list')js={data:channels,total_items:13,max_page_items:13};
       else if(action==='get_all_channels')js={data:Array.from({length:5000},(_,i)=>({id:String(i+1),number:String(i+1000),name:i===0?'Test channel':'Channel '+(i+1),cmd:'test'}))};
       else if(action==='get_short_epg')js=[{time:'12:00',name:'Current programme'},{time:'12:30',name:'Next programme'}];
       else if(action==='get_simple_data_table')js=[{ch_id:'1',name:'Current programme',start_timestamp:Math.floor(Date.now()/1000)-600,stop_timestamp:Math.floor(Date.now()/1000)+1200}];
       else if(action==='get_main_info')js={tariff_plan:'Test account',end_date:'2030-01-01'};
       else if(action==='get_fav_ids')js=[];
       else if(action==='create_link')js={cmd:'https://example.org/live.m3u8'};
       this.status=200;this.responseText=JSON.stringify({js});setTimeout(()=>this.onload(),40);
     }
   };
 });
 const base='http://127.0.0.1:'+server.address().port;
 await page.goto(base+'/');
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('#setup:not([hidden])').waitFor();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'name');
 for(const [key,id] of [['ArrowDown','portal'],['ArrowDown','mac'],['ArrowUp','portal'],['ArrowUp','name']]){await page.keyboard.press(key);assert.equal(await page.evaluate(()=>document.activeElement.id),id);assert.equal(await page.locator('#'+id).evaluate(el=>el.readOnly),true);}
 for(const [id,value] of [['name','Living room'],['portal','https://example.org'],['mac','00:1A:79:AA:BB:CC']]){await page.locator('#'+id).focus();await page.keyboard.press('Enter');await page.locator('#'+id).fill(value);await page.locator('#'+id).dispatchEvent('keydown',{keyCode:65376});}
 await page.screenshot({path:'dist/tv-portal-setup.png',fullPage:true});
 await page.getByRole('button',{name:'Save and open Live TV'}).click();
 await page.locator('#startup:not([hidden])').waitFor();
 await page.locator('#browser:not([hidden])').waitFor();
 await page.getByRole('button',{name:'Test channel',exact:true}).waitFor();
 await page.locator('#programme-list').getByText('Current programme',{exact:true}).waitFor();
 await page.screenshot({path:'dist/tv-live-channels.png',fullPage:true});
 await page.getByRole('button',{name:'Test channel',exact:true}).click();await page.locator('body.watching').waitFor();
 await page.locator('#view').click();await page.locator('body.fullscreen').waitFor();
 assert.deepEqual(await page.evaluate(()=>window.lastVideoRect),{x:0,y:0,width:1920,height:1080});
 await page.keyboard.press('Escape');assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('fullscreen')),false);
 await page.locator('#favorite').click();assert.equal(await page.locator('.favorite-mark').filter({hasText:'★'}).count(),1);
 await page.locator('#sort').click();await page.locator('#stop').click();
 await page.locator('.live-header .app-navigation').getByRole('button',{name:'Movies',exact:true}).click();
 await page.locator('#feature-screen').getByRole('button',{name:'Featured',exact:true}).click();
 await page.locator('.poster-card').getByText('Test film',{exact:true}).click();
 await page.locator('#feature-screen').getByRole('button',{name:'Play',exact:true}).click();await page.locator('body.fullscreen').waitFor();await page.keyboard.press('Escape');
 await page.locator('.live-header .app-navigation').getByRole('button',{name:'Series',exact:true}).click();
 await page.locator('#feature-screen').getByRole('button',{name:'Featured',exact:true}).click();
 await page.locator('.poster-card').getByText('Test series',{exact:true}).click();await page.getByRole('button',{name:'Seasons and episodes',exact:true}).click();await page.getByRole('button',{name:'Episode 1',exact:true}).click();
 await page.locator('#feature-screen').getByRole('button',{name:'Play',exact:true}).click();await page.locator('body.fullscreen').waitFor();await page.evaluate(()=>window.playerListeners.onstreamcompleted());await page.waitForFunction(()=>document.getElementById('preview-title').textContent.includes('Episode 2'));await page.keyboard.press('Escape');
 await page.locator('.live-header .app-navigation').getByRole('button',{name:'Home',exact:true}).click();await page.locator('.home-hero').waitFor();await page.screenshot({path:'dist/tv-home.png',fullPage:true});await page.locator('#feature-screen .app-navigation').getByRole('button',{name:'Live TV',exact:true}).click();
 await page.locator('.live-header .app-navigation').getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Portal and account',exact:true}).click();await page.locator('#feature-screen').getByText('tariff_plan: Test account',{exact:true}).waitFor();await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 // A working saved profile skips setup on the next launch.
 await page.reload();await page.locator('#browser:not([hidden])').waitFor();await page.getByRole('button',{name:'Test channel',exact:true}).waitFor();assert.equal(await page.locator('#setup').evaluate(el=>el.hidden),true);
 // Selecting, updating, duplicating and deleting stay in the same unified form.
 await page.locator('.live-header .profile-chip').click();await page.locator('#setup:not([hidden])').waitFor();assert.equal(await page.locator('#name').inputValue(),'Living room');
 await page.locator('#duplicate').click();assert.equal(await page.locator('#profiles .tile').count(),2);assert.equal(await page.locator('#name').inputValue(),'Living room copy');
 page.once('dialog',dialog=>dialog.accept());await page.locator('#remove').click();assert.equal(await page.locator('#profiles .tile').count(),1);
 await page.locator('#profiles .tile').first().click();await page.locator('#name').click();await page.locator('#name').fill('Living room revised');await page.locator('#name').dispatchEvent('keydown',{keyCode:65376});await page.getByRole('button',{name:'Save and open Live TV'}).click();await page.locator('#browser:not([hidden])').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('iptvtoronto.profiles.v1')).length),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('iptvtoronto.profiles.v1').includes('mock-token')),false);
 // Failed startup automatically returns to that same editable form, preserving details.
 await page.goto(base+'/?offline=1');await page.locator('#setup:not([hidden])').waitFor();await page.locator('#setup-error').getByText(/Portal rejected access/).waitFor();assert.equal(await page.locator('#name').inputValue(),'Living room revised');assert.equal(await page.locator('#portal').inputValue(),'https://example.org');
 await page.screenshot({path:'dist/tv-startup-error.png',fullPage:true});assert.deepEqual(errors,[],'No uncaught browser errors');
 console.log('PASS: unified inline profiles, saved-profile auto startup/progress/failure, live preview/fullscreen, favorites/sorting, movies, series/next episode, home, account settings and safe persistence');
 await browser.close();await new Promise(resolve=>server.close(resolve));
})().catch(error=>{console.error(error);process.exit(1)});
