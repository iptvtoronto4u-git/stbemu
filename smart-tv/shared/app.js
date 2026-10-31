(function () {
  'use strict';
  var KEY = 'iptvtoronto.profiles.v1';
  var profiles = [];
  try { var saved = JSON.parse(localStorage.getItem(KEY) || '[]'); if (Array.isArray(saved)) profiles = saved; } catch (_) {}
  var selected = -1;
  var home = document.getElementById('home'), editor = document.getElementById('editor');
  var form = document.getElementById('form'), grid = document.getElementById('profiles');
  var name = document.getElementById('name'), portal = document.getElementById('portal'), mac = document.getElementById('mac');
  function persist() { localStorage.setItem(KEY, JSON.stringify(profiles)); }
  function showHome() { editor.hidden = true; home.hidden = false; render(); }
  function edit(index) {
    selected = index; var p = profiles[index] || {};
    name.value = p.name || ''; portal.value = p.portal || ''; mac.value = p.mac || '';
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
    });
    document.getElementById('status').textContent = profiles.length ?
      'Profiles saved locally. Portal authentication and streaming are not implemented yet.' :
      'Set up a profile to get started. Playback is not implemented in this prototype.';
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
    var p = result.profile;
    if (!p.name) return;
    if (selected >= 0) profiles[selected] = p; else profiles.push(p);
    persist(); showHome();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Backspace' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      if (!editor.hidden) { event.preventDefault(); showHome(); }
    }
  });
  // TV remotes may report Return as keyCode 10009; use explicit spatial focus
  // navigation so older Tizen WebKit engines do not depend on CSS focus APIs.
  document.addEventListener('keydown', function (event) {
    var code = event.keyCode || event.which;
    if (code === 10009) {
      if (!editor.hidden) { event.preventDefault(); showHome(); }
      else if (window.tizen && window.tizen.application) {
        try { window.tizen.application.getCurrentApplication().exit(); } catch (_) {}
      }
      return;
    }
    if (code !== 37 && code !== 38 && code !== 39 && code !== 40) return;
    var active = document.activeElement;
    if (active && active.tagName === 'INPUT') return;
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
    if (best) { best.focus(); event.preventDefault(); }
  });
  render();
  document.getElementById('add').focus();
}());