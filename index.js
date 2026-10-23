/**
 * safescript-loader — Browser auto-loader for <script type="safescript"> tags.
 *
 * Finds all <script type="safescript"> elements in the DOM,
 * compiles and runs them through SafeScript with configured capabilities.
 *
 * Usage:
 *   <script src="safescript.min.js"></script>
 *   <script src="safescript-loader.js"></script>
 *   <script>
 *     SafeScriptLoader.register('math', function() { return Math; });
 *     SafeScriptLoader.run();
 *   </script>
 *
 *   <script type="safescript" data-needs="math">
 *     return math.sqrt(16);
 *   </script>
 *
 * Or with src:
 *   <script type="safescript" src="handler.safe"></script>
 */
(function(root) {
  'use strict';

  var registry = Object.create(null);
  var results = [];

  var SafeScriptLoader = {
    /**
     * Register a capability provider.
     * @param {string} name - Capability name (matches @needs/@uses declarations)
     * @param {*|Function} provider - The capability value, or a function that returns it
     */
    register: function(name, provider) {
      registry[name] = provider;
    },

    /**
     * Register multiple capabilities at once.
     * @param {Object} providers - { name: value|function, ... }
     */
    registerAll: function(providers) {
      var keys = Object.keys(providers);
      for (var i = 0; i < keys.length; i++) {
        registry[keys[i]] = providers[keys[i]];
      }
    },

    /**
     * Resolve capabilities from the registry for a parsed header.
     * @param {Object} caps - Parsed header from SafeScript.capabilities()
     * @returns {Object} scope
     */
    resolve: function(caps) {
      var scope = Object.create(null);
      var all = (caps.needs || []).concat(caps.uses || []);
      for (var i = 0; i < all.length; i++) {
        var name = all[i].name;
        if (registry[name] !== undefined) {
          var provider = registry[name];
          scope[name] = typeof provider === 'function' ? provider() : provider;
        }
      }
      return scope;
    },

    /**
     * Process a single script element.
     * @param {HTMLScriptElement} el - The <script type="safescript"> element
     * @returns {*} The result of running the script
     */
    processElement: function(el) {
      var source = el.textContent || '';
      var src = el.getAttribute('src');

      if (src) {
        // Load from external .safe file
        var xhr = new XMLHttpRequest();
        xhr.open('GET', src, false);  // Synchronous for simplicity
        xhr.send();
        if (xhr.status === 200) {
          source = xhr.responseText;
        } else {
          throw new Error('Failed to load ' + src + ': ' + xhr.status);
        }
      }

      if (!source.trim()) return Promise.resolve(undefined);

      return SafeScript.load(source, function(caps) {
        var scope = SafeScriptLoader.resolve(caps);

        // Also resolve data-needs/data-uses attributes (shorthand)
        var dataNeedsList = el.getAttribute('data-needs');
        if (dataNeedsList) {
          var names = dataNeedsList.split(',');
          for (var i = 0; i < names.length; i++) {
            var name = names[i].trim();
            if (name && registry[name] !== undefined && !scope[name]) {
              var provider = registry[name];
              scope[name] = typeof provider === 'function' ? provider() : provider;
            }
          }
        }

        // Expose the element itself as `el` if not already in scope
        if (!scope.el) scope.el = el;

        return scope;
      }).then(function(bundle) {
        return SafeScript.run(bundle);
      }).then(function(result) {
        // Store result on the element
        el._safescriptResult = result;

        // Fire a custom event
        var event;
        try {
          event = new CustomEvent('safescript:done', { detail: { result: result } });
        } catch(e) {
          event = document.createEvent('CustomEvent');
          event.initCustomEvent('safescript:done', true, true, { result: result });
        }
        el.dispatchEvent(event);

        return result;
      });
    },

    /**
     * Find and run all <script type="safescript"> elements in the document.
     * @param {Element} [root] - Root element to search (default: document)
     * @returns {Array} Results from each script
     */
    run: function(rootEl) {
      var container = rootEl || document;
      var scripts = container.querySelectorAll('script[type="safescript"]');
      var promises = [];

      for (var i = 0; i < scripts.length; i++) {
        (function(el, idx) {
          var p = SafeScriptLoader.processElement(el).then(function(result) {
            return { el: el, result: result, error: null };
          }).catch(function(e) {
            if (typeof console !== 'undefined' && console.error) {
              console.error('SafeScript error in element ' + idx + ':', e.message);
            }
            return { el: el, result: null, error: e };
          });
          promises.push(p);
        })(scripts[i], i);
      }

      return Promise.all(promises).then(function(r) {
        results = r;
        return r;
      });
    },

    /**
     * Get results from the last run() call.
     * @returns {Array}
     */
    results: function() {
      return results;
    },

    /**
     * Auto-run on DOMContentLoaded.
     * Call this once during setup.
     */
    autoRun: function() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          SafeScriptLoader.run();
        });
      } else {
        SafeScriptLoader.run();
      }
    }
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SafeScriptLoader;
  } else {
    root.SafeScriptLoader = SafeScriptLoader;
  }

})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this);
