# safescript-loader

Browser auto-loader for `<script type="safescript">` tags. Uses [SafeScript](https://github.com/SafeScript/safescript) to sandbox inline and external scripts.

## Install

```bash
npm install safescript-loader safescript
```

Or use the standalone browser builds directly:

```html
<script src="safescript.min.js"></script>
<script src="safescript-loader.js"></script>
```

## Usage

### Inline scripts

```html
<script src="safescript.min.js"></script>
<script src="safescript-loader.js"></script>

<script>
  // Register capabilities the scripts can use
  SafeScriptLoader.register('math', Math);
  SafeScriptLoader.register('dom', {
    setText: function(id, text) {
      document.getElementById(id).textContent = text;
    }
  });
</script>

<script type="safescript">
/**
 * @needs math: Math
 * @needs dom
 */
var result = math.sqrt(144);
dom.setText('output', 'Square root: ' + result);
</script>

<p id="output"></p>

<script>
  // Process all safescript elements
  SafeScriptLoader.run();
</script>
```

### External .safe files

```html
<script type="safescript" src="handlers/compute.safe"></script>
```

### Auto-run on page load

```html
<script>
  SafeScriptLoader.register('math', Math);
  SafeScriptLoader.autoRun();  // Runs on DOMContentLoaded
</script>
```

## API

### `SafeScriptLoader.register(name, provider)`

Register a capability. The provider can be a value or a factory function (called each time the capability is resolved).

### `SafeScriptLoader.registerAll(providers)`

Register multiple capabilities at once: `{ name: value, ... }`.

### `SafeScriptLoader.run([rootElement])`

Find and run all `<script type="safescript">` elements. Returns an array of `{ el, result, error }` objects.

### `SafeScriptLoader.autoRun()`

Call `run()` on DOMContentLoaded (or immediately if the DOM is already ready).

### `SafeScriptLoader.resolve(caps)`

Resolve capabilities from the registry for a parsed header. Used internally but exposed for custom loaders.

## Events

Each script element fires a `safescript:done` event after execution, with `event.detail.result` containing the return value.

```html
<script type="safescript" id="my-script">
return 42;
</script>

<script>
  document.getElementById('my-script').addEventListener('safescript:done', function(e) {
    console.log('Result:', e.detail.result);  // 42
  });
  SafeScriptLoader.run();
</script>
```

## License

MIT — Gregory Magarshak
