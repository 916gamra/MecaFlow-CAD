# Development Guide 🛠️

## Project Structure
- `src/components/ThreeCanvas.tsx`: The "Heart" of the app. Contains the geometry generation and CSG engine logic.
- `src/components/ZeroGapControlPanel.tsx`: The UI controller. Handles state updates and localized labeling.
- `src/types.ts`: Central source of truth for the `ZeroGapState` configuration object.
- `src/App.tsx`: Main entry point, state management, and layout.

## Adding a New Parameter
To add a new geometric feature (e.g., "Hole Diameter"):
1. Update `ZeroGapState` in `src/types.ts`.
2. Add the default value in `App.tsx`.
3. Add a slider/input in `ZeroGapControlPanel.tsx`.
4. Implement the logic in the `generateGeometry` function inside `ThreeCanvas.tsx`.

## CSG Troubleshooting
If the boolean operation fails (becomes invisible):
1. **Check for Coplanar Faces**: Ensure cutters are slightly larger than the target.
2. **Compute Normals**: Always call `geometry.computeVertexNormals()` after a CSG operation.
3. **Degenerate Triangles**: If inputs are 0 or too small, the CSG engine will crash. Added guards `Math.max(0.1, ...)` are critical.

## Build Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production (Dist folder)
npm run lint     # Check for TS errors
```
