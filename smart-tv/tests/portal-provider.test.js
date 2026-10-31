const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync('smart-tv/shared/portal-provider.js','utf8'),ctx);
const P=ctx.IPTVPortalProvider,profile={portal:'https://example.org/c/',mac:'00:1A:79:00:00:01'};
assert.throws(()=>new P(null));assert.throws(()=>new P({...profile,endpoint:'https://evil.test/portal.php'}));
let requests=[],answers=[],pending;
const p=new P(profile,{transport:(req,cb)=>{requests.push(req);const next=answers.shift();if(next==='pending'){pending=cb;return;}cb(null,{status:200,body:JSON.stringify({js:next})});}});
let error,result;function receive(e,r){error=e;result=r;}
p.listCategories(receive);assert.equal(error.code,'SESSION');
answers.push({token:'secret'},{});p.authenticate(receive);assert.equal(error,null);
assert.equal(requests[0].url.split('?')[0],'https://example.org/stalker_portal/server/load.php');assert.equal(requests[0].headers.Authorization,undefined);assert.match(requests[0].cookie,/mac=00%3A1A/);
assert.match(requests[1].url,/action=get_profile/);assert.equal(requests[1].headers.Authorization,'Bearer secret');
answers.push([{id:1,title:'News'}]);p.listCategories(receive);assert.equal(result[0].name,'News');assert.equal(requests[2].headers.Authorization,'Bearer secret');assert.ok(!requests[2].url.includes('secret'));
answers.push({data:[{id:2,name:'Channel',cmd:'ffrt http://localhost/ch/2'}],total_items:2,max_page_items:1});p.listChannels('1',1,receive);assert.equal(result.hasMore,true);const channel=result.channels[0];
answers.push({cmd:'ffmpeg https://stream.example/live.m3u8?key=private'});p.getPlaybackUrl(channel,receive);assert.equal(result,'https://stream.example/live.m3u8?key=private');assert.match(requests[4].url,/cmd=ffrt%20http/);
for(const cmd of ['javascript:alert(1)','ffmpeg http://localhost/ch/2','ffmpeg https://example.org/a extra']){answers.push({cmd});p.getPlaybackUrl(channel,receive);assert.equal(error.code,'STREAM');}
answers.push('pending');p.listCategories(receive);p.logout();pending(null,{status:200,body:'{"js":[]}'});assert.equal(error.code,'CANCELLED');assert.equal(p.token,null);
for(const [response,code] of [[{status:403,body:'secret'},'AUTH'],[{status:500,body:'secret'},'HTTP'],[{status:200,body:'<html>secret</html>'},'FORMAT'],[{status:200,body:'{"js":false}'},'PORTAL'],[{status:200,body:'{"js":{}}'},'AUTH']]){
 const bad=new P(profile,{transport:(_,cb)=>cb(null,response)});bad.authenticate(receive);assert.equal(error.code,code);assert.ok(!error.message.includes('secret'));
}
console.log('PASS: handshake, MAC cookie, bearer token, categories, pagination, link validation, session cancellation, sanitized failures');
// Defaults work for host-only portals and existing Stalker base paths.
for(const [portal,endpoint,expected] of [
 ['https://example.org',undefined,'https://example.org/stalker_portal/server/load.php'],
 ['https://example.org/stalker_portal/c/',undefined,'https://example.org/stalker_portal/server/load.php'],
 ['https://example.org/custom/',undefined,'https://example.org/custom/server/load.php'],
 ['https://example.org','portal.php','https://example.org/portal.php'],
 ['http://4k1.new4k.cc','portal.php','http://4k1.new4k.cc/stalker_portal/server/load.php'],
 ['http://4k1.new4k.cc/',undefined,'http://4k1.new4k.cc/stalker_portal/server/load.php']
])assert.equal(new P({...profile,portal,endpoint}).url,expected);
console.log('PASS: automatic Stalker defaults, base paths, custom overrides and legacy New4K profile');

// Authentication must initialize the profile before reporting success.
let initRequests=[],initPending,initComplete=false;
const init=new P(profile,{transport:(req,cb)=>{initRequests.push(req);if(initRequests.length===1)cb(null,{status:200,body:'{"js":{"token":"session"}}'});else initPending=cb;}});
init.authenticate(e=>{error=e;initComplete=true;});assert.equal(initComplete,false);assert.match(initRequests[1].url,/type=stb&action=get_profile/);assert.ok(!/stb_type|device_id|signature|image_version/.test(initRequests[1].url));
initPending(null,{status:200,body:'{"js":{}}'});assert.equal(initComplete,true);assert.equal(error,null);
const denied=new P(profile,{transport:(req,cb)=>cb(null,{status:200,body:req.url.includes('action=handshake')?'{"js":{"token":"session"}}':'Authorization failed.'})});
denied.authenticate(receive);assert.equal(error.code,'AUTH');assert.equal(denied.token,null);
const odd=new P(profile,{transport:(_,cb)=>cb(null,{status:200,body:'<html>private</html>'})});odd.authenticate(receive);assert.match(error.message,/sign-in/);assert.ok(!error.message.includes('private'));
console.log('PASS: account initialization, no firmware identity, setup failure and stage-specific errors');
// Paired TV transport sends only safe browser headers; upstream cookies stay in the helper.
const relayCalls=[];let relayFail=false;
ctx.IPTVRelayConfig={url:'http://192.168.1.2:18765/portal',key:'pair-key'};
ctx.XMLHttpRequest=function(){this.headers={};this.open=(method,url)=>{this.method=method;this.url=url;};this.setRequestHeader=(key,value)=>{this.headers[key]=value;};this.send=body=>{const request=JSON.parse(body);relayCalls.push({method:this.method,url:this.url,headers:this.headers,request});this.status=relayFail?401:200;this.responseText=JSON.stringify({status:200,body:JSON.stringify({js:request.url.includes('action=handshake')?{token:'upstream-token'}:{}})});this.onload();};};
const paired=new P(profile);paired.authenticate(receive);assert.equal(error,null);assert.equal(relayCalls.length,2);assert.equal(relayCalls[0].method,'POST');assert.equal(relayCalls[0].headers.Cookie,undefined);assert.equal(relayCalls[0].headers.Authorization,'Bearer pair-key');assert.equal(relayCalls[1].request.token,'upstream-token');assert.ok(!relayCalls[1].url.includes('upstream-token'));assert.equal(relayCalls[0].request.mac,profile.mac);
relayFail=true;paired.authenticate(receive);assert.equal(error.code,'RELAY');assert.equal(paired.token,null);
console.log('PASS: paired browser transport, upstream cookie isolation and helper authentication errors');
