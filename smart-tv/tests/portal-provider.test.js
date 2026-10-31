const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = {};
vm.runInNewContext(fs.readFileSync('smart-tv/shared/portal-provider.js','utf8'),context);
assert.throws(() => new context.IPTVPortalProvider(null));
const adapter = new context.IPTVPortalProvider({portal:'https://example.org',mac:'00:1A:79:00:00:01'});
['checkConnectivity','authenticate','listCategories','listChannels','getPlaybackUrl'].forEach(method => {
  let called=false;
  adapter[method](function (error) {
    called=true;
    assert.equal(error.code,'PROVIDER_INTEGRATION_REQUIRED');
  });
  assert.equal(called,true);
});
adapter.logout(error => assert.equal(error,null));
console.log('Portal provider contract tests passed');
