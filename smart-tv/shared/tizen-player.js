/* Samsung Tizen AVPlay bridge. Playback requires a provider-authorized stream URL.
 * Does not bypass DRM, emulate MAG firmware, or fetch portal credentials.
 */
(function(root){
 'use strict';
 function Player(avplay){this.api=avplay || (root.webapis && root.webapis.avplay);this.state='IDLE';}
 Player.prototype.supported=function(){return !!(this.api && this.api.open && this.api.prepareAsync && this.api.play);};
 Player.prototype.open=function(url,onReady,onError){
   var self=this;
   if(!this.supported()){onError(new Error('Samsung AVPlay is unavailable in this environment'));return;}
   if(!/^https?:\/\//i.test(url||'')){onError(new Error('Authorized HTTP(S) stream URL required'));return;}
   try {
     if(this.state!=='IDLE')this.api.close();
     this.api.open(url);this.state='OPEN';
     if(this.api.setDisplayRect)this.api.setDisplayRect(0,0,1920,1080);
     this.api.prepareAsync(function(){self.state='READY';onReady();},function(error){self.state='ERROR';onError(error);});
   }catch(e){self.state='ERROR';onError(e);}
 };
 Player.prototype.play=function(){if(!this.supported()||this.state!=='READY'&&this.state!=='PAUSED')return false;this.api.play();this.state='PLAYING';return true;};
 Player.prototype.pause=function(){if(this.state!=='PLAYING')return false;this.api.pause();this.state='PAUSED';return true;};
 Player.prototype.stop=function(){if(!this.supported()||this.state==='IDLE')return false;this.api.stop();this.api.close();this.state='IDLE';return true;};
 root.IPTVTizenPlayer=Player;
}(typeof window!=='undefined'?window:this));
