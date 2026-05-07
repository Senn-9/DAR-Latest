# Canvass Live Preview Resizable Table

This document explains how the resizable columns and rows were added to `components/Canvassing/CanvassLivePreview.tsx`.

## Goal

The table in the canvass live preview was updated so users can manually adjust:

- column widths
- row heights

This makes the preview easier to work with when descriptions are long or when the layout needs more space.

## What Changed

### 1. Added state for sizing

The component now keeps track of:

- `columnWidths` for each table column
- `rowHeights` for each row
- resize state such as the active column/row being dragged
- mouse starting coordinates for drag calculations

### 2. Added drag handles

Each table header now has a thin resize handle on the right edge.

Each data row now has a thin resize handle at the bottom edge.

These handles use `onMouseDown` to start a resize operation.

### 3. Added mouse move / mouse up listeners

When a resize starts, the component attaches global mouse listeners:

- `mousemove` updates the width or height while dragging
- `mouseup` stops resizing and removes the listeners

This allows the resize action to continue smoothly even if the pointer leaves the table area.

### 4. Applied sizes directly to table cells

The state values are applied through inline `style` props on:

- table header cells
- table body cells
- table rows

That keeps the layout responsive to the current drag position.

### 5. Kept existing table behavior

The following features were left intact:

- add row
- remove row
- move row up/down
- edit item fields
- print RFQ preview

## How It Works

### Column resizing flow

1. User presses down on a column resize handle.
2. The component stores the selected column and current mouse X position.
3. While the mouse moves, the width is updated based on the horizontal delta.
4. Releasing the mouse ends the resize.

### Row resizing flow

1. User presses down on a row resize handle.
2. The component stores the selected row and current mouse Y position.
3. While the mouse moves, the height is updated based on the vertical delta.
4. Releasing the mouse ends the resize.

## Notes

- Minimum widths and heights are enforced so the table cannot collapse too far.
- The resize handles are visually subtle but still easy to grab.
- The sizing is local to the component state, so it persists while the modal stays open.

## File Updated

- `components/Canvassing/CanvassLivePreview.tsx`
