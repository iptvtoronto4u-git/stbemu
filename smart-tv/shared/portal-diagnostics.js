/* Read-only portal diagnostics; never sends MAC, tokens, or credentials. */
(function(root){
 'use strict';
 function diagnose(url, callback, xhrFactory){
   if(!/^https?:\/\//i.test(url||'')){callback({ok:false,code:'INVALID_URL',message:'HTTP(S) portal URL required'});return;}
   var xhr=(xhrFactory||function(){return new XMLHttpRequest();})();
   var finished=false;
   function done(result){if(finished)return;finished=true;callback(result);}
   try{
     xhr.open('GET',url,true);
     xhr.timeout=8000;
     xhr.onreadystatechange=function(){
       if(xhr.readyState!==4)return;
       done({ok:xhr.status>=200&&xhr.status<400,code:xhr.status>=200&&xhr.status<400?'REACHABLE':'HTTP_ERROR',status:xhr.status,message:'Portal responded with HTTP '+xhr.status+'. Reachability does not establish MAG/Stalker compatibility.'});
     };
     xhr.onerror=function(){done({ok:false,code:'NETWORK_OR_CORS',message:'Network error or CORS restriction. The browser cannot distinguish these.'});};
     xhr.ontimeout=function(){done({ok:false,code:'TIMEOUT',message:'Portal did not respond within 8 seconds.'});};
     xhr.send();
   }catch(e){done({ok:false,code:'REQUEST_BLOCKED',message:'Request blocked by the runtime or network policy.'});}
 }
 root.IPTVPortalDiagnostics={diagnose:diagnose};
}(typeof window!=='undefined'?window:this));
