# Engineering & Mathematical Logic 🧠

This document details the geometric principles used in the **Zero-Gap Laser CAD Pro** engine.

## 1. Pan Surface Modeling (The Cutter)

The pan is modeled as a surface of revolution (Lathe) using a series of defined points:

### The Quadratic Bezier Side Wall
To match real-world pan "bulge", we don't use a simple line. We use a **Quadratic Bezier Curve**.
- **P0**: Bottom Fillet Tip `(r_bottom, fillet_r)`
- **P1 (Control Point)**: Calculated based on `curveRadius`.
- **P2**: Top Rim `(r_top, height)`

The control point calculation uses a `bulge_offset`:
```typescript
const bulge_offset = Math.max(2.0, Math.min(20.0, (200.0 / curve_radius) * 4.0));
const r_mid = (r_bottom + r_top) / 2.0 + bulge_offset;
const cx = 2 * r_mid - 0.5 * r_bottom - 0.5 * r_top;
```
This ensures that as `curveRadius` decreases, the pan becomes more "rounded" or "fat".

### The Bottom Fillet
A 90-degree arc is used to transition from the flat bottom `(0, 0)` to the side wall. This prevents sharp "dead zones" where the handle wouldn't touch the pan surface.

---

## 2. The Zero-Gap Boolean Operation

The core "cutting" logic relies on the **Subtraction Pattern**:
$$ Result = Tube - (Pan \cup HandleCutter) $$

### Coordinate Alignment
1. The **Tube** is the base object, oriented along the Z-axis.
2. The **Pan** is translated by `partLength` along the Z-axis.
3. The **Tilt Angle** is applied to the tube itself, simulating how it is held against the laser head or the pan surface during assembly.

---

## 3. Twin Nesting Logic (The "Common Line")

When `nestingMode` is set to `twin`, the engine performs a complex transformation:
1. **Part A**: The standard single handle part.
2. **Handle Plane**: A plane at `Z = totalLength` tilted by `-handleAngle`.
3. **Mirror Transformation**:
   - The engine clones Part A.
   - It performs a 180-degree rotation around the X and Z axes.
   - It translates the twin by `(totalLength * 2) + slugGap`.
4. **Union**: The two pieces are fused into a single manifold object.

This allows the factory to cut two pieces in one go, with the rear slanted faces sharing a single cut path (Common Line).

---

## 4. Performance Constraints

### Mesh Density
- **Lathe Segments**: 64 (higher results in too many triangles for CSG).
- **Tube Extrusion**: 16 curve segments.
This balance ensures the CSG operation completes in `< 500ms` on average hardware while maintaining industrial precision (>0.01mm).

### CSG Manifold Safety
To ensure successful boolean operations:
- All geometries are "Closed Solids" (Water-tight).
- The `handleCutter` always exceeds the tube dimensions (`tw * 4`, `th * 4`) to prevent "coplanar edge" errors in the BSP tree.
