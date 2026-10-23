/**
 * safescript-loader tests.
 * Tests the Node-exported module (registry + resolve logic).
 * Browser DOM integration requires a browser environment.
 */
'use strict';

var SafeScriptLoader = require('./index');

// Mock SafeScript global for the loader
global.SafeScript = require('safescript');

var pass = 0, fail = 0;

function assert(cond, msg) {
  if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); }
}

function eq(a, b, msg) {
  var as = JSON.stringify(a), bs = JSON.stringify(b);
  if (as === bs) { pass++; } else { fail++; console.log('FAIL: ' + msg + '\n  expected: ' + bs + '\n  got:      ' + as); }
}

// ── Registry ───────────────────────────────────────────────────

(function() {
  SafeScriptLoader.register('math', Math);
  SafeScriptLoader.register('console', function() { return { log: function() {} }; });

  // Resolve with needs
  var caps = { needs: [{ name: 'math', type: 'Math' }], uses: [] };
  var scope = SafeScriptLoader.resolve(caps);
  eq(scope.math, Math, 'resolve: math from registry');

  // Resolve with uses (also resolved)
  var caps2 = { needs: [], uses: [{ name: 'console', type: 'Console' }] };
  var scope2 = SafeScriptLoader.resolve(caps2);
  assert(typeof scope2.console === 'object', 'resolve: console from function provider');
  assert(typeof scope2.console.log === 'function', 'resolve: console.log is function');

  // Resolve with unknown capability — not in scope
  var caps3 = { needs: [{ name: 'unknown', type: null }], uses: [] };
  var scope3 = SafeScriptLoader.resolve(caps3);
  eq(scope3.unknown, undefined, 'resolve: unknown not in scope');
})();

// ── registerAll ────────────────────────────────────────────────

(function() {
  var myUtils = { add: function(a,b) { return a + b; } };
  SafeScriptLoader.registerAll({
    utils: myUtils,
    version: '1.0'
  });

  var caps = { needs: [{ name: 'utils', type: null }], uses: [{ name: 'version', type: null }] };
  var scope = SafeScriptLoader.resolve(caps);
  assert(scope.utils === myUtils, 'registerAll: utils resolved');
  eq(scope.version, '1.0', 'registerAll: version resolved');
})();

// ── Resolve only declared caps ─────────────────────────────────

(function() {
  // Even though math, console, JSON, Array are registered,
  // resolve only returns what the header declares
  var caps = { needs: [{ name: 'math', type: null }], uses: [] };
  var scope = SafeScriptLoader.resolve(caps);
  assert(scope.math !== undefined, 'selective: math present');
  assert(scope.console === undefined, 'selective: console absent (not declared)');
  assert(scope.JSON === undefined, 'selective: JSON absent (not declared)');
})();

// ── Empty header ───────────────────────────────────────────────

(function() {
  var caps = { needs: [], uses: [] };
  var scope = SafeScriptLoader.resolve(caps);
  eq(Object.keys(scope).length, 0, 'empty header: empty scope');
})();

// ── Summary ────────────────────────────────────────────────────

console.log('\nsafescript-loader tests: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
