(function () {
  'use strict';
  var KEY = 'iptvtoronto.profiles.v1';
  var profiles = [];
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(saved)) profiles = saved; } catch (_) {}
  var selected = -1;

  var home = document.getElementById('home'), editor = document.getElementById('editor'), setup = document.getElementById('setup');
  var formDraft={},connecting=false,startupStarted=false;
  var form = document.getElementById('form'), grid = document.getElementById('profiles');
  var name = document.getElementById('name'), portal = document.getElementById('portal'), mac = document.getElementById('mac');
  var editingField = null;
  var fields = [name, portal, mac];
  var provider = null, connection = 0, category = '', page = 1, busy = false;
  var browser = document.getElementById('browser'), player = new window.IPTVTizenPlayer();
  var selectedChannel = null, playingChannel = null, lastChannel = null, channelRows = [], categoryRows = [], allRows = null, numberDigits = "", numberTimer = null;
  var activeProfile = null, alphabetical = false, playbackGeneration = 0, listGeneration = 0, guideGeneration = 0, guideTimer = null;
  var favorites = {}; try { favorites = JSON.parse(localStorage.getItem(KEY + '.favorites') || '{}'); } catch (_) {}
  function element(id) { return document.getElementById(id); }
  function status(error, message) { element('live-status').textContent = error ? error.message : message; }
  function favoriteKey(channel) { return activeProfile.portal + '|' + activeProfile.mac + '|' + channel.id; }
  function markFavorite() {
    if (!selectedChannel || !activeProfile) return;
    var channel=selectedChannel,owner=provider;
    var key = favoriteKey(selectedChannel); if (favorites[key]) delete favorites[key]; else favorites[key] = true;
    try { localStorage.setItem(KEY + '.favorites', JSON.stringify(favorites)); } catch (_) { status({message:'Could not save this favorite on the TV.'}); }
    renderChannels(false);
    if(owner && owner.favoriteIds)owner.favoriteIds(function(error,ids){if(error || owner!==provider)return;var desired=!!favorites[key];ids=ids.filter(function(id){return id!==channel.id;});if(desired)ids.push(channel.id);owner.setFavoriteIds(ids,function(){});});
  }
  function updateRectangle() {
    if (!player.setDisplayRect) return;
    var rect = element('preview').getBoundingClientRect(), sx = 1920 / window.innerWidth, sy = 1080 / window.innerHeight;
    try { player.setDisplayRect(Math.round(rect.left*sx), Math.round(rect.top*sy), Math.round(rect.width*sx), Math.round(rect.height*sy)); } catch (_) {}
  }
  function fullscreen(enabled) {
    if (enabled && !playingChannel) { status(null, 'Choose a channel and press OK to start watching.'); return; }
    document.body.classList.toggle('fullscreen', enabled); updateRectangle();
    element('fullscreen').setAttribute('aria-label', enabled ? 'Exit fullscreen' : 'Fullscreen preview');
    if (!enabled) { var focused=element('channels').querySelector('.channel-row.current'); if(focused) focused.focus(); }
  }
  function stopPlayback() {
    playbackGeneration++; playingChannel = null; fullscreen(false); document.body.classList.remove('watching');
    try { player.stop(); } catch (_) {} status(null, 'Playback stopped. Choose another channel.');
  }
  function disconnect() {
    document.dispatchEvent(new CustomEvent('iptv:session-closed'));
    connection++; listGeneration++; guideGeneration++; clearTimeout(guideTimer); stopPlayback();
    if (provider) provider.logout(); provider = null; busy = false; activeProfile = null;
    browser.hidden = true; document.body.classList.remove('live-mode'); document.documentElement.style.background = ''; showHome();
  }
  element('disconnect').onclick = disconnect; element('stop').onclick = stopPlayback;
  element('fullscreen').onclick = element('view').onclick = function () { fullscreen(!document.body.classList.contains('fullscreen')); };
  element('sort').onclick = function () { alphabetical = !alphabetical; element('sort').lastChild.textContent = alphabetical ? 'Sort: A–Z' : 'Sort: number'; renderChannels(true); };
  element('favorite').onclick = markFavorite;
  element('category-focus').onclick = function () { var button=element('categories').querySelector('.active') || element('categories').firstChild; if(button) button.focus(); };
  function showGuide(channel) {
    selectedChannel = channel; element('guide-title').textContent = channel.name;
    var epoch = ++guideGeneration; clearTimeout(guideTimer);
    element('favorite').lastChild.textContent = favorites[favoriteKey(channel)] ? 'Remove favorite' : 'Favorite';
    element('programme-list').textContent = '';
    var note = document.createElement('p'); note.textContent = 'Loading programme information…'; element('programme-list').appendChild(note);
    if (!provider || !provider.listProgramme) { note.textContent = 'Programme information is not available from this portal.'; return; }
    guideTimer = setTimeout(function () {
      provider.listProgramme(channel, function (error, rows) {
        if(epoch !== guideGeneration || !provider) return;
        element('programme-list').textContent = '';
        if(error || !rows || !rows.length) { var empty=document.createElement('p'); empty.textContent='Programme information is not available for this channel.'; element('programme-list').appendChild(empty); return; }
        rows.forEach(function (row) { var entry=document.createElement('div'); entry.className='programme-row'; var time=document.createElement('time'); time.textContent=row.time || ''; var title=document.createElement('span'); title.textContent=row.name; entry.appendChild(time); entry.appendChild(title); element('programme-list').appendChild(entry); });
      });
    }, 350);
  }
  function playChannel(channel, authorized, attempt) {
    attempt=attempt||0;
    if(!authorized && window.IPTVFeatures){window.IPTVFeatures.authorize(channel.id,category).then(function(allowed){if(allowed && provider)playChannel(channel,true,attempt);});return;}
    document.dispatchEvent(new CustomEvent('iptv:live-selected'));
    if (playingChannel && playingChannel.id === channel.id && player.state === 'PLAYING') { fullscreen(true); return; }
    if(playingChannel && playingChannel.id!=='catalog' && playingChannel.id!==channel.id)lastChannel=playingChannel;
    var epoch=++playbackGeneration; try { player.stop(); } catch (_) {}
    playingChannel=null; document.body.classList.remove('watching'); status(null, 'Opening ' + channel.name + '…');
    provider.getPlaybackUrl(channel, function(error, url) {
      if(epoch !== playbackGeneration || !provider) return; if(error) { status(error); return; }
      updateRectangle();
      player.open(url, function() {
        if(epoch !== playbackGeneration) return;
        try { if(!player.play()) throw new Error(); playingChannel=channel; document.body.classList.add('watching'); element('preview-title').textContent=channel.name; status(null, 'Now playing · ' + channel.name); renderChannels(false); }
        catch (_) { status({message:'AVPlay could not start this stream.'}); }
      }, function() { if(epoch !== playbackGeneration)return;var limit=activeProfile&&typeof activeProfile.retryCount==='number'?activeProfile.retryCount:1;if(attempt<limit){status(null,'Retrying the channel…');setTimeout(function(){if(epoch===playbackGeneration&&provider)playChannel(channel,true,attempt+1);},700);}else status({message:'AVPlay could not prepare this stream. Format or provider requirements may be unsupported.'}); });
    });
  }
  var hasMoreChannels=false;
  function loadMoreChannels(){if(!busy&&hasMoreChannels)channels(true);}
  function renderChannels(focusFirst) {
    var target=element('channels'), focusedId=selectedChannel && selectedChannel.id;
    var hadFocus=target.contains(document.activeElement); target.textContent='';
    var rows=channelRows.filter(function(row){return !activeProfile.hiddenChannels || activeProfile.hiddenChannels.indexOf(row.id)<0;}).sort(function(a,b) { return alphabetical ? a.name.localeCompare(b.name) : (Number(a.number)||0)-(Number(b.number)||0); });
    rows.forEach(function(channel) {
      var button=document.createElement('button'); button.className='channel-row' + (playingChannel && playingChannel.id===channel.id?' current':''); button.setAttribute('aria-label',channel.name); button.setAttribute('data-channel-id',channel.id);
      var number=document.createElement('span'); number.className='channel-number'; number.textContent=channel.number;
      var title=document.createElement('span'); title.className='channel-name'; title.textContent=channel.name;
      if(channel.logo){try{var imageURL=new URL(channel.logo,activeProfile.portal);if(/^https?:$/.test(imageURL.protocol)&&!imageURL.username&&!imageURL.password){var logo=document.createElement('img');logo.loading='lazy';logo.src=imageURL.href;logo.alt='';logo.onerror=function(){logo.remove();};button.appendChild(logo);}}catch(_){}}
      var star=document.createElement('span'); star.className='favorite-mark'; star.textContent=favorites[favoriteKey(channel)]?'★':'';
      button.appendChild(number); button.appendChild(title); button.appendChild(star);
      button.onfocus=function() { showGuide(channel); button.scrollIntoView({block:'nearest'}); if(rows.indexOf(channel)>=rows.length-3)loadMoreChannels(); };
      button.onclick=function() { showGuide(channel); playChannel(channel); }; target.appendChild(button);
    });
    element('record-count').textContent=rows.length + ' channels';
    if(focusFirst && target.firstChild) target.firstChild.focus();
    else if(hadFocus) { var match=Array.prototype.slice.call(target.children).filter(function(b){return b.getAttribute('data-channel-id')===focusedId;})[0]; if(match)match.focus(); }
  }
  function channels(append) {
    var requestedPage=append?page+1:1;
    var epoch=connection,request=++listGeneration;busy=true;element('channels').setAttribute('aria-busy','true');status(null,'Loading live channels…');
    function complete(error,result){
      if(epoch!==connection || request!==listGeneration)return;busy=false;element('channels').removeAttribute('aria-busy');
      if(error){if(connecting)connectionFailed(error);else status(error);return;}page=requestedPage;hasMoreChannels=!!result.hasMore&&result.channels.length>0;var existing=append?channelRows:[];channelRows=existing.concat(result.channels.filter(function(row){return !existing.some(function(old){return old.id===row.id;});}));connectionReady();renderChannels(!append);
      status(null,channelRows.length?'↑ ↓ Browse channels · OK Preview · OK again for fullscreen':'No live channels in this category. Choose another category.');
    }
    if(category==='__all'||category==='__favorites'){
      function localPage(){var rows=allRows||[];if(category==='__favorites')rows=rows.filter(function(row){return favorites[favoriteKey(row)];});complete(null,{channels:rows.slice((requestedPage-1)*50,requestedPage*50),hasMore:requestedPage*50<rows.length});}
      if(allRows){localPage();return;}provider.listAllChannels(function(error,rows){if(epoch!==connection || request!==listGeneration)return;if(error){complete(error);return;}allRows=rows.slice(0,10000);localPage();});
    }else provider.listChannels(category,requestedPage,complete);
  }
  element('channels').onscroll=function(){var list=element('channels');if(list.scrollTop>0&&list.scrollTop+list.clientHeight>=list.scrollHeight-100)loadMoreChannels();};
  function chooseCategory(row,authorized) {
    if(!authorized && window.IPTVFeatures){window.IPTVFeatures.authorize('',row.id).then(function(ok){if(ok && provider)chooseCategory(row,true);});return;}
    category=row.id; page=1;hasMoreChannels=false;channelRows=[];element('channels').scrollTop=0; element('category-title').textContent=row.name;
    Array.prototype.forEach.call(element('categories').children,function(b){b.classList.toggle('active',b.getAttribute('data-category-id')===row.id);}); channels();
  }
  function connect(profile) {
    finishEditing(); setup.hidden=true;editor.hidden=false;busy=false;connecting=true;element('startup').hidden=false;element('startup-profile').textContent=profile.name;progress(10,'Connecting to your portal…');
    if(provider)provider.logout(); connection++; var epoch=connection; activeProfile=profile; selectedChannel=null; channelRows=[]; allRows=null;
    try{provider=new window.IPTVPortalProvider(profile);}catch(e){connectionFailed(e);return;}
    browser.hidden=true; document.body.classList.add('live-mode'); document.documentElement.style.background='transparent';
    element('live-profile').textContent=profile.name; element('category-title').textContent='Connecting'; element('record-count').textContent=''; element('preview-title').textContent='Your live TV';
    element('categories').textContent='';element('channels').textContent='';hasMoreChannels=false;status(null,'Connecting to your portal…');element('disconnect').focus();
    player.options=profile;
    provider.authenticate(function(error){if(epoch!==connection)return;if(error){connectionFailed(error);return;}progress(55,'Loading your channel categories…');
      document.dispatchEvent(new CustomEvent('iptv:session',{detail:{provider:provider,profile:profile,player:player,channels:function(){return channelRows.slice();},selected:function(){return selectedChannel;},category:function(){return category;},playChannel:playChannel,playURL:playURL,watchLast:function(){var channel=lastChannel||selectedChannel||channelRows[0];if(channel)playChannel(channel);},reload:function(){var saved=profiles.filter(function(p){return p.portal===profile.portal&&p.mac===profile.mac;})[0];connect(saved||profile);}}}));
      provider.listCategories(function(error,rows){if(epoch!==connection)return;if(error){connectionFailed(error);return;}progress(75,'Loading live channels…');categoryRows=rows;
        [{id:'__all',name:'All'},{id:'__favorites',name:'Favorites'}].concat(rows).forEach(function(row){var b=document.createElement('button');b.textContent=row.name;b.setAttribute('data-category-id',row.id);b.onclick=function(){chooseCategory(row);};b.onfocus=function(){b.scrollIntoView({block:'nearest',inline:'nearest'});};element('categories').appendChild(b);});
        if(rows.length)chooseCategory(rows[0],true);else connectionFailed({message:'The portal returned no live TV categories. Check your subscription or portal details.'});
      });
    });
  }
  function selectNumber(){var digits=numberDigits,epoch=connection;numberDigits='';clearTimeout(numberTimer);element('number-entry').textContent='';var match=channelRows.filter(function(row){return String(row.number)===digits;})[0];if(match){showGuide(match);playChannel(match);return;}if(window.IPTVFeatures&&window.IPTVFeatures.findNumber)window.IPTVFeatures.findNumber(digits).then(function(row){if(epoch===connection&&row){showGuide(row);playChannel(row);}else if(epoch===connection)status(null,'No channel with that number was returned by the portal.');});}
  function updateClock() { var now=new Date();element('clock').textContent=now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});element('today').textContent=now.toLocaleDateString([], {weekday:'short',day:'numeric',month:'short'}); }
  updateClock(); setInterval(updateClock,30000); window.addEventListener('resize',updateRectangle);
  try { if(window.tizen && tizen.tvinputdevice)['ColorF0Red','ColorF1Green','ColorF2Yellow','ColorF3Blue','MediaPlayPause','MediaPlay','MediaPause','MediaStop','MediaFastForward','MediaRewind','ChannelUp','ChannelDown','Info','Tools','ChannelList','MediaTrackPrevious'].forEach(function(key){try{tizen.tvinputdevice.registerKey(key);}catch(_){}}); } catch (_) {}

  function playURL(url,title,options) {
    var epoch=++playbackGeneration;try{player.stop();}catch(_){}playingChannel=null;document.body.classList.remove('watching');updateRectangle();
    player.open(url,function(){if(epoch!==playbackGeneration)return;try{player.play();playingChannel={id:'catalog',name:title};document.body.classList.add('watching');element('preview-title').textContent=title;if(options&&options.position)setTimeout(function(){if(epoch===playbackGeneration)player.seek(options.position);},250);fullscreen(true);status(null,title);}catch(_){status({message:'This TV could not start the selected video.'});}},function(){if(epoch===playbackGeneration)status({message:'The selected video format is unavailable on this TV.'});});
  }
  player.onEvent=function(type,value){document.dispatchEvent(new CustomEvent('iptv:player-event',{detail:{type:type,value:value}}));if(type==='buffering'&&value<100)status(null,'Buffering… '+value+'%');};
  var subtitleTimer=null;
  player.onSubtitle=function(duration,text){clearTimeout(subtitleTimer);var subtitles=element('subtitles');if(subtitles){subtitles.textContent=text;subtitles.hidden=!text;if(text)subtitleTimer=setTimeout(function(){subtitles.textContent='';subtitles.hidden=true;},Math.max(0,Number(duration)||0));}};
  document.addEventListener('iptv:profiles-updated',function(){try{profiles=JSON.parse(localStorage.getItem(KEY)||'[]');if(!home.hidden)render();}catch(_){}});
  function finishEditing() {
    var field = editingField;
    if (!field) return;
    editingField = null;
    field.readOnly = true;
    field.blur();
    field.focus();
  }
  function startEditing(field) {
    if (editingField === field) return;
    finishEditing();
    field.blur();
    editingField = field;
    field.readOnly = false;
    field.focus();
  }
  fields.forEach(function (field) {
    field.readOnly = true;
    field.addEventListener('click', function () { startEditing(field); });
    field.addEventListener('blur', function () {
      field.readOnly = true;
      if (editingField === field) editingField = null;
    });
  });
  function persist() { localStorage.setItem(KEY, JSON.stringify(profiles)); }
  function showHome(){showSetup(selected>=0?selected:(profiles.length?0:-1));}
  function showSetup(index,error){
    connection++;listGeneration++;playbackGeneration++;clearTimeout(guideTimer);clearTimeout(numberTimer);finishEditing();
    document.dispatchEvent(new CustomEvent('iptv:session-closed'));
    if(provider)provider.logout();provider=null;try{player.stop();}catch(_){}playingChannel=null;activeProfile=null;connecting=false;
    element('startup').hidden=true;browser.hidden=true;setup.hidden=false;home.hidden=false;editor.hidden=false;
    document.body.classList.remove('live-mode','watching','fullscreen');document.documentElement.style.background='';
    selected=index;var profile=profiles[index]||{};formDraft=Object.assign({},profile);
    name.value=profile.name||'';portal.value=profile.portal||'';mac.value=profile.mac||'';mac.type='password';element('show-mac').textContent='Show';
    element('editor-title').textContent='Stalker / MAG profile';element('remove').hidden=index<0;element('duplicate').hidden=index<0;
    element('setup-error').hidden=!error;element('setup-error').textContent=error?error.message:'';
    render();document.dispatchEvent(new CustomEvent('iptv:setup-open',{detail:{profile:formDraft,index:index,change:function(key,value){formDraft[key]=value;}}}));
    name.focus();
  }
  function edit(index){showSetup(index);}
  function progress(value,label){element('startup-progress').value=value;element('startup-label').textContent=label;}
  function connectionFailed(error){var index=profiles.findIndex(function(p){return activeProfile&&p.portal===activeProfile.portal&&p.mac===activeProfile.mac;});showSetup(index,error);}
  function connectionReady(){if(!connecting)return;connecting=false;progress(100,'Your live TV is ready');element('startup').hidden=true;setup.hidden=true;browser.hidden=false;try{localStorage.setItem(KEY+'.active',JSON.stringify(activeProfile.portal+'|'+activeProfile.mac));}catch(_){}renderChannels(true);}
  function boot(){if(startupStarted)return;startupStarted=true;var key=null;try{key=JSON.parse(localStorage.getItem(KEY+'.active')||'null');}catch(_){}var index=profiles.findIndex(function(p){return p.portal+'|'+p.mac===key;});if(index<0)index=0;if(profiles[index]){selected=index;connect(profiles[index]);}else showSetup(-1);}
  element('startup-cancel').onclick=function(){showSetup(profiles.length?Math.max(0,selected):-1);};
  element('show-mac').onclick=function(){mac.type=mac.type==='password'?'text':'password';element('show-mac').textContent=mac.type==='password'?'Show':'Hide';};
  element('duplicate').onclick=function(){if(selected<0)return;var copy=Object.assign({},profiles[selected],{name:profiles[selected].name+' copy'});profiles.push(copy);persist();showSetup(profiles.length-1);};
  document.addEventListener('iptv:ui-ready',boot);
  document.addEventListener('iptv:setup',function(event){showSetup(event.detail&&typeof event.detail.index==='number'?event.detail.index:(profiles.length?0:-1));});
  document.addEventListener('iptv:open-profile',function(event){var index=event.detail&&event.detail.index||0;if(profiles[index]){selected=index;connect(profiles[index]);}else showSetup(-1);});
  function render() {
    grid.textContent = '';
    profiles.forEach(function (p, i) {
      var b = document.createElement('button'); b.className = 'tile';
      var title = document.createElement('strong'); title.textContent = p.name;
      var details = document.createElement('small'); details.textContent = p.portal + ' • ' + String(p.mac).slice(0,8) + ':••:••:••';
      b.appendChild(title); b.appendChild(details);
      b.classList.toggle('selected',i===selected);b.addEventListener('click', function () { showSetup(i); }); grid.appendChild(b);
    });
    document.getElementById('status').textContent = profiles.length ?
      'Select a profile to view or update its details.' :
      'Add your first portal profile.';
  }
  document.getElementById('add').addEventListener('click', function () { edit(-1); });
  document.getElementById('cancel').addEventListener('click', function(){if(profiles.length)connect(profiles[Math.max(0,selected)]);else if(window.tizen&&confirm('Exit IPTV Toronto?'))tizen.application.getCurrentApplication().exit();});
  document.getElementById('remove').addEventListener('click', function () {
    if (selected >= 0 && confirm('Delete this profile?')) { profiles.splice(selected, 1); selected=Math.min(selected,profiles.length-1);persist(); showSetup(selected); }
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var url = portal.value.trim(), address = mac.value.trim().toUpperCase();
    var result = window.IPTVProfileUtils.validateProfile(name.value, url, address);
    if (!result.ok) { alert(result.error); return; }
    var p = Object.assign({},formDraft,result.profile);
    if (selected >= 0 && profiles[selected].endpoint) p.endpoint = profiles[selected].endpoint;
    if (!p.name) return;
    if (selected >= 0) profiles[selected] = p; else {profiles.push(p);selected=profiles.length-1;}
    persist(); connect(p);
  });
  // TV remotes may report Return as keyCode 10009; use explicit spatial focus
  // navigation so older Tizen WebKit engines do not depend on CSS focus APIs.
  document.addEventListener('keydown', function (event) {
    var code = event.keyCode || event.which;
    var active = document.activeElement;
    // While the IME owns input, leave text and arrow keys to Samsung's keyboard.
    // Done/Cancel (including Back or Up out of the IME) return to field navigation.
    if (editingField) {
      if (code === 65376 || code === 65385 || code === 10009 || code === 27) {
        finishEditing();
      }
      return;
    }
    if (!browser.hidden) {
      if(code>=48 && code<=57){event.preventDefault();numberDigits=(numberDigits+String(code-48)).slice(-6);element('number-entry').textContent=numberDigits;clearTimeout(numberTimer);numberTimer=setTimeout(selectNumber,1400);return;}
      if(code===13 && numberDigits){event.preventDefault();selectNumber();return;}
      if(code===10232 && lastChannel){event.preventDefault();playChannel(lastChannel);return;}
      var colorButtons={403:'view',404:'sort',405:'favorite',406:'category-focus'};
      if(colorButtons[code]){event.preventDefault();element(colorButtons[code]).click();return;}
      if(code===413){event.preventDefault();stopPlayback();return;}
      if(code===417||code===412){event.preventDefault();try{player.jump(code===417?30000:-30000);}catch(_){}return;}
      if(code===427||code===428){event.preventDefault();var at=channelRows.indexOf(selectedChannel);var next=(at+(code===427?1:-1)+channelRows.length)%channelRows.length;if(channelRows[next]){showGuide(channelRows[next]);playChannel(channelRows[next]);}return;}
      if(code===10252){event.preventDefault();try{if(player.state==='PLAYING')player.pause();else if(player.state==='PAUSED')player.play();}catch(_){}return;}
      if((code===38 || code===40) && active && active.classList.contains('channel-row')) {
        var adjacent=code===38?active.previousElementSibling:active.nextElementSibling;
        if(adjacent){adjacent.focus();event.preventDefault();return;}
      }
    }
    if (code === 13 && fields.indexOf(active) >= 0) {
      event.preventDefault();
      startEditing(active);
      return;
    }
    if (code === 10009 || code === 27 || code === 8) {
      if(!element('startup').hidden){event.preventDefault();showSetup(profiles.length?Math.max(0,selected):-1);return;}
      if (!browser.hidden) { event.preventDefault(); if(document.body.classList.contains('fullscreen')) fullscreen(false); else disconnect(); }
      else if (!editor.hidden) { event.preventDefault(); showHome(); }
      else if (window.tizen && window.tizen.application) {
        try { if(confirm('Exit IPTV TORONTO?'))window.tizen.application.getCurrentApplication().exit(); } catch (_) {}
      }
      return;
    }
    if (code !== 37 && code !== 38 && code !== 39 && code !== 40) return;
    var fieldIndex = fields.indexOf(active);
    if (fieldIndex >= 0 && (code === 38 || code === 40)) {
      var nextField = fieldIndex + (code === 38 ? -1 : 1);
      if (nextField >= 0 && nextField < fields.length) fields[nextField].focus();
      else if (nextField === fields.length) form.querySelector('button[type="submit"]').focus();
      event.preventDefault();
      return;
    }
    var controls = Array.prototype.slice.call(document.querySelectorAll('button:not([hidden]),input:not([hidden]),summary'))
      .filter(function (el) { return el.offsetWidth > 0 && el.offsetHeight > 0; });
    if (!controls.length) return;
    var origin = active && active.getBoundingClientRect ? active.getBoundingClientRect() : null;
    if (!origin || controls.indexOf(active) < 0) { controls[0].focus(); event.preventDefault(); return; }
    var cx = origin.left + origin.width / 2, cy = origin.top + origin.height / 2, best = null, score = Infinity;
    controls.forEach(function (el) {
      if (el === active) return;
      var r = el.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      var forward = code === 37 ? -dx : code === 39 ? dx : code === 38 ? -dy : dy;
      var lateral = code === 37 || code === 39 ? Math.abs(dy) : Math.abs(dx);
      if (forward <= 2) return;
      var cost = forward + lateral * 3;
      if (cost < score) { score = cost; best = el; }
    });
    if (best) { best.focus(); }
    event.preventDefault();
  });
  player.captionControl(true);
  window.addEventListener('pagehide',function(){player.captionControl(false);});
  var resumeProfile=null;
  document.addEventListener('visibilitychange', function () {
    player.captionControl(!document.hidden);
    if(document.hidden && activeProfile){resumeProfile=activeProfile;disconnect();}
    else if(!document.hidden && resumeProfile){var savedProfile=resumeProfile;resumeProfile=null;connect(savedProfile);}
  });
  render();
}());
