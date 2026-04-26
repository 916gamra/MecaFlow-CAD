import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls, STLExporter } from 'three-stdlib';
import { CSG } from 'three-csg-ts';
import { ZeroGapState } from '../types';

interface ThreeCanvasProps {
  config: ZeroGapState;
  gridVisible: boolean;
}

export interface ThreeCanvasRef {
  exportSTL: () => void;
}

const ThreeCanvas = forwardRef<ThreeCanvasRef, ThreeCanvasProps>(({ config, gridVisible }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const exportMeshRef = useRef<THREE.Mesh | null>(null);
  
  const [webglError, setWebglError] = useState<string | null>(null);

  // Expose export to parent
  useImperativeHandle(ref, () => ({
    exportSTL: () => {
      if (!exportMeshRef.current) return;
      const exporter = new STLExporter();
      
      const oldMat = exportMeshRef.current.material;
      exportMeshRef.current.material = new THREE.MeshStandardMaterial({ color: 0x888888 }); 
      const stlString = exporter.parse(exportMeshRef.current);
      exportMeshRef.current.material = oldMat;

      const blob = new Blob([stlString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'zero_gap_laser_export.stl';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }));

  // Initialization
  useEffect(() => {
    if (!containerRef.current) return;

    // WebGL Connection Test
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && 
          (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch (e) {
        return false;
      }
    };

    if (!checkWebGL()) {
      setWebglError("Veuillez activer l'accélération matérielle.");
      return;
    }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090A0C);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 2000);
    camera.position.set(200, 150, 250);
    cameraRef.current = camera;

    // Renderer Setup (with Safe Mode handling that we built previously)
    let renderer: THREE.WebGLRenderer;
    const initRenderer = (useSafeMode: boolean) => {
      const originalError = console.error;
      const originalWarn = console.warn;
      console.error = () => {}; console.warn = () => {};
      try {
        const options: THREE.WebGLRendererParameters = { antialias: !useSafeMode, alpha: true, powerPreference: useSafeMode ? 'default' : 'high-performance', precision: useSafeMode ? 'mediump' : 'highp' };
        let canvasParams: Record<string, any> = { alpha: true };
        if (useSafeMode) canvasParams.failIfMajorPerformanceCaveat = false;

        const newRenderer = new THREE.WebGLRenderer({ ...options, ...canvasParams });
        newRenderer.domElement.style.display = 'block';
        newRenderer.domElement.style.width = '100%';
        newRenderer.domElement.style.height = '100%';
        newRenderer.setSize(containerRef.current!.clientWidth, containerRef.current!.clientHeight);
        newRenderer.shadowMap.enabled = !useSafeMode;
        containerRef.current!.appendChild(newRenderer.domElement);
        return newRenderer;
      } finally {
        console.error = originalError; console.warn = originalWarn;
      }
    };

    try { renderer = initRenderer(false); } 
    catch (e) {
      try { renderer = initRenderer(true); } 
      catch (e2) { setWebglError("Fatal WebGL Error."); return; }
    }
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(100, 200, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xaaccff, 0.8);
    dirLight2.position.set(-100, -50, -100);
    scene.add(dirLight2);

    // Grid System
    const gridHelper = new THREE.GridHelper(500, 50, 0x333333, 0x1a1a1a);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!entries.length) return;
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && renderer && camera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false); 
        }
      });
    });
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (renderer && renderer.domElement) {
        renderer.dispose();
        renderer.domElement.remove();
      }
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Geometry Engine - Rebuilds on config change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || webglError) return;

    // Remove previous meshes
    const objectsToRemove = scene.children.filter(c => c.name.startsWith('zerogap_'));
    objectsToRemove.forEach(obj => {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else if (obj.material) obj.material.dispose();
      }
    });

    try {
      exportMeshRef.current = null;
      // 1. Generate Pan (Virtual Cutter) with Curved Wall and Bottom Fillet
      const r_bottom = config.pan.bottomDiameter / 2;
      const r_top = config.pan.topDiameter / 2;
      const height = config.pan.height;
      const rim_thickness = config.pan.rimThickness || 2.0;
      const curve_radius = config.pan.curveRadius || 100.0;
      const fillet_r = config.pan.bottomFilletRadius || 8.0;
      
      const points = [];
      // Center Point
      points.push(new THREE.Vector2(0, 0));
      
      // Bottom Fillet Arc
      const filletSegments = 16;
      for (let i = 0; i <= filletSegments; i++) {
        const theta = (Math.PI / 2) * (1 - i / filletSegments);
        const x = r_bottom - fillet_r + fillet_r * Math.cos(theta);
        const y = fillet_r - fillet_r * Math.sin(theta);
        points.push(new THREE.Vector2(x, y));
      }

      // Main Convex Side Arc
      const bulge_offset = Math.max(2.0, Math.min(20.0, (200.0 / curve_radius) * 4.0));
      const r_mid = (r_bottom + r_top) / 2.0 + bulge_offset;
      const z_mid = height / 2.0;

      const cx = 2 * r_mid - 0.5 * r_bottom - 0.5 * r_top;
      const cy = 2 * z_mid - 0.5 * 0 - 0.5 * height;

      const curve = new THREE.QuadraticBezierCurve(
        new THREE.Vector2(r_bottom, fillet_r),
        new THREE.Vector2(cx, cy),
        new THREE.Vector2(r_top, height)
      );
      
      const arcPoints = curve.getPoints(32);
      points.push(...arcPoints.slice(1));
      
      // Rim and Top Closing
      points.push(new THREE.Vector2(r_top + rim_thickness, height));
      points.push(new THREE.Vector2(r_top + rim_thickness, height + rim_thickness));
      points.push(new THREE.Vector2(0, height + rim_thickness));

      const panGeometry = new THREE.LatheGeometry(points, 64);
      
      const panMesh = new THREE.Mesh(panGeometry, new THREE.MeshStandardMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: config.renderMode === 'preview' ? 0.2 : 0.05,
        depthWrite: false,
        side: THREE.DoubleSide
      }));
      panMesh.name = 'zerogap_pan';
      scene.add(panMesh);

      // 2. Generate Tube (Main Body)
      const tw = config.tube.width;
      const th = config.tube.height;
      const tl = config.tube.totalLength;
      const tt = config.tube.thickness;
      const tr = config.tube.cornerRadius;
      const clearance = config.thermalClearance ? 0.1 : 0;

      // Outer Shape
      const outerShape = new THREE.Shape();
      const tx = -tw/2, ty = -th/2;
      outerShape.moveTo(tx + tr, ty);
      outerShape.lineTo(tx + tw - tr, ty);
      outerShape.quadraticCurveTo(tx + tw, ty, tx + tw, ty + tr);
      outerShape.lineTo(tx + tw, ty + th - tr);
      outerShape.quadraticCurveTo(tx + tw, ty + th, tx + tw - tr, ty + th);
      outerShape.lineTo(tx + tr, ty + th);
      outerShape.quadraticCurveTo(tx, ty + th, tx, ty + th - tr);
      outerShape.lineTo(tx, ty + tr);
      outerShape.quadraticCurveTo(tx, ty, tx + tr, ty);

      // Inner Hole
      const innerShape = new THREE.Path();
      const effective_tt = tt - clearance; // Simulate making the tube "looser" internally
      const itr = Math.max(0, tr - effective_tt);
      const itx = tx + effective_tt, ity = ty + effective_tt;
      const itw = tw - 2*effective_tt, ith = th - 2*effective_tt;
      
      if (itw > 0 && ith > 0) {
        innerShape.moveTo(itx + itr, ity);
        innerShape.lineTo(itx + itw - itr, ity);
        innerShape.quadraticCurveTo(itx + itw, ity, itx + itw, ity + itr);
        innerShape.lineTo(itx + itw, ity + ith - itr);
        innerShape.quadraticCurveTo(itx + itw, ity + ith, itx + itw - itr, ity + ith);
        innerShape.lineTo(itx + itr, ity + ith);
        innerShape.quadraticCurveTo(itx, ity + ith, itx, ity + ith - itr);
        innerShape.lineTo(itx, ity + itr);
        innerShape.quadraticCurveTo(itx, ity, itx + itr, ity);
        outerShape.holes.push(innerShape);
      }

      const tubeGeom = new THREE.ExtrudeGeometry(outerShape, {
        depth: tl,
        bevelEnabled: false,
        curveSegments: 16
      });
      
      const tubeMesh = new THREE.Mesh(tubeGeom, new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.5,
        roughness: 0.3
      }));

      // 3. Handle End Cutter (Tilt Plane at tail of tube)
      const handleAngleRad = (config.assembly.handleAngle || 10) * (Math.PI / 180);
      const handleCutterGeom = new THREE.BoxGeometry(tw * 4, th * 4, tl);
      handleCutterGeom.translate(0, 0, tl / 2); // Center of cut plane
      const handleCutterMesh = new THREE.Mesh(handleCutterGeom);
      handleCutterMesh.position.set(0, 0, tl);
      handleCutterMesh.rotation.x = -handleAngleRad;
      handleCutterMesh.updateMatrixWorld(true);

      // Apply Assembly Transformations
      const angleRad = (90 - config.assembly.tiltAngle) * (Math.PI / 180);
      const tiltAxis = config.assembly.tiltAxis || 'X';

      // Position logic: partLength determines where the pan starts cutting relative to tube start (0,0,0)
      panMesh.position.set(0, 0, config.tube.partLength);
      
      // Orient the tube
      tubeMesh.position.set(0, config.assembly.heightOffset, -config.assembly.insertionDistance);
      if (tiltAxis === 'X') {
        tubeMesh.rotation.x = angleRad;
      } else {
        tubeMesh.rotation.z = angleRad;
      }
      
      tubeMesh.updateMatrixWorld(true);
      panMesh.updateMatrixWorld(true);

      if (config.renderMode === 'preview') {
        tubeMesh.name = 'zerogap_tube_preview';
        
        const edges = new THREE.EdgesGeometry(tubeGeom);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0x333333 } ) );
        tubeMesh.add(line);
        
        scene.add(tubeMesh);
        scene.add(handleCutterMesh); // Show cutter in preview
        handleCutterMesh.name = 'zerogap_handle_cutter_preview';
        handleCutterMesh.material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.1 });
        
        exportMeshRef.current = tubeMesh; 
      } 
      else {
        // Run CSG Operation (Zero-Gap)
        const tubeBSP = CSG.fromMesh(tubeMesh);
        const panBSP = CSG.fromMesh(panMesh);
        const handleBSP = CSG.fromMesh(handleCutterMesh);
        
        // Subtract Pan and Handle Cutter from Tube
        let resultBSP = tubeBSP.subtract(panBSP).subtract(handleBSP);
        
        // Twin Nesting Logic
        if (config.nestingMode === 'twin') {
          // Invert the result for the twin
          // Mirroring is a bit tricky with BSP, we can export mesh and mirror mesh then BSP again or use matrix
          const singleMesh = CSG.toMesh(resultBSP, new THREE.Matrix4());
          const twinMesh = singleMesh.clone();
          
          // Mirror across the handle cut plane
          // The handle plane is at Z=tl with handleAngle
          // Roughly, we can rotate 180 around the handle plane normal
          // Or just rotate 180 and translate
          twinMesh.rotateX(Math.PI);
          twinMesh.rotateZ(Math.PI);
          
          // Position relative to first part
          // We want the slanted faces to be close
          twinMesh.position.z = (tl * 2) + (config.slugGap || 5);
          
          const twinBSP = CSG.fromMesh(twinMesh);
          resultBSP = resultBSP.union(twinBSP);
        }

        // Create Result Mesh
        const resultMat = new THREE.MeshStandardMaterial({
          color: 0xF27D26, // Orange accent
          metalness: 0.6,
          roughness: 0.4,
          side: THREE.DoubleSide
        });
        
        const finalMesh = CSG.toMesh(resultBSP, tubeMesh.matrixWorld, resultMat);
        finalMesh.name = 'zerogap_result';
        
        finalMesh.geometry.computeVertexNormals();

        // Simulated rounding if config.addFillet is true (visual effect with edges)
        const edges = new THREE.EdgesGeometry(finalMesh.geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { 
          color: config.addFillet ? 0xffffff : 0x000000, 
          opacity: 0.2, 
          transparent: true 
        } ) );
        finalMesh.add(line);

        scene.add(finalMesh);
        exportMeshRef.current = finalMesh;
      }
    } catch (e) {
      console.error("Zero-Gap Engine Error:", e);
    }
    
    // Grid visibility
    const gridHelper = scene.children.find(c => c instanceof THREE.GridHelper);
    if (gridHelper) gridHelper.visible = gridVisible;

  }, [config, gridVisible, webglError]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-neutral-900 rounded-lg overflow-hidden relative flex items-center justify-center text-center" id="three-container">
      {webglError && (
        <div className="max-w-md bg-red-500/10 border border-red-500/20 p-6 rounded-xl backdrop-blur-sm">
          <h3 className="text-red-500 font-bold mb-2 uppercase tracking-widest text-sm">Précision Graphique Limitée</h3>
          <p className="text-xs text-[var(--text-dim)] leading-relaxed mb-4">{webglError}</p>
        </div>
      )}
    </div>
  );
});

export default ThreeCanvas;
