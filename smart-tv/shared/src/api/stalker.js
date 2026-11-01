/** Provider callback compatibility boundary for the tested legacy adapter. */
export function call(provider,method,...args){return new Promise((resolve,reject)=>{if(!provider||typeof provider[method]!=='function'){reject(new Error('This feature is not supported.'));return;}provider[method](...args,(error,result)=>error?reject(error):resolve(result));});}
export function safeImage(value,base){try{const url=new URL(value,base);return /^https?:$/.test(url.protocol)&&!url.username&&!url.password&&url.href.length<2048?url.href:'';}catch(_){return '';}}
export function duration(value){const seconds=Math.max(0,Number(value)||0);return Math.floor(seconds/3600)+':'+String(Math.floor(seconds/60)%60).padStart(2,'0')+':'+String(Math.floor(seconds)%60).padStart(2,'0');}
