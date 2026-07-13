# Fragments

"Fragment" means two unrelated things in UI5. Both work in TSX,
and mixing them up is a common trip. Read both senses.

## Sense 1: JSX fragments

Group siblings without adding a wrapper control:

```tsx
<VBox>
    <>
        <Label text="Name" />
        <Text text="Ada Lovelace" />
    </>
    <Button text="Save" />
</VBox>
```

The `<VBox>` ends up with three items: Label, Text, Button. The
fragment dissolves. Helper functions can return more than one
control:

```tsx
function labelledValue(label: string, value: string): Control {
    return <><Label text={label}/><Text text={value}/></>;
}

<VBox>
    {labelledValue("Name", "Ada")}
    {labelledValue("Role", "Mathematician")}
</VBox>
```

Zero DOM footprint, no lifecycle, no id namespace.

## Sense 2: UI5 fragment factories (`*.fragment.tsx`)

A reusable chunk of UI *without its own controller*, the TSX
equivalent of `*.fragment.xml`. Exports a factory function:

```tsx
// HelloDialog.fragment.tsx
export default function HelloDialog(): Dialog {
    return (
        <Dialog title="Hello" endButton={<Button text="Close" press=".onCloseDialog"/>}>
            <Text text="No controller of my own."/>
        </Dialog>
    );
}
```

The calling view mounts it, then opens it:

```tsx
onOpen(): void {
    this._dialog ??= HelloDialog();
    this.addDependent(this._dialog);
    this._dialog.open();
}

onCloseDialog(): void {
    this._dialog?.close();
}
```

`addDependent` splices the dialog into the caller's dependents
aggregation. The dialog's parent chain now leads back to the
view, so `.onCloseDialog` from the Close button resolves on
this view's controller via the [dot-handler walk](/#/learn/events#dot-handler-strings).

Mount the same fragment from a different view and it resolves
against *that* view. Truly controller-less.

## Which one am I looking at?

- **`<>...</>`** in JSX: sense 1. Grouping siblings.
- **`Foo.fragment.tsx`** file exporting a factory: sense 2.
  Controller-less reusable UI. The filename is convention; the
  runtime doesn't inspect it.

Fragment factories are one rung in the broader
[embedding ladder](/#/learn/nested-views). See both senses in
[fragments](/#/explore/fragments), [fragment-fn](/#/explore/fragment-fn),
and [fragment-dialog](/#/explore/fragment-dialog).
