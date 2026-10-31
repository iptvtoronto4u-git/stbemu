const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('smart-tv/shared/profile-utils.js','utf8');
const context = {}; vm.runInNewContext(source,context);
const validate = context.IPTVProfileUtils.validateProfile;
function ok(name,url,mac) { const r=validate(name,url,mac); assert.equal(r.ok,true,r.error); return r; }
function bad(name,url,mac) { assert.equal(validate(name,url,mac).ok,false); }
assert.equal(ok(' Living room ','https://example.org/portal','00:1a:79:ab:cd:ef').profile.mac,'00:1A:79:AB:CD:EF');
assert.equal(ok('Test','http://example.org','00:1A:79:00:00:01').insecure,true);
assert.equal(ok('Test','https://example.org','00:1A:79:00:00:01').insecure,false);
bad('','https://example.org','00:1A:79:00:00:01');
bad('Test','javascript:alert(1)','00:1A:79:00:00:01');
bad('Test','https://user:password@example.org','00:1A:79:00:00:01');
bad('Test','https://example.org','00:1A:79:00:00:ZZ');
bad('Test','https://example.org','00:1A:79:00:00');
console.log('Profile validation tests passed');
