const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync('smart-tv/shared/portal-provider.js','utf8'),ctx);
const P=ctx.IPTVPortalProvider,profile={portal:'https://example.org/c/',mac:'00:1A:79:00:00:01'};
assert.throws(()=>new P(null));assert.throws(()=>new P({...profile,endpoint:'https://evil.test/portal.php'}));
let requests=[],answers=[],pending;
const p=new P(profile,{transport:(req,cb)=>{requests.push(req);const next=answers.shift();if(next==='pending'){pending=cb;return;}cb(null,{status:200,body:JSON.stringify({js:next})});}});
let error,result;function receive(e,r){error=e;result=r;}
p.listCategories(receive);assert.equal(error.code,'SESSION');
answers.push({token:'secret'});p.authenticate(receive);assert.equal(error,null);
assert.equal(requests[0].url.split('?')[0],'https://example.org/stalker_portal/server/load.php');assert.equal(requests[0].headers.Authorization,undefined);assert.match(requests[0].cookie,/mac=00%3A1A/);
answers.push([{id:1,title:'News'}]);p.listCategories(receive);assert.equal(result[0].name,'News');assert.equal(requests[1].headers.Authorization,'Bearer secret');assert.ok(!requests[1].url.includes('secret'));
answers.push({data:[{id:2,name:'Channel',cmd:'ffrt http://localhost/ch/2'}],total_items:2,max_page_items:1});p.listChannels('1',1,receive);assert.equal(result.hasMore,true);const channel=result.channels[0];
answers.push({cmd:'ffmpeg https://stream.example/live.m3u8?key=private'});p.getPlaybackUrl(channel,receive);assert.equal(result,'https://stream.example/live.m3u8?key=private');assert.match(requests[3].url,/cmd=ffrt%20http/);
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
