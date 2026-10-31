(function () {
  'use strict';
  var KEY = 'iptvtoronto.profiles.v1';
  var profiles = [];
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(saved)) profiles = saved; } catch (_) {}
  var selected = -1;

  var home = document.getElementById('home'), editor = document.getElementById('editor');
  var form = document.getElementById('form'), grid = document.getElementById('profiles');
  var name = document.getElementById('name'), portal = document.getElementById('portal'), mac = document.getElementById('mac');
  var editingField = null;
  var endpoint = document.getElementById('endpoint');
  var fields = [name, portal, endpoint, mac];
  var provider = null, connection = 0, category = '', page = 1, busy = false;
  var browser = document.getElementById('browser'), player = new window.IPTVTizenPlayer();
  function status(error, message) { document.getElementById('live-status').textContent = error ? error.message : message; }
  function disconnect() { document.body.classList.remove("playing"); document.documentElement.style.background = ""; connection++; if (provider) provider.logout(); provider = null; busy = false; try { player.stop(); } catch (_) {} browser.hidden = true; showHome(); }
  document.getElementById('disconnect').onclick = disconnect;
  document.getElementById('stop').onclick = function () { connection++; document.body.classList.remove('playing'); document.documentElement.style.background = ''; try { player.stop(); status(null, 'Playback stopped'); } catch (_) { status({message:'Unable to stop playback'}); } };
  function channels() {
    if (busy) return; busy = true; var epoch = connection;
    provider.listChannels(category, page, function(error, result) {
      if (epoch !== connection) return; busy = false; status(error, 'Choose a channel'); if(error) return;
      var target = document.getElementById('channels'); target.textContent = '';
      result.channels.forEach(function(channel) { var b = document.createElement('button'); b.textContent = channel.name; b.onclick = function() {
        var playback = ++connection; try { player.stop(); } catch (_) {} status(null, 'Resolving stream…');
        provider.getPlaybackUrl(channel, function(error, url) { if(playback !== connection) return; if(error) { status(error); return; }
          player.open(url, function() { if(playback !== connection) return; try { player.play(); document.body.classList.add('playing'); document.documentElement.style.background = 'transparent'; document.getElementById('stop').focus(); status(null, 'Playing ' + channel.name); } catch (_) { status({message:'AVPlay could not start this stream'}); } }, function() { if(playback === connection) status({message:'AVPlay could not prepare this stream. Format or provider requirements may be unsupported.'}); });
        });
      }; target.appendChild(b); });
      document.getElementById('more').hidden = !result.hasMore;
    });
  }
  document.getElementById('more').onclick = function() { page++; channels(); };
  function connect(profile) {
    if(provider) provider.logout(); connection++; var epoch = connection;
    try { provider = new window.IPTVPortalProvider(profile); } catch(e) { document.getElementById('status').textContent = e.message; return; }
    home.hidden = true; browser.hidden = false; status(null, 'Connecting…');
    document.getElementById('categories').textContent = ''; document.getElementById('channels').textContent = ''; document.getElementById('more').hidden = true; document.getElementById('disconnect').focus();
    provider.authenticate(function(error) { if(epoch !== connection) return; if(error) { status(error); return; }
      provider.listCategories(function(error, rows) { if(epoch !== connection) return; status(error, 'Choose a category'); if(error) return;
        rows.forEach(function(row) { var b = document.createElement('button'); b.textContent = row.name; b.onclick = function() { category = row.id; page = 1; channels(); }; document.getElementById('categories').appendChild(b); });
      });
    });
  }
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
  function showHome() { finishEditing(); editor.hidden = true; home.hidden = false; render(); document.getElementById('add').focus(); }
  function edit(index) {
    selected = index; var p = profiles[index] || {};
    endpoint.value = p.endpoint || 'portal.php'; name.value = p.name || ''; portal.value = p.portal || ''; mac.value = p.mac || '';
    document.getElementById('editor-title').textContent = index < 0 ? 'New profile' : 'Edit profile';
    document.getElementById('remove').hidden = index < 0;
    home.hidden = true; editor.hidden = false; name.focus();
  }
  function render() {
    grid.textContent = '';
    profiles.forEach(function (p, i) {
      var b = document.createElement('button'); b.className = 'tile';
      var title = document.createElement('strong'); title.textContent = p.name;
      var details = document.createElement('small'); details.textContent = p.portal + ' • ' + p.mac;
      b.appendChild(title); b.appendChild(details);
      b.addEventListener('click', function () { edit(i); }); grid.appendChild(b);
      var test = document.createElement('button'); test.textContent = 'Connect: ' + p.name; test.onclick = function () { connect(p); }; grid.appendChild(test);
    });
    document.getElementById('status').textContent = profiles.length ?
      'Profiles saved locally. Connect using the configured Stalker API path.' :
      'Set up an authorized Stalker profile to get started.';
  }
  document.getElementById('add').addEventListener('click', function () { edit(-1); });
  document.getElementById('cancel').addEventListener('click', showHome);
  document.getElementById('remove').addEventListener('click', function () {
    if (selected >= 0 && confirm('Delete this profile?')) { profiles.splice(selected, 1); persist(); showHome(); }
  });
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var url = portal.value.trim(), address = mac.value.trim().toUpperCase();
    var result = window.IPTVProfileUtils.validateProfile(name.value, url, address);
    if (!result.ok) { alert(result.error); return; }
    if (result.insecure && !confirm('This portal uses unencrypted HTTP. Continue?')) return;
    if (!/^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.php$/i.test(endpoint.value.trim())) { alert('Enter a relative API path, such as portal.php or server/load.php'); return; }
    var p = result.profile; p.endpoint = endpoint.value.trim();
    if (!p.name) return;
    if (selected >= 0) profiles[selected] = p; else profiles.push(p);
    persist(); showHome();
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
    if (code === 13 && fields.indexOf(active) >= 0) {
      event.preventDefault();
      startEditing(active);
      return;
    }
    if (code === 10009 || code === 27 || code === 8) {
      if (!browser.hidden) { event.preventDefault(); if(document.body.classList.contains('playing')) document.getElementById('stop').click(); else disconnect(); }
      else if (!editor.hidden) { event.preventDefault(); showHome(); }
      else if (window.tizen && window.tizen.application) {
        try { window.tizen.application.getCurrentApplication().exit(); } catch (_) {}
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
    var controls = Array.prototype.slice.call(document.querySelectorAll('button:not([hidden]),input:not([hidden])'))
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
  document.addEventListener('visibilitychange', function () { if(document.hidden && provider) disconnect(); });
  render();
  document.getElementById('add').focus();
}());
