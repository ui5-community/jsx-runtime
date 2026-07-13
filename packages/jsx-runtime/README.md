# `@ui5-community/jsx-runtime`

A plugin-based JSX runtime for UI5, write UI5 views as `.tsx` files with per-control TypeScript typing. No React, no VDOM, no reconciler. JSX expressions compile to plain `new Control(settings)` calls.

```tsx
import Page from "sap/m/Page";
import Button from "sap/m/Button";
import View from "sap/ui/core/mvc/View";

export default class Hello extends View {
    createContent() {
        return (
            <Page title="Hello">
                <Button text="Click me" press=".onPress" />
            </Page>
        );
    }
}
```

## Install

```bash
pnpm add @ui5-community/jsx-runtime
pnpm add -D @babel/plugin-transform-react-jsx@^7
```

Pin the Babel plugin to **v7** (`@^7`) — the v8 major changed the plugin API and the JSX transform fails against it. It's an optional peer dependency that `ui5-tooling-transpile` (≥ 3.12) loads for you.

Enable the JSX transform in `ui5.yaml` — no `.babelrc.json` needed. `ui5-tooling-transpile` assembles the TypeScript/UI5/env presets from your `tsconfig.json` + browserslist, and `transformJSX` adds the JSX plugin:

```yaml
customConfiguration:
  config-ui5-tooling-transpile: &cfgTranspile
    transformJSX:
      runtime: automatic
      importSource: "ui5/community/jsx/runtime"
```

Configure TypeScript:

```json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "jsxImportSource": "ui5/community/jsx/runtime",
        "types": ["@openui5/types", "@ui5-community/jsx-runtime"]
    }
}
```

Declare the library in your app's `manifest.json`:

```json
{
    "sap.ui5": {
        "dependencies": {
            "libs": {
                "ui5.community.jsx.runtime": {}
            }
        }
    }
}
```

Finally, make sure UI5's loader can find the runtime's modules. When
the UI5 tooling serves your app it resolves them automatically. If you
bootstrap UI5 **from a CDN**, add an explicit resource root pointing
the `ui5.community.jsx.runtime` namespace at wherever you serve the
package's `dist/resources`:

```html
<script id="sap-ui-bootstrap"
    src="https://sdk.openui5.org/resources/sap-ui-core.js"
    data-sap-ui-libs="sap.m,ui5.community.jsx.runtime"
    data-sap-ui-resource-roots='{
        "ui5.community.jsx.runtime": "./resources/ui5/community/jsx/runtime/"
    }'
    data-sap-ui-compat-version="edge"></script>
```

## What you get

Three layers of API surface:

1. **Core**: `jsx`, `jsxs`, `Fragment`, `<For>`, `<If>`. Always available.
2. **Plugin SPI**: five extension points (`Renderer`, `IntrinsicHandler`, `PropertyApplier`, `ChildrenProcessor`, `Scope`) let plugins add directives, intrinsics, and output adapters without touching the core.
3. **Sample plugin**: `<Switch>`/`<Case>`/`<Default>` in [`src/plugins/switch/`](src/plugins/switch/) demonstrates the SPI on a non-trivial example.

Read [the full concept documentation](https://github.com/ui5-community/jsx-runtime/blob/main/docs/jsx-runtime.md) for the walkthrough.

## Example: opting a plugin in

```tsx
import { withScope } from "ui5/community/jsx/runtime";
import { Switch, Case, Default, switchProcessor } from "ui5/community/jsx/runtime/plugins/switch";

createContent() {
    return withScope({ childrenProcessors: [switchProcessor] }, () => (
        <VBox>
            <Switch on={kind}>
                <Case when="info"><Title text="Info" /></Case>
                <Case when="warn"><Title text="Warning" /></Case>
                <Default>          <Title text="—"        /></Default>
            </Switch>
        </VBox>
    ));
}
```

## License

[Apache License 2.0](LICENSE).
