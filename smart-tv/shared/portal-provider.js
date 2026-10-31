/* Authorized Stalker subset. No firmware, serial, signature or device-ID emulation. */
(function(root){
 'use strict';
 function fail(code,message){return {code:code,message:message};}
 function Provider(profile,options){
  options=options||{};
  if(!profile||!/^https?:\/\/[^\s/@?#]+(?:\/[^?#\s]*)?$/i.test(profile.portal||'')||!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(profile.mac||''))throw new Error('A valid portal profile is required');
  var base=profile.portal.replace(/\/(?:c\/?)?$/,'');
  var endpoint=profile.endpoint;
  // Correct the old New4K root default while preserving other custom endpoints.
  if(/^https?:\/\/4k1\.new4k\.cc(?::\d+)?$/i.test(base) && endpoint==='portal.php')endpoint=null;
  if(!endpoint)endpoint=/^https?:\/\/[^/]+$/i.test(base)?'stalker_portal/server/load.php':'server/load.php';
  if(!/^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.php$/i.test(endpoint))throw new Error('Use a relative API path such as portal.php or server/load.php');
  this.url=base+'/'+endpoint;
  this.mac=profile.mac.toUpperCase();this.token=null;this.generation=0;
  this.transport=options.transport||xhrTransport;
 }
 function xhrTransport(request,callback){
  var xhr=new XMLHttpRequest(),done=false;
  function finish(error,value){if(done)return;done=true;callback(error,value);}
  try{
   xhr.open('GET',request.url,true);xhr.timeout=15000;
   Object.keys(request.headers).forEach(function(key){xhr.setRequestHeader(key,request.headers[key]);});
   // Browser engines prohibit setting Cookie headers. Cookie transport must be
   // explicitly supported by the TV runtime; never pretend the MAC was sent.
   xhr.setRequestHeader('Cookie',request.cookie);
   xhr.withCredentials=true;
   xhr.onload=function(){finish(null,{status:xhr.status,body:xhr.responseText});};
   xhr.onerror=function(){finish(fail('NETWORK','Portal unreachable or blocked by browser cookie/CORS policy.')); };
   xhr.ontimeout=function(){finish(fail('TIMEOUT','Portal request timed out.'));};
   xhr.send();
  }catch(e){finish(fail('TRANSPORT','This runtime cannot send the portal request. Check cookie/CORS support.'));}
 }
 Provider.prototype.request=function(type,action,params,callback){
  var self=this,epoch=this.generation,query={type:type,action:action,JsHttpRequest:'1-xml'},headers={Accept:'application/json'};
  Object.keys(params||{}).forEach(function(key){query[key]=params[key];});
  if(this.token)headers.Authorization='Bearer '+this.token;
  this.transport({url:this.url+'?'+Object.keys(query).map(function(key){return encodeURIComponent(key)+'='+encodeURIComponent(query[key]);}).join('&'),headers:headers,cookie:'mac='+encodeURIComponent(this.mac)+'; stb_lang=en; timezone=America%2FToronto'},function(error,response){
   if(epoch!==self.generation){callback(fail('CANCELLED','Connection closed.'));return;}
   if(error){callback(error.code==='TIMEOUT'?fail('TIMEOUT','Portal request timed out.'):fail('NETWORK','Portal request failed. Check connectivity, cookie and CORS support.'));return;}
   if(response.status===401||response.status===403){self.token=null;callback(fail('AUTH','Portal rejected access. Reconnect or check provider authorization.'));return;}
   if(response.status<200||response.status>=300){callback(fail('HTTP','Portal returned HTTP '+response.status+'. Check the configured API path.'));return;}
   var data;
   try{data=JSON.parse(response.body);if(!data||!Object.prototype.hasOwnProperty.call(data,'js'))throw new Error();}
   catch(e){callback(fail('FORMAT','Portal did not return supported JSON. Check API path and provider compatibility.'));return;}
   if(data.js===false||data.js===null||data.js.error){callback(fail('PORTAL','Portal rejected this operation or requires an unsupported authentication flow.'));return;}
   callback(null,data.js);
  });
 };
 Provider.prototype.authenticate=function(callback){
  var self=this;this.generation++;this.token=null;
  this.request('stb','handshake',{},function(error,data){
   if(error){callback(error);return;}
   if(typeof data.token!=='string'||!data.token||data.token.length>4096||/[\r\n]/.test(data.token)){callback(fail('AUTH','No valid session token returned. This portal may require unsupported device authentication.'));return;}
   self.token=data.token;callback(null);
  });
 };
 Provider.prototype.checkConnectivity=Provider.prototype.authenticate;
 Provider.prototype.authorized=function(callback){if(this.token)return true;callback(fail('SESSION','Connect to the portal first.'));return false;};
 Provider.prototype.listCategories=function(callback){
  if(!this.authorized(callback))return;
  this.request('itv','get_genres',{},function(error,data){
   if(error){callback(error);return;}if(!Array.isArray(data)){callback(fail('FORMAT','Unsupported category response.'));return;}
   callback(null,data.filter(function(row){return row && row.id !== undefined;}).map(function(row){return {id:String(row.id),name:String(row.title||row.name||'Unnamed category')};}));
  });
 };
 Provider.prototype.listChannels=function(category,page,callback){
  if(!this.authorized(callback))return;
  this.request('itv','get_ordered_list',{genre:category,p:page,force_ch_link_check:0},function(error,data){
   if(error){callback(error);return;}if(!data||!Array.isArray(data.data)){callback(fail('FORMAT','Unsupported channel response.'));return;}
   callback(null,{channels:data.data.filter(function(row){return row && row.id !== undefined;}).map(function(row){return {id:String(row.id),name:String(row.name||'Unnamed channel'),cmd:typeof row.cmd==='string'?row.cmd:''};}),hasMore:data.data.length>0 && page*Number(data.max_page_items||data.data.length)<Number(data.total_items||0)});
  });
 };
 Provider.prototype.getPlaybackUrl=function(channel,callback){
  if(!this.authorized(callback))return;
  if(!channel||!channel.cmd){callback(fail('STREAM','Channel has no supported stream command.'));return;}
  this.request('itv','create_link',{cmd:channel.cmd},function(error,data){
   if(error){callback(error);return;}
   var url=String(data.cmd||'').replace(/^(?:ffmpeg|ffrt)\s+/i,'');
   if(!/^https?:\/\/[^\s/@]+(?:\/[^\s]*)?$/i.test(url)||/^https?:\/\/(?:localhost|127\.|\[::1\])/i.test(url)){callback(fail('STREAM','Provider did not return a direct HTTP(S) stream supported by AVPlay.'));return;}
   callback(null,url);
  });
 };
 Provider.prototype.logout=function(callback){this.token=null;this.generation++;if(callback)callback(null);};
 root.IPTVPortalProvider=Provider;
}(typeof window!=='undefined'?window:this));
