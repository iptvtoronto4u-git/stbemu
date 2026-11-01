/* Temporary, paired LAN transport for authorized Stalker requests. No stream proxy. */
'use strict';
const http=require('node:http'),https=require('node:https'),crypto=require('node:crypto');
const fs=require('node:fs');
const ACTIONS={handshake:['stb',[]],get_profile:['stb',[]],get_genres:['itv',[]],get_ordered_list:['itv',['genre','p','force_ch_link_check']],create_link:['itv',['cmd']]};
function validateRequest(input,config){
 if(!input||typeof input.url!=='string'||input.url.length>32768)throw Error('Invalid request');
 const url=new URL(input.url),allowed=new URL(config.upstream);
 if(url.origin!==allowed.origin||url.pathname!==allowed.pathname||url.username||url.password||url.hash)throw Error('Portal not allowed');
 const action=url.searchParams.get('action'),spec=ACTIONS[action];
 if(!spec||url.searchParams.get('type')!==spec[0]||url.searchParams.get('JsHttpRequest')!=='1-xml')throw Error('Operation not allowed');
 const keys=['type','action','JsHttpRequest',...spec[1]];
 for(const key of url.searchParams.keys())if(!keys.includes(key)||url.searchParams.getAll(key).length!==1)throw Error('Parameter not allowed');
 if(!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(input.mac||''))throw Error('Invalid MAC');
 if(input.token!==undefined&&input.token!==null&&!/^[A-Za-z0-9._~+\/-]{1,4096}={0,2}$/.test(input.token))throw Error('Invalid token');
 return {url,headers:{Accept:'application/json',Cookie:'mac='+encodeURIComponent(input.mac.toUpperCase())+'; stb_lang=en; timezone=America%2FToronto',...(input.token?{Authorization:'Bearer '+input.token}:{})}};
}
function upstreamRequest(request){
 return new Promise((resolve,reject)=>{
  const transport=request.url.protocol==='https:'?https:http;
  const req=transport.get(request.url,{headers:request.headers},res=>{
   let size=0,chunks=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>4*1024*1024){res.destroy();reject(Error('Upstream response too large'));}else chunks.push(chunk);});
   res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString('utf8')}));
   res.on('error',reject);
  });
  req.setTimeout(15000,()=>req.destroy(Error('Upstream timeout')));req.on('error',reject);
 });
}
function createServer(config,forward=upstreamRequest){
 if(!/^[a-f0-9]{64}$/.test(config.key||''))throw Error('A random 256-bit pairing key is required');
 const target=new URL(config.upstream);
 if(!['http:','https:'].includes(target.protocol)||target.username||target.password||target.search||target.hash)throw Error('Invalid upstream');
 return http.createServer(async(req,res)=>{
  const ip=(req.socket.remoteAddress||'').replace(/^::ffff:/,'');
  function reply(status,value){if(res.writableEnded)return;res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'300'});res.end(JSON.stringify(value));}
  if(!['127.0.0.1','::1',config.bindAddress,config.tvAddress].includes(ip)){reply(403,{error:'Device not paired'});req.resume();return;}
  if(req.url!=='/portal'){reply(404,{error:'Not found'});req.resume();return;}
  if(req.method==='OPTIONS'){reply(204,null);return;}
  const supplied=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+config.key);
  if(supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected)){reply(401,{error:'Pairing required'});req.resume();return;}
  if(req.method!=='POST'||!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){reply(400,{error:'JSON POST required'});req.resume();return;}
  let body='',size=0;
  req.setTimeout(10000,()=>req.destroy());
  req.on('data',chunk=>{size+=chunk.length;if(size>65536){reply(413,{error:'Request too large'});req.destroy();}else body+=chunk.toString('utf8');});
  req.on('error',()=>{});
  req.on('end',async()=>{
   if(res.writableEnded)return;
   let request;
   try{request=validateRequest(JSON.parse(body),config);}catch(_){reply(400,{error:'Unsupported portal request'});return;}
   try{reply(200,await forward(request));}catch(_){reply(502,{error:'Portal connection failed'});}
  });
 });
}
module.exports={createServer,validateRequest};
if(require.main===module){
 const config=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
 const server=createServer(config);
 server.on('error',()=>{process.stderr.write('Connection helper could not start.\n');process.exitCode=1;});
 server.listen(config.port,config.bindAddress,()=>process.stdout.write('IPTV TORONTO connection helper is running.\n'));
}
