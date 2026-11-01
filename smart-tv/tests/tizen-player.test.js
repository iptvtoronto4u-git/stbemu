const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync('smart-tv/shared/tizen-player.js','utf8'),ctx);
const calls=[];
const avplay={open:u=>calls.push(['open',u]),setDisplayRect:(...x)=>calls.push(['rect',...x]),prepareAsync:ok=>ok(),play:()=>calls.push('play'),pause:()=>calls.push('pause'),stop:()=>calls.push('stop'),close:()=>calls.push('close')};
const p=new ctx.IPTVTizenPlayer(avplay);
assert.equal(p.supported(),true);
let ready=false;p.open('https://example.com/authorized.m3u8',()=>ready=true,e=>{throw e});
assert.equal(ready,true);assert.equal(p.state,'READY');assert.equal(p.play(),true);assert.equal(p.pause(),true);assert.equal(p.play(),true);assert.equal(p.stop(),true);assert.equal(p.state,'IDLE');
let bad;p.open('javascript:alert(1)',()=>{},e=>bad=e);assert.match(bad.message,/HTTP/);
const missing=new ctx.IPTVTizenPlayer(null);let err;missing.open('https://example.com/live',()=>{},e=>err=e);assert.ok(err);
console.log('PASS: AVPlay availability, URL validation, prepare/play/pause/stop lifecycle');
// Late native callbacks must not resurrect stopped or superseded playback.
let prepares=[];const delayed={...avplay,prepareAsync:(ok,err)=>prepares.push([ok,err])};
const d=new ctx.IPTVTizenPlayer(delayed);let callbacks=0;
d.open('https://example.org/one',()=>callbacks++,()=>callbacks++);d.stop();prepares[0][0]();assert.equal(callbacks,0);assert.equal(d.state,'IDLE');
d.open('https://example.org/two',()=>callbacks++,()=>callbacks++);d.open('https://example.org/three',()=>callbacks++,()=>callbacks++);prepares[1][0]();assert.equal(callbacks,0);prepares[2][0]();assert.equal(callbacks,1);
// Subtitles require explicit selection and cannot leak across streams or stop.
let listener,subtitle='';const silent=[];
const captions=new ctx.IPTVTizenPlayer({...avplay,setListener:value=>listener=value,setSilentSubtitle:value=>silent.push(value),setSelectTrack:()=>{}});
captions.onSubtitle=(_,text)=>subtitle=text;
captions.open('https://example.org/captions',()=>{},e=>{throw e;});captions.play();
listener.onsubtitlechange(1000,'Hidden by default');assert.equal(subtitle,'');assert.ok(silent.every(Boolean));
captions.selectTrack('TEXT',0);listener.onsubtitlechange(1000,'Selected captions');assert.equal(subtitle,'Selected captions');
captions.subtitles(false);assert.equal(subtitle,'');listener.onsubtitlechange(1000,'Late caption');assert.equal(subtitle,'');
captions.subtitles(true);listener.onsubtitlechange(1000,'Old channel');captions.open('https://example.org/next',()=>{},e=>{throw e;});assert.equal(subtitle,'');assert.equal(captions.subtitlesEnabled,false);
captions.subtitles(true);listener.onsubtitlechange(1000,'Stopped channel');captions.stop();assert.equal(subtitle,'');listener.onsubtitlechange(1000,'Late stopped caption');assert.equal(subtitle,'');
console.log('PASS: subtitles off by default, explicit selection, clearing and stale callback suppression');
