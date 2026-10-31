/* Samsung AVPlay bridge. Only direct authorized HTTP(S) streams are supported. */
(function(root){
 'use strict';
 function Player(avplay){this.api=avplay||(root.webapis&&root.webapis.avplay);this.state='IDLE';this.generation=0;}
 Player.prototype.supported=function(){return !!(this.api&&this.api.open&&this.api.prepareAsync&&this.api.play);};
 Player.prototype.open=function(url,onReady,onError){
  var self=this,epoch=++this.generation;
  if(!this.supported()){onError(new Error('Samsung AVPlay is unavailable in this environment'));return;}
  if(!/^https?:\/\//i.test(url||'')){onError(new Error('Authorized HTTP(S) stream URL required'));return;}
  try{
   if(this.state!=='IDLE')this.api.close();
   this.api.open(url);this.state='OPEN';
   if(this.api.setDisplayRect)this.api.setDisplayRect(0,0,1920,1080);
   this.api.prepareAsync(function(){if(epoch!==self.generation)return;self.state='READY';onReady();},function(){if(epoch!==self.generation)return;self.state='ERROR';onError(new Error('AVPlay preparation failed'));});
  }catch(e){this.state='ERROR';onError(new Error('AVPlay could not open the stream'));}
 };
 Player.prototype.play=function(){if(!this.supported()||(this.state!=='READY'&&this.state!=='PAUSED'))return false;this.api.play();this.state='PLAYING';return true;};
 Player.prototype.pause=function(){if(this.state!=='PLAYING')return false;this.api.pause();this.state='PAUSED';return true;};
 Player.prototype.stop=function(){this.generation++;if(!this.supported()||this.state==='IDLE')return false;try{if(this.state==='PLAYING'||this.state==='PAUSED')this.api.stop();}finally{this.api.close();this.state='IDLE';}return true;};
 root.IPTVTizenPlayer=Player;
}(typeof window!=='undefined'?window:this));
