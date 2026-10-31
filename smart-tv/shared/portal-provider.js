/* Provider adapter contract: NO undocumented portal calls or device spoofing.
 * Implement an adapter only after the provider approves the authentication API.
 */
(function (root) {
  'use strict';
  function unsupported(callback) {
    callback({code:'PROVIDER_INTEGRATION_REQUIRED',
      message:'New4K has not supplied an approved Smart TV portal API. Contact the provider for connection details.'});
  }
  function PortalProvider(profile) {
    if (!profile || !profile.portal || !profile.mac) throw new Error('A saved portal profile is required');
    this.profile = profile;
  }
  PortalProvider.prototype.checkConnectivity = function (callback) { unsupported(callback); };
  PortalProvider.prototype.authenticate = function (callback) { unsupported(callback); };
  PortalProvider.prototype.listCategories = function (callback) { unsupported(callback); };
  PortalProvider.prototype.listChannels = function (callback) { unsupported(callback); };
  PortalProvider.prototype.getPlaybackUrl = function (callback) { unsupported(callback); };
  PortalProvider.prototype.logout = function (callback) { callback(null); };
  root.IPTVPortalProvider = PortalProvider;
}(typeof window !== 'undefined' ? window : this));
