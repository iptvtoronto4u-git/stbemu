'use strict';
const assert=require('node:assert/strict'),http=require('node:http');
const {createServer,validateRequest}=require('../relay/server.cjs');
const config={key:'a'.repeat(64),upstream:'http://provider.example/stalker_portal/server/load.php',tvAddress:'192.168.68.56'};
const input={url:config.upstream+'?type=stb&action=handshake&JsHttpRequest=1-xml',mac:'00:1A:79:00:00:01'};
function post(port,body,authorization='Bearer '+config.key,method='POST',route='/portal',localAddress){
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:'127.0.0.1',port,path:route,method,localAddress,headers:{Authorization:authorization,'Content-Type':'application/json'}},res=>{
   let data='';res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode,body:data,headers:res.headers}));
  });req.on('error',reject);req.end(JSON.stringify(body));
 });
}
(async()=>{
 const valid=validateRequest(input,config);assert.match(valid.headers.Cookie,/mac=00%3A1A/);assert.equal(valid.headers.Authorization,undefined);
 for(const patch of [{url:input.url.replace('provider.example','evil.example')},{url:input.url.replace('server/load.php','other.php')},{url:input.url+'&signature=x'},{url:input.url.replace('handshake','delete_user')},{mac:'bad'},{token:'bad\r\nheader'}])assert.throws(()=>validateRequest({...input,...patch},config));
 assert.throws(()=>createServer({...config,key:'weak'}));
 let forwards=0;const server=createServer(config,async request=>{forwards++;assert.match(request.headers.Cookie,/stb_lang=en/);return {status:200,body:'{"js":{"token":"upstream-session"}}'};});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 try{
  assert.equal((await post(port,input,'Bearer wrong')).status,401);assert.equal(forwards,0);
  if(process.platform!=='win32')assert.equal((await post(port,input,undefined,'POST','/portal','127.0.0.2')).status,403);
  assert.equal((await post(port,{...input,url:input.url.replace('provider.example','evil.example')})).status,400);assert.equal(forwards,0);
  assert.equal((await post(port,input,undefined,'POST','/other')).status,404);
  const preflight=await post(port,{},'', 'OPTIONS');assert.equal(preflight.status,204);assert.equal(preflight.headers['access-control-allow-origin'],'*');
  const success=await post(port,input);assert.equal(success.status,200);assert.equal(JSON.parse(success.body).status,200);assert.equal(forwards,1);assert.equal(success.headers['cache-control'],'no-store');
 }finally{await new Promise(resolve=>server.close(resolve));}
 console.log('PASS: paired helper authentication, upstream/action/header restrictions, CORS, forwarding and no-store');
})().catch(error=>{console.error(error);process.exitCode=1;});
