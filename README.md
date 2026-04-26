# Zero-Gap Laser CAD Pro ⚡

## Overview
**Zero-Gap Laser CAD Pro** is a specialized web-based CAD engine designed for the kitchenware manufacturing industry. Its primary purpose is to generate high-precision aluminum handle connectors that perfectly match the curved profile of pans, achieving a "Zero-Gap" fit for seamless welding.

The application leverages **Three.js** for interactive 3D rendering and **Constructive Solid Geometry (CSG)** for complex boolean operations, allowing users to design, nest, and export factory-ready geometry.

---

## Key Features

### 📐 Geometry Engine
- **Frustum Pan Cutter**: Simulates the pan shape using a truncated cone (frustum) with a configurable quadratic bezier curve for the side walls and a smooth bottom fillet.
- **Parametric Tube Body**: Fully adjustable elliptical/rounded-rectangular tube cross-sections with variable wall thickness.
- **Zero-Gap Matching**: Uses boolean subtraction to carve the exact profile of the pan out of the tube body at specific tilt angles and axes (X/Y).

### 🔧 Manufacturing Optimization
- **Twin Nesting (Double Production)**: Automatically generates two mirrored parts joined at the handle-end slanted face. This maximizes material usage and provides a "common line" for the laser cutter.
- **Handle End Tapering**: Cuts the rear end of the tube at a specific angle (Handle Angle) to match the black handle ergonomic requirements.
- **Thermal Clearance**: Adds a +0.1mm internal expansion to the tube cavity to facilitate easier mechanical assembly before welding.
- **Edge Softening**: Visual and geometric support for 0.2mm edge fillets to reduce sharp burrs.

### 📥 Industrial Export
- **STEP Export Support**: Integration for exporting clean, manifold B-Rep geometry (simulated via high-quality mesh conversion for industrial use).
- **Interactive Preview**: Real-time 3D viewport with transparency and grid helpers.

---

## Technical Stack
- **Framework**: React 18 + Vite
- **3D Graphics**: Three.js
- **CSG Engine**: `three-csg-ts`
- **UI/Styles**: Tailwind CSS
- **Language**: TypeScript

---

## Arabic Interface (Manufacturing Focus)
The control panel is localized in Arabic to cater to factory operators and engineers in the MENA region, using industry-standard terminology:
- **القطر السفلي (Bottom Diameter)**
- **التعشيش (Nesting)**
- **تخليص حراري (Thermal Clearance)**

---

## Documentation for Developers
- See [ENGINEERING.md](./ENGINEERING.md) for detailed mathematical logic and CSG workflow.
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for build and setup instructions.
