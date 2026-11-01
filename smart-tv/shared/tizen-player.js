/* Samsung AVPlay bridge. Only direct authorized HTTP(S) streams are supported. */
(function(root){
 'use strict';
 function Player(avplay){this.api=avplay||(root.webapis&&root.webapis.avplay);this.state='IDLE';this.generation=0;this.subtitlesEnabled=false;}
 Player.prototype.supported=function(){return !!(this.api&&this.api.open&&this.api.prepareAsync&&this.api.play);};
 Player.prototype.open=function(url,onReady,onError){
  var self=this,epoch=++this.generation;
  this.subtitlesEnabled=false;if(this.onSubtitle)this.onSubtitle(0,'');
  if(!this.supported()){onError(new Error('Samsung AVPlay is unavailable in this environment'));return;}
  if(!/^https?:\/\//i.test(url||'')){onError(new Error('Authorized HTTP(S) stream URL required'));return;}
  try{
   if(this.state!=='IDLE')this.api.close();
   this.api.open(url);this.state='OPEN';
   try{if(this.api.setSilentSubtitle)this.api.setSilentSubtitle(true);}catch(_){}
   if(this.api.setListener)this.api.setListener({
    onbufferingstart:function(){if(epoch===self.generation&&self.onEvent)self.onEvent('buffering',0);},
    onbufferingprogress:function(value){if(epoch===self.generation&&self.onEvent)self.onEvent('buffering',value);},
    onbufferingcomplete:function(){if(epoch===self.generation&&self.onEvent)self.onEvent('buffering',100);},
    oncurrentplaytime:function(value){if(epoch===self.generation&&self.onEvent)self.onEvent('time',value);},
    onstreamcompleted:function(){if(epoch===self.generation&&self.onEvent)self.onEvent('completed',0);},
    onerror:function(){if(epoch===self.generation){self.state='ERROR';onError(new Error('Playback failed'));}},
    onsubtitlechange:function(duration,text){if(epoch===self.generation&&self.subtitlesEnabled&&self.onSubtitle)self.onSubtitle(duration,String(text||''));}
   });
   if(this.api.setBufferingParam&&this.options){this.api.setBufferingParam('PLAYER_BUFFER_FOR_PLAY','PLAYER_BUFFER_SIZE_IN_SECOND',this.options.buffer||2);this.api.setBufferingParam('PLAYER_BUFFER_FOR_RESUME','PLAYER_BUFFER_SIZE_IN_SECOND',this.options.rebuffer||5);}
   var rect=this.rect||[0,0,1920,1080];if(this.api.setDisplayRect)this.api.setDisplayRect.apply(this.api,rect);
   this.api.prepareAsync(function(){if(epoch!==self.generation)return;self.state='READY';onReady();},function(){if(epoch!==self.generation)return;self.state='ERROR';onError(new Error('AVPlay preparation failed'));});
  }catch(e){this.state='ERROR';onError(new Error('AVPlay could not open the stream'));}
 };
 Player.prototype.setDisplayRect=function(x,y,width,height){this.rect=[x,y,width,height];if(this.state!=='IDLE'&&this.api&&this.api.setDisplayRect)this.api.setDisplayRect(x,y,width,height);};
 Player.prototype.play=function(){if(!this.supported()||(this.state!=='READY'&&this.state!=='PAUSED'))return false;this.api.play();this.state='PLAYING';try{if(this.api.setSilentSubtitle)this.api.setSilentSubtitle(true);}catch(_){}return true;};
 Player.prototype.pause=function(){if(this.state!=='PLAYING')return false;this.api.pause();this.state='PAUSED';return true;};
 Player.prototype.seek=function(ms){if(this.api&&this.api.seekTo&&this.state!=='IDLE')this.api.seekTo(Math.max(0,ms));};
 Player.prototype.jump=function(ms){this.seek(this.position()+ms);};
 Player.prototype.position=function(){try{return this.api.getCurrentTime?this.api.getCurrentTime():0;}catch(_){return 0;}};
 Player.prototype.duration=function(){try{return this.api.getDuration?this.api.getDuration():0;}catch(_){return 0;}};
 Player.prototype.tracks=function(){try{return this.api.getTotalTrackInfo?this.api.getTotalTrackInfo():[];}catch(_){return [];}};
 Player.prototype.selectTrack=function(type,index){if(this.api.setSelectTrack){this.api.setSelectTrack(type,index);if(type==='TEXT')this.subtitles(true);}};
 // Keep AVPlay's own rendering silent to avoid duplicate captions below the preview.
 Player.prototype.subtitles=function(enabled){this.subtitlesEnabled=!!enabled;if(this.onSubtitle)this.onSubtitle(0,'');try{if(this.api.setSilentSubtitle)this.api.setSilentSubtitle(true);}catch(_){}};
 Player.prototype.aspect=function(value){if(this.api.setDisplayMethod)this.api.setDisplayMethod(value==='Fill'?'PLAYER_DISPLAY_MODE_FULL_SCREEN':value==='Auto'?'PLAYER_DISPLAY_MODE_AUTO_ASPECT_RATIO':'PLAYER_DISPLAY_MODE_LETTER_BOX');};
 Player.prototype.stop=function(){this.generation++;this.subtitlesEnabled=false;if(this.onSubtitle)this.onSubtitle(0,'');if(!this.supported()||this.state==='IDLE')return false;try{if(this.state==='PLAYING'||this.state==='PAUSED')this.api.stop();}finally{this.api.close();this.state='IDLE';}return true;};
 root.IPTVTizenPlayer=Player;
}(typeof window!=='undefined'?window:this));
