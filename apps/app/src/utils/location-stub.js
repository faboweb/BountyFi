/**
 * Runs before main bundle (via Metro getModulesRunBeforeMainModule).
 * Defines `location` on all globals so code that reads location.search (e.g. RN debugger) does not throw.
 */
(function () {
  var stub = {
    href: '',
    origin: '',
    pathname: '/',
    search: '',
    hash: '',
    toString: function () { return ''; },
  };
  if (typeof global !== 'undefined') global.location = stub;
  if (typeof window !== 'undefined') window.location = stub;
  if (typeof globalThis !== 'undefined') globalThis.location = stub;
  if (typeof self !== 'undefined') self.location = stub;
})();
