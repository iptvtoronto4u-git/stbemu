(function (root) {
  'use strict';
  function validateProfile(name, portal, mac) {
    var n = String(name || '').trim();
    var url = String(portal || '').trim();
    var address = String(mac || '').trim().toUpperCase();
    if (!n || n.length > 60) return {ok:false, error:'Profile name must be 1–60 characters'};
    if (!/^https?:\/\//i.test(url) || /\s/.test(url) || url.length > 2048 ||
        !/^https?:\/\/[^\s/@?#]+(?::[0-9]{1,5})?(?:[/?#][^\s]*)?$/i.test(url) ||
        /@/.test(url.split('/')[2] || '')) return {ok:false,error:'Enter a valid HTTP(S) portal URL without credentials'};
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(address))
      return {ok:false,error:'Enter a valid six-octet MAC address'};
    return {ok:true, profile:{name:n,portal:url,mac:address},insecure:/^http:\/\//i.test(url)};
  }
  root.IPTVProfileUtils = {validateProfile:validateProfile};
}(typeof window !== 'undefined' ? window : this));
