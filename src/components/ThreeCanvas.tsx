import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls, STLExporter, STLLoader } from 'three-stdlib';
import { CSG } from 'three-csg-ts';
import { ZeroGapState } from '../types';
import { validateTubeConfig, validatePanConfig } from '../lib/validators';
import { performanceOptimizer } from '../lib/performanceOptimizer';

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
  const hasAutoCentered = useRef<boolean>(false);
  const lastStlName = useRef<string | undefined>(config.tube.customStlName);
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

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      performanceOptimizer.measureFPS();
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
    
    try {
      validateTubeConfig(config.tube);
      validatePanConfig(config.pan);
    } catch (err: any) {
      console.warn('Geometry validation failed:', err.message);
      return;
    }

    // Remove previous meshes
    const objectsToRemove = scene.children.filter(c => c.name.startsWith('zerogap_'));
    const disposeDeep = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else if (obj.material) obj.material.dispose();
      }
      obj.children.forEach(child => disposeDeep(child));
    };

    objectsToRemove.forEach(obj => {
      scene.remove(obj);
      disposeDeep(obj);
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
      const add_rim = config.pan.addRim;
      const rim_height = config.pan.rimHeight || 3.0;
      
      const points = [];
      // Center Point
      points.push(new THREE.Vector2(0, 0));
      
      // Bottom Fillet Arc
      const filletSegments = 16;
      if (fillet_r > 0) {
        for (let i = 0; i <= filletSegments; i++) {
          const theta = (Math.PI / 2) * (1 - i / filletSegments);
          const x = r_bottom - fillet_r + fillet_r * Math.cos(theta);
          const y = fillet_r - fillet_r * Math.sin(theta);
          points.push(new THREE.Vector2(x, y));
        }
      } else {
        points.push(new THREE.Vector2(r_bottom, 0));
      }

      // Main Convex Side Arc
      const bulge_offset = Math.max(2.0, Math.min(20.0, (200.0 / curve_radius) * 4.0));
      const r_mid = (r_bottom + r_top) / 2.0 + bulge_offset;
      const z_mid = height / 2.0;

      const cx = 2 * r_mid - 0.5 * r_bottom - 0.5 * r_top;
      const cy = 2 * z_mid - 0.5 * fillet_r - 0.5 * height;

      const curve = new THREE.QuadraticBezierCurve(
        new THREE.Vector2(r_bottom, fillet_r),
        new THREE.Vector2(cx, cy),
        new THREE.Vector2(r_top, height)
      );
      
      const arcPoints = curve.getPoints(32);
      points.push(...arcPoints.slice(1));
      
      // Rim and Top Closing
      if (add_rim) {
        points.push(new THREE.Vector2(r_top + rim_thickness, height));
        points.push(new THREE.Vector2(r_top + rim_thickness, height + rim_height));
        points.push(new THREE.Vector2(0, height + rim_height));
      } else {
        points.push(new THREE.Vector2(r_top + rim_thickness, height));
        points.push(new THREE.Vector2(r_top + rim_thickness, height + rim_thickness));
        points.push(new THREE.Vector2(0, height + rim_thickness));
      }

      const finalPoints = [];
      for (const pt of points) {
        if (finalPoints.length === 0 || !finalPoints[finalPoints.length - 1].equals(pt)) {
          finalPoints.push(pt);
        }
      }

      const panGeometry = new THREE.LatheGeometry(finalPoints, 64);
      
      const panMesh = new THREE.Mesh(panGeometry, new THREE.MeshStandardMaterial({
        color: 0xff3333,
        side: THREE.DoubleSide
      }));
      panMesh.name = 'zerogap_pan';
      // Do not add to scene for Solid View - keep it hidden, only use wireframe
      // scene.add(panMesh);

      // Wireframe for exact visualization
      const panWireframe = new THREE.Mesh(panGeometry, new THREE.MeshBasicMaterial({
        color: 0x00E5FF, // Neon blue wireframe
        wireframe: true,
        transparent: true,
        opacity: 0.4
      }));
      panWireframe.name = 'zerogap_pan_wireframe';
      scene.add(panWireframe);

      // 2. Generate Tube (Main Body)
      let tubeGeom: THREE.BufferGeometry;
      
      const tw = config.tube.width;
      const th = config.tube.shape === 'دائري' ? tw : config.tube.height;
      const tl = config.tube.totalLength;
      
      if (config.tube.shape === 'مخصص' && config.tube.customStlBuffer) {
        const loader = new STLLoader();
        tubeGeom = loader.parse(config.tube.customStlBuffer);
        // Center the geometry so it behaves well with the engine
        tubeGeom.center();
        tubeGeom.computeVertexNormals();
        // Since custom STL might not be extruded along Z we compute bounds and shift it appropriately if needed, but centering is safe
      } else {
        const tt = config.tube.thickness;
        const tr = config.tube.shape === 'دائري' ? tw / 2 : config.tube.cornerRadius;
        const clearance = config.thermalClearance ? 0.1 : 0;

        // Outer Shape
        const outerShape = new THREE.Shape();
        const tx = -tw/2, ty = -th/2;
        if (tr > 0) {
          outerShape.moveTo(tx + tr, ty);
          outerShape.lineTo(tx + tw - tr, ty);
          outerShape.quadraticCurveTo(tx + tw, ty, tx + tw, ty + tr);
          outerShape.lineTo(tx + tw, ty + th - tr);
          outerShape.quadraticCurveTo(tx + tw, ty + th, tx + tw - tr, ty + th);
          outerShape.lineTo(tx + tr, ty + th);
          outerShape.quadraticCurveTo(tx, ty + th, tx, ty + th - tr);
          outerShape.lineTo(tx, ty + tr);
          outerShape.quadraticCurveTo(tx, ty, tx + tr, ty);
        } else {
          outerShape.moveTo(tx, ty);
          outerShape.lineTo(tx + tw, ty);
          outerShape.lineTo(tx + tw, ty + th);
          outerShape.lineTo(tx, ty + th);
          outerShape.lineTo(tx, ty);
        }

        // Inner Hole
        const innerShape = new THREE.Path();
        const effective_tt = tt - clearance;
        const itr = Math.max(0, tr - effective_tt);
        const itx = tx + effective_tt, ity = ty + effective_tt;
        const itw = tw - 2*effective_tt, ith = th - 2*effective_tt;
        
        if (itw > 0 && ith > 0) {
          if (itr > 0) {
            innerShape.moveTo(itx + itr, ity);
            innerShape.lineTo(itx + itw - itr, ity);
            innerShape.quadraticCurveTo(itx + itw, ity, itx + itw, ity + itr);
            innerShape.lineTo(itx + itw, ity + ith - itr);
            innerShape.quadraticCurveTo(itx + itw, ity + ith, itx + itw - itr, ity + ith);
            innerShape.lineTo(itx + itr, ity + ith);
            innerShape.quadraticCurveTo(itx, ity + ith, itx, ity + ith - itr);
            innerShape.lineTo(itx, ity + itr);
            innerShape.quadraticCurveTo(itx, ity, itx + itr, ity);
          } else {
            innerShape.moveTo(itx, ity);
            innerShape.lineTo(itx + itw, ity);
            innerShape.lineTo(itx + itw, ity + ith);
            innerShape.lineTo(itx, ity + ith);
            innerShape.lineTo(itx, ity);
          }
          outerShape.holes.push(innerShape);
        }

        tubeGeom = new THREE.ExtrudeGeometry(outerShape, {
          depth: tl,
          bevelEnabled: false,
          curveSegments: 16
        });
      }
      
      const tubeMesh = new THREE.Mesh(tubeGeom, new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.5,
        roughness: 0.3
      }));

      const tiltAxis = config.assembly.tiltAxis || 'X';

      // 3. Handle End Cutter (Tilt Plane at tail of tube)
      const handleAngleRadX = (config.assembly.handleAngleX || 0) * (Math.PI / 180);
      const handleAngleRadY = (config.assembly.handleAngleY || 0) * (Math.PI / 180);
      const handleOffset = config.assembly.handleOffset || 0;

      const handleCutterGeom = new THREE.BoxGeometry(tw * 4, th * 4, tl);
      handleCutterGeom.translate(0, handleOffset, tl / 2); // Center of cut plane offset
      const handleCutterMesh = new THREE.Mesh(handleCutterGeom);
      handleCutterMesh.position.set(0, 0, tl);
      handleCutterMesh.rotation.x = -handleAngleRadX;
      handleCutterMesh.rotation.y = -handleAngleRadY;
      handleCutterMesh.updateMatrixWorld(true);

      // Apply Assembly Transformations
      const angleRad = (90 - config.assembly.tiltAngle) * (Math.PI / 180);

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
      
      // Match wireframe transforms
      panWireframe.position.copy(panMesh.position);
      panWireframe.rotation.copy(panMesh.rotation);
      panWireframe.updateMatrixWorld(true);

      if (config.renderMode === 'preview') {
        tubeMesh.name = 'zerogap_tube_preview';
        
        try {
          const edges = new THREE.EdgesGeometry(tubeGeom);
          if (edges.attributes.position && edges.attributes.position.count > 0) {
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0x333333 } ) );
            tubeMesh.add(line);
          }
        } catch (e) {
          console.warn('Could not create edges for preview tube');
        }
        
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

        if (config.markOrientation) {
           const markGeom = new THREE.CylinderGeometry(1, 1, Math.max(tw, th) * 2, 8);
           markGeom.rotateX(Math.PI / 2);
           const markMesh = new THREE.Mesh(markGeom);
           markMesh.position.set(0, th/2, tl - 15);
           markMesh.updateMatrixWorld(true);
           const markBSP = CSG.fromMesh(markMesh);
           resultBSP = resultBSP.subtract(markBSP);
        }

        // Twin Nesting Logic
        if (config.nestingMode === 'twin') {
          // Mirror across the handle cut plane for visual twin effect
          const singleMesh = CSG.toMesh(resultBSP, new THREE.Matrix4());
          const twinMesh = singleMesh.clone();
          
          // Tail-to-tail inversion
          twinMesh.rotateY(Math.PI);
          twinMesh.position.z = (tl * 2) + (config.slugGap || 5);
          twinMesh.updateMatrix();
          twinMesh.updateMatrixWorld(true);
          
          const twinBSP = CSG.fromMesh(twinMesh);
          resultBSP = resultBSP.union(twinBSP);
          
          singleMesh.geometry.dispose();
          if (Array.isArray(singleMesh.material)) {
            singleMesh.material.forEach(m => m.dispose());
          } else if (singleMesh.material) {
            singleMesh.material.dispose();
          }
        }

        // Clean up temporary CSG source geometries
        tubeGeom.dispose();
        panGeometry.dispose();
        handleCutterGeom.dispose();

        // Create Result Mesh
        const resultMat = new THREE.MeshStandardMaterial({
          color: 0xcccccc, // Silver metal
          metalness: 0.8,
          roughness: 0.2,
          side: THREE.DoubleSide
        });
        
        const finalMesh = CSG.toMesh(resultBSP, tubeMesh.matrixWorld, resultMat);
        finalMesh.name = 'zerogap_result';
        
        if (!finalMesh.geometry.attributes.position || finalMesh.geometry.attributes.position.count === 0) {
          // CSG resulted in empty geometry, fallback to avoid NaN shader errors
          finalMesh.geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        finalMesh.geometry.computeVertexNormals();

        // ** Fix 1: Translation and Centering (CenterXY) **
        // Shift geometry so the part is strictly centered over origin (0,0,0) as requested
        finalMesh.geometry.computeBoundingBox();
        const bbox = finalMesh.geometry.boundingBox;
        if (bbox && bbox.min.x !== Infinity && !isNaN(bbox.min.x)) {
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          finalMesh.geometry.translate(-center.x, -center.y, -center.z);
        }

        // Simulated rounding if config.addFillet is true (visual effect with edges)
        try {
          const edges = new THREE.EdgesGeometry(finalMesh.geometry);
          if (edges.attributes.position && edges.attributes.position.count > 0) {
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { 
              color: config.addFillet ? 0xffffff : 0x000000, 
              opacity: 0.2, 
              transparent: true 
            } ) );
            finalMesh.add(line);
          }
        } catch (err) {
          console.warn("Could not compute edges geometry for final mesh");
        }

        scene.add(finalMesh);
        exportMeshRef.current = finalMesh;
      }

      // Frame the object properly using Box3 world bounds
      if (controlsRef.current && cameraRef.current && exportMeshRef.current) {
        const bbox = new THREE.Box3();
        if (config.renderMode === 'preview') {
          // Frame all relevant objects in preview mode
          scene.children.forEach(c => {
            if (c.name.startsWith('zerogap_')) bbox.expandByObject(c);
          });
        } else {
          bbox.setFromObject(exportMeshRef.current);
        }

        if (bbox.min.x !== Infinity) {
          const worldCenter = new THREE.Vector3();
          bbox.getCenter(worldCenter);
          controlsRef.current.target.copy(worldCenter);
          
          if (!hasAutoCentered.current || lastStlName.current !== config.tube.customStlName) {
            const maxDim = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z) || 100;
            const fov = cameraRef.current.fov * (Math.PI / 180);
            let cameraDist = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
            
            // Adjust camera position to frame the object
            cameraRef.current.position.set(worldCenter.x + cameraDist * 0.5, worldCenter.y + cameraDist * 0.8, worldCenter.z + cameraDist);
            
            hasAutoCentered.current = true;
            lastStlName.current = config.tube.customStlName;
          }
          controlsRef.current.update();
        }
      }

    } catch (e) {
      console.error("Zero-Gap Engine Error:", e);
    }
    
    // Grid visibility
    const gridHelper = scene.children.find(c => c instanceof THREE.GridHelper);
    if (gridHelper) gridHelper.visible = gridVisible;

  }, [config, gridVisible, webglError]);

  const handleSnapView = (view: string) => {
    if (!controlsRef.current || !cameraRef.current || !exportMeshRef.current) return;
    
    const bbox = new THREE.Box3();
    if (config.renderMode === 'preview') {
      sceneRef.current?.children.forEach(c => {
        if (c.name.startsWith('zerogap_')) bbox.expandByObject(c);
      });
    } else {
      bbox.setFromObject(exportMeshRef.current);
    }

    if (bbox.min.x === Infinity) return;
    
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const maxDim = Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y, bbox.max.z - bbox.min.z) || 100;
    const dist = maxDim * 1.5;

    switch(view) {
      case 'front': cameraRef.current.position.set(center.x, center.y, center.z + dist); break;
      case 'back': cameraRef.current.position.set(center.x, center.y, center.z - dist); break;
      case 'top': cameraRef.current.position.set(center.x, center.y + dist, center.z); break;
      case 'bottom': cameraRef.current.position.set(center.x, center.y - dist, center.z); break;
      case 'left': cameraRef.current.position.set(center.x - dist, center.y, center.z); break;
      case 'right': cameraRef.current.position.set(center.x + dist, center.y, center.z); break;
      case 'iso': cameraRef.current.position.set(center.x + dist*0.8, center.y + dist*0.8, center.z + dist*0.8); break;
    }
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-neutral-900 rounded-lg overflow-hidden relative flex items-center justify-center text-center" id="three-container">
      {/* View Cube HUD */}
      {!webglError && (
        <div className="absolute top-6 left-6 flex flex-col items-center gap-1 z-10 glass-panel p-2 rounded-xl border-t-2 border-t-[var(--accent)]" onPointerDown={e => e.stopPropagation()}>
          <div className="text-[10px] text-[var(--text-main)] font-bold mb-2 tracking-widest text-center font-mono">كاميرا</div>
          
          <div className="grid grid-cols-3 gap-1 mb-1">
            <div />
            <button onClick={() => handleSnapView('top')} className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-[var(--accent)] hover:text-black border border-[var(--border)] rounded text-[10px] font-bold transition-all shadow-sm">Y+</button>
            <div />
            
            <button onClick={() => handleSnapView('left')} className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-[var(--accent)] hover:text-black border border-[var(--border)] rounded text-[10px] font-bold transition-all shadow-sm">X-</button>
            <button onClick={() => handleSnapView('front')} className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-[var(--accent)] hover:text-black border border-[var(--accent)] rounded text-[10px] text-[var(--accent)] font-bold transition-all shadow-sm">Z+</button>
            <button onClick={() => handleSnapView('right')} className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-[var(--accent)] hover:text-black border border-[var(--border)] rounded text-[10px] font-bold transition-all shadow-sm">X+</button>
            
            <div />
            <button onClick={() => handleSnapView('bottom')} className="w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-[var(--accent)] hover:text-black border border-[var(--border)] rounded text-[10px] font-bold transition-all shadow-sm">Y-</button>
            <div />
          </div>
          
          <div className="w-full flex gap-1 mt-1">
            <button onClick={() => handleSnapView('iso')} className="flex-1 py-1.5 bg-black/40 hover:bg-[var(--accent-blue)] hover:text-black border border-[var(--border)] rounded text-[9px] font-bold transition-all shadow-sm uppercase">منظور ISO</button>
            <button onClick={() => { 
                if (exportMeshRef.current && controlsRef.current && cameraRef.current) {
                  exportMeshRef.current.geometry.computeBoundingBox();
                  const b = exportMeshRef.current.geometry.boundingBox;
                  if (b && b.min.x !== Infinity) {
                    const center = new THREE.Vector3();
                    b.getCenter(center);
                    controlsRef.current.target.copy(center);
                    const maxDim = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z) || 100;
                    const fov = cameraRef.current.fov * (Math.PI / 180);
                    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
                    cameraRef.current.position.set(center.x + cameraZ * 0.5, center.y + cameraZ * 0.8, center.z + cameraZ);
                    controlsRef.current.update();
                  }
                }
             }} className="w-8 h-full bg-black/40 hover:bg-white hover:text-black border border-[var(--border)] rounded flex items-center justify-center transition-all shadow-sm" title="تمركز الكاميرا">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4 12H2M22 12h-4"/></svg>
            </button>
          </div>
        </div>
      )}

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
