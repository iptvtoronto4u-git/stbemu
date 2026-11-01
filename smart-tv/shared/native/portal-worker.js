/* Runs only in a worker: Tizen Sockets is unavailable on the UI thread. */
'use strict';
self.onmessage=function(event){
 var request=event.data;
 function fail(){self.postMessage({error:'NATIVE'});self.close();}
 if(typeof tizentvwasm==='undefined' || !request || typeof request.url!=='string' || !/^https?:\/\//i.test(request.url) || typeof request.cookie!=='string' || /[\r\n]/.test(request.cookie+request.authorization)){fail();return;}
 try{
  importScripts('portal-http.js');
  var module;
  module=createPortalModule({print:function(){},printErr:function(){},onAbort:fail,onRuntimeInitialized:function(){
   setTimeout(function(){
    try{
     var instance=module;
     if(instance && typeof instance.then==='function'){instance.then(run,fail);}else run(instance);
    }catch(_){fail();}
   },0);
  }});
  function run(instance){
   try{
    var body=instance.ccall('portal_fetch','string',['string','string','string','string','string','string','number'],[request.url,request.cookie,request.authorization||'',request.userAgent||'',request.xUserAgent||'',request.language||'',request.timeout||15]);
    var error=instance.ccall('portal_error','number',[],[]),status=instance.ccall('portal_status','number',[],[]);
    instance.ccall('portal_clear',null,[],[]);
    request=null;
    if(error){fail();return;}self.postMessage({status:status,body:body});self.close();
   }catch(_){fail();}
  }
 }catch(_){fail();}
};
