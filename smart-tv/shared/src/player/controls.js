import {moveFocus} from '../nav/spatial.js';
export function playbackControls(getPlayer,onExit){
 const panel=document.createElement('section');panel.id='playback-controls';panel.hidden=true;panel.setAttribute('aria-label','Playback controls');
 const title=document.createElement('h2'),time=document.createElement('p'),progress=document.createElement('progress'),buttons=document.createElement('div');buttons.className='playback-buttons';progress.max=1;progress.value=0;panel.append(title,time,progress,buttons);document.body.append(panel);let timer;
 const format=ms=>{const s=Math.max(0,Math.floor(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 function update(){const player=getPlayer();if(!player)return;const position=player.position(),total=player.duration();progress.max=total||1;progress.value=position;time.textContent=format(position)+' / '+format(total);pause.textContent=player.state==='PAUSED'?'▶ Play':'Ⅱ Pause';}
 function toggle(){const player=getPlayer();if(!player)return;if(player.state==='PAUSED')player.play();else if(player.state==='PLAYING')player.pause();update();}
 function jump(amount){try{const player=getPlayer();if(player)player.jump(amount);update();}catch(_){time.textContent='Seeking is not supported by this stream.';}}
 function button(label,action){const n=document.createElement('button');n.type='button';n.textContent=label;n.onclick=action;buttons.append(n);return n;}
 button('↶ Rewind 30s',()=>jump(-30000));const pause=button('Ⅱ Pause',toggle);button('Forward 30s ↷',()=>jump(30000));button('Back to list',onExit);
 return {show(name){title.textContent=name;panel.hidden=false;clearInterval(timer);timer=setInterval(update,1000);update();pause.focus();},hide(){panel.hidden=true;clearInterval(timer);},active(){return !panel.hidden;},key(code){if(panel.hidden)return false;if([27,10009,8,413].includes(code))onExit();else if(code===10252)toggle();else if(code===415){getPlayer().play();update();}else if(code===19){getPlayer().pause();update();}else if(code===417)jump(30000);else if(code===412)jump(-30000);else if([37,38,39,40].includes(code))moveFocus(panel,code);else if(code===13){const active=document.activeElement;if(panel.contains(active)&&active.tagName==='BUTTON')active.click();else pause.focus();}else return false;return true;}};
}
