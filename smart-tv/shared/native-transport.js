/* Direct on-TV requests through Samsung's documented Tizen Sockets extension. */
(function(root){
 'use strict';
 root.IPTVNativeTransport=function(request,callback){
  var worker,finished=false,timer;
  function finish(error,response){if(finished)return;finished=true;clearTimeout(timer);if(worker)worker.terminate();callback(error,response);}
  try{
   worker=new Worker('native/portal-worker.js');
   timer=setTimeout(function(){finish({code:'TIMEOUT'});},((request.timeout||15)+7)*1000);
   worker.onmessage=function(event){var value=event.data;if(value && value.error){finish({code:'NATIVE'});return;}if(!value||typeof value.status!=='number'||typeof value.body!=='string'){finish({code:'NATIVE'});return;}finish(null,{status:value.status,body:value.body});};
   worker.onerror=function(event){if(event.preventDefault)event.preventDefault();finish({code:'NATIVE'});};
   worker.postMessage({url:request.url,cookie:request.cookie,authorization:request.headers.Authorization||'',userAgent:request.headers['User-Agent']||'',xUserAgent:request.headers['X-User-Agent']||'',language:request.headers['Accept-Language']||'',timeout:request.timeout||15});
  }catch(_){finish({code:'NATIVE'});}
 };
}(typeof window!=='undefined'?window:this));
