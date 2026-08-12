The **recommended** production pattern: view + controller in two
files. The view is a declarative TSX file that returns a control
tree; the controller is a separate `*.controller.ts` that holds
state, event handlers, and lifecycle. Same layout as an XMLView,
only the view syntax changed.

```tsx
// View
export default class ControllerAsFile extends View {
    private readonly _controller = new ControllerAsFileController(
        "ui5.community.jsx.showcase.view.showcases.ControllerAsFile"
    );
    getController(): Controller { return this._controller; }
    createContent(): Control {
        return (
            <VBox>
                <Input value="{form>/name}" liveChange=".onLiveChange" />
                <Button text="Greet" press=".onGreet" />
            </VBox>
        );
    }
}
```

```ts
// Controller
export default class ControllerAsFileController extends Controller {
    onInit(): void { /* attach model, wire dependencies */ }
    onLiveChange(e: Input$LiveChangeEvent): void { /* … */ }
    onGreet(): void { /* … */ }
}
```

Every other showcase view folds these two into one file by
overriding `getController(): this` — convenient for a single-file
demo, but explicitly not what a real app should do. This chapter
is the pattern to copy for production code.

Concept reference: [Events](#/learn/events) and
[Nested views & embedding](#/learn/nested-views).

See also: [events-dot](#/explore/events-dot) — the one-file variant
of the same dot-handler wiring; [i18n](#/explore/i18n) — how the
same pattern combines with resource bundles.
