/* Authorized Stalker subset. No firmware, serial, signature or device-ID emulation. */
(function(root){
 'use strict';
 function fail(code,message){return {code:code,message:message};}
 function Provider(profile,options){
  options=options||{};
  if(!profile||!/^https?:\/\/[^\s/@?#]+(?:\/[^?#\s]*)?$/i.test(profile.portal||'')||!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(profile.mac||''))throw new Error('A valid portal profile is required');
  var base=profile.portal.replace(/\/(?:c\/?)?$/,'');
  var endpoint=profile.endpoint;
  // Upgrade legacy defaults; explicitly supplied overrides remain unchanged.
  if(/^https?:\/\/[^/]+$/i.test(base) && endpoint==='portal.php' && !profile.endpointExplicit)endpoint=null;
  if(!endpoint)endpoint=/^https?:\/\/[^/]+$/i.test(base)?'stalker_portal/server/load.php':'server/load.php';
  if(!/^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.php$/i.test(endpoint))throw new Error('Use a relative API path such as portal.php or server/load.php');
  this.url=/\/(?:portal\.php|server\/load\.php)$/i.test(base)?base:base+'/'+endpoint;
  this.candidates=[this.url];
  if(!/\.php$/i.test(base)&&!profile.endpointExplicit){[base+'/server/load.php',base+'/portal.php'].forEach(function(value){if(this.candidates.indexOf(value)<0)this.candidates.push(value);},this);}
  try{var saved=JSON.parse(root.localStorage.getItem('iptvtoronto.endpoints.v1')||'{}')[profile.portal];var at=this.candidates.indexOf(saved);if(at>0){this.candidates.splice(at,1);this.candidates.unshift(saved);this.url=saved;}}catch(_){}
  this.profile=profile;
  this.mac=profile.mac.toUpperCase();this.token=null;this.generation=0;this.ready=false;
  this.transport=options.transport||((profile.transport!=='xhr'&&profile.transport!=='query') && root.tizen && root.IPTVNativeTransport?root.IPTVNativeTransport:xhrTransport);
 }
 function xhrTransport(request,callback){
  var xhr=new XMLHttpRequest(),done=false;
  function finish(error,value){if(done)return;done=true;callback(error,value);}
  try{
   xhr.open('GET',request.url,true);xhr.timeout=15000;
   Object.keys(request.headers).forEach(function(key){if(!/^(cookie|user-agent)$/i.test(key))xhr.setRequestHeader(key,request.headers[key]);});
   // Browser-managed cookies only. Tizen's native transport sends registered MAC cookies.
   xhr.withCredentials=true;
   xhr.onload=function(){finish(null,{status:xhr.status,body:xhr.responseText});};
   xhr.onerror=function(){finish(fail('NETWORK','Portal unreachable or blocked by browser cookie/CORS policy.')); };
   xhr.ontimeout=function(){finish(fail('TIMEOUT','Portal request timed out.'));};
   xhr.send();
  }catch(e){finish(fail('TRANSPORT','This runtime cannot send the portal request. Check cookie/CORS support.'));}
 }
 Provider.prototype.request=function(type,action,params,callback,noRetry){
  var self=this,epoch=this.generation,query={type:type,action:action,JsHttpRequest:'1-xml'},headers={Accept:'application/json'};
  Object.keys(params||{}).forEach(function(key){if(['type','action','JsHttpRequest'].indexOf(key)<0)query[key]=params[key];});
  if(this.profile.transport==='query'){query.mac=this.mac;query.stb_lang=this.profile.language||'en';query.timezone=this.profile.timezone||'UTC';}
  if(this.token)headers.Authorization='Bearer '+this.token;
  if(this.profile.userAgent)headers['User-Agent']=String(this.profile.userAgent).replace(/[\r\n]/g,'').slice(0,512);
  if(this.profile.xUserAgent)headers['X-User-Agent']=String(this.profile.xUserAgent).replace(/[\r\n]/g,'').slice(0,512);
  if(this.profile.language)headers['Accept-Language']=String(this.profile.language).replace(/[^a-zA-Z,-]/g,'').slice(0,32);
  function rejectSession(){if(self.ready&&!noRetry){self.ready=false;self.authenticate(function(error){if(error)callback(error);else self.request(type,action,params,callback,true);});}else{self.token=null;callback(fail('AUTH','Portal rejected the session. Check your registered MAC or provider authorization.'));}}
  this.transport({url:this.url+'?'+Object.keys(query).map(function(key){return encodeURIComponent(key)+'='+encodeURIComponent(query[key]);}).join('&'),headers:headers,timeout:Math.max(5,Math.min(60,Number(this.profile.timeout)||15)),cookie:'mac='+encodeURIComponent(this.mac)+'; stb_lang='+encodeURIComponent(this.profile.language||'en')+'; timezone='+encodeURIComponent(this.profile.timezone||'UTC')},function(error,response){
   if(epoch!==self.generation){callback(fail('CANCELLED','Connection closed.'));return;}
   if(error){callback(error.code==='TIMEOUT'?fail('TIMEOUT','Portal request timed out.'):error.code==='NATIVE'?fail('NATIVE','Direct TV connection could not complete. Check the portal address and this TV’s networking support.'):fail('NETWORK','Portal request failed. Check connectivity, cookie and CORS support.'));return;}
   if(response.status===401||response.status===403){if(self.ready&&!noRetry){rejectSession();return;}self.token=null;callback(fail('AUTH','Portal rejected access. Reconnect or check provider authorization.'));return;}
   if(response.status<200||response.status>=300){var httpError=fail('HTTP','Portal returned HTTP '+response.status+'. Check the configured API path.');httpError.status=response.status;callback(httpError);return;}
   var data;
   try{data=JSON.parse(response.body);if(!data||!Object.prototype.hasOwnProperty.call(data,'js'))throw new Error();}
   catch(e){
    if(/subscription\s+(?:has\s+)?expired|account\s+expired/i.test(String(response.body||''))){self.token=null;callback(fail('EXPIRED','Subscription expired. Contact your provider.'));return;}
    if(/(?:authorization|authentication)\s+(?:failed|required)|unauthori[sz]ed|not\s+authori[sz]ed/i.test(String(response.body||''))){rejectSession();return;}
    var stage={handshake:'sign-in',get_profile:'account setup',get_genres:'loading live TV categories',get_ordered_list:'loading live channels',create_link:'starting playback'};
    callback(fail('FORMAT','Portal returned an unexpected response during '+(stage[action]||'connection')+'. Check provider compatibility.'));return;
   }
   if(data.js===false||data.js===null||data.js.error){callback(fail('PORTAL','Portal rejected this operation or requires an unsupported authentication flow.'));return;}
   callback(null,data.js);
  });
 };
 Provider.prototype.authenticate=function(callback){
  var self=this;this.generation++;this.token=null;this.ready=false;var authGeneration=this.generation;
  this.request('stb','handshake',{token:''},function(error,data){
   if(error){callback(error);return;}
   if(typeof data.token!=='string'||!data.token||data.token.length>4096||/[\r\n]/.test(data.token)){callback(fail('AUTH','No valid session token returned. This portal may require unsupported device authentication.'));return;}
   self.token=data.token;
   // Initialize the authorized account session. No firmware/device identity fields.
   self.request('stb','get_profile',self.profile.profileParams||{},function(error){
    if(error && self.generation===authGeneration)self.token=null;
    if(!error && self.profile.username && self.profile.password){self.request('stb','do_auth',{login:self.profile.username,password:self.profile.password},function(authError){if(authError)self.token=null;self.ready=!authError;callback(authError||null);});}
    else {if(self.generation===authGeneration)self.ready=!error;callback(error||null);}
   });
  });
 };
 var authenticateAtEndpoint=Provider.prototype.authenticate;
 Provider.prototype.authenticate=function(callback){
  var self=this,index=0;
  function attempt(){self.url=self.candidates[index];authenticateAtEndpoint.call(self,function(error){
   if(error&&(error.status===404||error.code==='FORMAT')&&index+1<self.candidates.length){index++;attempt();return;}
   if(!error){try{var saved=JSON.parse(root.localStorage.getItem('iptvtoronto.endpoints.v1')||'{}');saved[self.profile.portal]=self.url;Object.keys(saved).slice(0,Math.max(0,Object.keys(saved).length-32)).forEach(function(key){delete saved[key];});root.localStorage.setItem('iptvtoronto.endpoints.v1',JSON.stringify(saved));}catch(_){}}
   callback(error||null);
  });}
  attempt();
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
   callback(null,{channels:data.data.filter(function(row){return row && row.id !== undefined;}).map(function(row){return {id:String(row.id),number:String(row.number||row.id),name:String(row.name||'Unnamed channel'),cmd:typeof row.cmd==='string'?row.cmd:''};}),hasMore:data.data.length>0 && page*Number(data.max_page_items||data.data.length)<Number(data.total_items||0)});
  });
 };
 Provider.prototype.listProgramme=function(channel,callback){
  if(!this.authorized(callback))return;
  this.request('itv','get_short_epg',{ch_id:channel.id,size:5},function(error,data){
   if(error){callback(error);return;}
   var rows=Array.isArray(data)?data:data && data.data;
   if(!Array.isArray(rows)){callback(fail('GUIDE','Programme information is unavailable.'));return;}
   callback(null,rows.filter(function(row){return row && (row.name || row.title);}).map(function(row){return {name:String(row.name||row.title),time:String(row.time||'')};}));
  });
 };
 Provider.prototype.getPlaybackUrl=function(channel,callback){
  var self=this;
  if(!this.authorized(callback))return;
  if(!channel||!channel.cmd){callback(fail('STREAM','Channel has no supported stream command.'));return;}
  this.request('itv','create_link',{cmd:channel.cmd},function(error,data){
   if(error){callback(error);return;}
   var url=String(data.cmd||'').replace(/^(?:ffmpeg|ffrt|auto)\s+/i,'');
   if(/^[a-z][a-z0-9+.-]*:/i.test(url)&&!/^https?:\/\//i.test(url)){callback(fail('STREAM','Provider returned an unsupported stream scheme.'));return;}
   if(url && !/^https?:\/\//i.test(url) && !/\s/.test(url)){var origin=self.url.match(/^https?:\/\/[^/]+/i)[0];url=url.charAt(0)==='/'?origin+url:self.url.replace(/[^/]+$/,'')+url;}
   if(!/^https?:\/\/[^\s/@]+(?:\/[^\s]*)?$/i.test(url)||/^https?:\/\/(?:localhost|127\.|\[::1\])/i.test(url)){callback(fail('STREAM','Provider did not return a direct HTTP(S) stream supported by AVPlay.'));return;}
   callback(null,url);
  });
 };
 Provider.prototype.logout=function(callback){this.token=null;this.ready=false;this.generation++;if(callback)callback(null);};
 function rows(data){return Array.isArray(data)?data:data && (data.data || data.results);}
 Provider.prototype.listAllChannels=function(callback){
  if(!this.authorized(callback))return;
  this.request('itv','get_all_channels',{},function(error,data){var result=rows(data);if(error||!Array.isArray(result)){callback(error||fail('FORMAT','All-channel response is unsupported. Use a channel category.'));return;}callback(null,result.filter(function(r){return r && r.id!==undefined;}).map(function(r){return {id:String(r.id),number:String(r.number||r.id),name:String(r.name||''),cmd:String(r.cmd||''),logo:String(r.logo||''),genre:String(r.tv_genre_id||'')};}));});
 };
 Provider.prototype.accountInfo=function(callback){if(!this.authorized(callback))return;this.request('account_info','get_main_info',{},callback);};
 Provider.prototype.modules=function(callback){if(!this.authorized(callback))return;this.request('stb','get_modules',{},callback);};
 Provider.prototype.listCatalogCategories=function(type,callback){if(!this.authorized(callback))return;if(type!=='vod'&&type!=='series'){callback(fail('TYPE','Unsupported catalog'));return;}this.request(type,'get_categories',{},function(error,data){var result=rows(data);callback(error||(!Array.isArray(result)?fail('FORMAT','This catalog is unavailable.'):null),Array.isArray(result)?result:[]);});};
 Provider.prototype.listCatalog=function(type,params,callback){if(!this.authorized(callback))return;if(type!=='vod'&&type!=='series'){callback(fail('TYPE','Unsupported catalog'));return;}this.request(type,'get_ordered_list',params,function(error,data){var result=rows(data);callback(error||(!Array.isArray(result)?fail('FORMAT','This catalog response is unsupported.'):null),{items:Array.isArray(result)?result:[],hasMore:!!(data&&Number(params.p||1)*Number(data.max_page_items||result&&result.length||0)<Number(data.total_items||0))});});};
 Provider.prototype.catalogLink=function(type,item,callback){if(!this.authorized(callback))return;this.request(type,'create_link',{cmd:item.cmd,series:item.episode||''},function(error,data){if(error){callback(error);return;}var value=String(data.cmd||data.url||'').replace(/^(?:ffmpeg|ffrt|auto)\s+/i,'');if(!/^https?:\/\//i.test(value)||/\s/.test(value)){callback(fail('STREAM','No supported direct stream was returned.'));return;}callback(null,value);});};
 Provider.prototype.guide=function(params,callback){if(!this.authorized(callback))return;this.request('epg','get_simple_data_table',params,function(error,data){var result=rows(data);callback(error||(!Array.isArray(result)?fail('GUIDE','The full guide is unavailable for this portal.'):null),Array.isArray(result)?result:[]);});};
 Provider.prototype.favoriteIds=function(callback){if(!this.authorized(callback))return;this.request('itv','get_fav_ids',{},function(error,data){var result=rows(data);callback(error||(!Array.isArray(result)?fail('FAVORITES','Portal favorites are unavailable.'):null),Array.isArray(result)?result.map(String):[]);});};
 Provider.prototype.setFavoriteIds=function(ids,callback){if(!this.authorized(callback))return;this.request('itv','set_fav',{fav_ch:ids.join(',')},callback);};
 Provider.prototype.keepAlive=function(callback){if(!this.authorized(callback))return;this.request('watchdog','get_events',{},callback);};
 root.IPTVPortalProvider=Provider;
}(typeof window!=='undefined'?window:this));
