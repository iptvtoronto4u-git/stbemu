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
    if (!/^https?:\/\//i.test(url) || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(address)) {
      alert('Enter a valid HTTP(S) portal URL and MAC address. Prefer HTTPS when available.'); return;
    }
    if (url.toLowerCase().startsWith('http:') && !confirm('This portal uses unencrypted HTTP. Continue?')) return;
    var p = {name:name.value.trim(),portal:url,mac:address};
    if (!p.name) return;
    if (selected >= 0) profiles[selected] = p; else profiles.push(p);
    persist(); showHome();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === 'Backspace' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
      if (!editor.hidden) { event.preventDefault(); showHome(); }
    }
  });
  render();
}());