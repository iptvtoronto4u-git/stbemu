const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx={};vm.runInNewContext(fs.readFileSync('smart-tv/shared/portal-diagnostics.js','utf8'),ctx);
let result;ctx.IPTVPortalDiagnostics.diagnose('not-a-url',r=>result=r);assert.equal(result.code,'INVALID_URL');
let sent=false;const xhr={status:200,readyState:4,open(method,url){assert.equal(method,'GET');assert.equal(url,'http://example.com');},send(){sent=true;this.onreadystatechange();}};
ctx.IPTVPortalDiagnostics.diagnose('http://example.com',r=>result=r,()=>xhr);assert.equal(sent,true);assert.equal(result.code,'REACHABLE');
const blocked={open(){throw Error('blocked')}};
ctx.IPTVPortalDiagnostics.diagnose('https://example.com',r=>result=r,()=>blocked);assert.equal(result.code,'REQUEST_BLOCKED');
console.log('PASS: read-only portal diagnostics validation, response, and blocked request');
