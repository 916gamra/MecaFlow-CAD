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

      // 1. Generate Pan (Virtual Cutter)
      const Rc = config.pan.bottomDiameter / 2;
      const Rt = config.pan.topDiameter / 2;
      const Hp = config.pan.height;
      
      const panGeometry = new THREE.CylinderGeometry(Rt, Rc, Hp, 64);
      // Move so origin is center 
      panGeometry.translate(0, Hp/2, 0); 
      
      const panMesh = new THREE.Mesh(panGeometry, new THREE.MeshStandardMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: config.renderMode === 'preview' ? 0.2 : 0.05,
        depthWrite: false, // Prevent depth sorting issues with transparent objects
        side: THREE.DoubleSide
      }));
      panMesh.name = 'zerogap_pan';
      scene.add(panMesh);

      // 2. Generate Tube (Main Body)
      const tw = config.tube.width;
      const th = config.tube.height;
      const tl = config.tube.length;
      const tt = config.tube.thickness;
      const tr = config.tube.cornerRadius;

      // Outer Shape
      const outerShape = new THREE.Shape();
      const x = -tw/2, y = -th/2;
      outerShape.moveTo(x + tr, y);
      outerShape.lineTo(x + tw - tr, y);
      outerShape.quadraticCurveTo(x + tw, y, x + tw, y + tr);
      outerShape.lineTo(x + tw, y + th - tr);
      outerShape.quadraticCurveTo(x + tw, y + th, x + tw - tr, y + th);
      outerShape.lineTo(x + tr, y + th);
      outerShape.quadraticCurveTo(x, y + th, x, y + th - tr);
      outerShape.lineTo(x, y + tr);
      outerShape.quadraticCurveTo(x, y, x + tr, y);

      // Inner Hole
      const innerShape = new THREE.Path();
      const itr = Math.max(0, tr - tt);
      const ix = x + tt, iy = y + tt;
      const itw = tw - 2*tt, ith = th - 2*tt;
      
      if (itw > 0 && ith > 0) {
        innerShape.moveTo(ix + itr, iy);
        innerShape.lineTo(ix + itw - itr, iy);
        innerShape.quadraticCurveTo(ix + itw, iy, ix + itw, iy + itr);
        innerShape.lineTo(ix + itw, iy + ith - itr);
        innerShape.quadraticCurveTo(ix + itw, iy + ith, ix + itw - itr, iy + ith);
        innerShape.lineTo(ix + itr, iy + ith);
        innerShape.quadraticCurveTo(ix, iy + ith, ix, iy + ith - itr);
        innerShape.lineTo(ix, iy + itr);
        innerShape.quadraticCurveTo(ix, iy, ix + itr, iy);
        outerShape.holes.push(innerShape);
      }

      const tubeGeom = new THREE.ExtrudeGeometry(outerShape, {
        depth: tl,
        bevelEnabled: false,
        curveSegments: 16
      });
      
      // Center the tube extrusion along Z
      tubeGeom.translate(0, 0, -tl/2);

      const tubeMesh = new THREE.Mesh(tubeGeom, new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.5,
        roughness: 0.3
      }));

      // Apply Assembly Transformations
      const angleRad = (90 - config.assembly.tiltAngle) * (Math.PI / 180);
      
      tubeMesh.position.set(0, config.assembly.heightOffset, -config.assembly.insertionDistance + tl/2);
      tubeMesh.rotation.x = angleRad;
      tubeMesh.updateMatrixWorld(true);
      panMesh.updateMatrixWorld(true);

      if (config.renderMode === 'preview') {
        tubeMesh.name = 'zerogap_tube_preview';
        
        // Add wireframe to tube for better visual clarity matching CAD expectation
        const edges = new THREE.EdgesGeometry(tubeGeom);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0x333333 } ) );
        tubeMesh.add(line);
        
        scene.add(tubeMesh);
        exportMeshRef.current = tubeMesh; 
      } 
      else {
        // Run CSG Operation (Zero-Gap)
        const tubeBSP = CSG.fromMesh(tubeMesh);
        const panBSP = CSG.fromMesh(panMesh);
        
        // Subtract Pan from Tube
        const resultBSP = tubeBSP.subtract(panBSP);
        
        // Create Result Mesh
        const resultMat = new THREE.MeshStandardMaterial({
          color: 0xF27D26, // Orange accent
          metalness: 0.6,
          roughness: 0.4,
          side: THREE.DoubleSide
        });
        
        const finalMesh = CSG.toMesh(resultBSP, tubeMesh.matrixWorld, resultMat);
        finalMesh.name = 'zerogap_result';
        
        // Ensure geometry is clean
        finalMesh.geometry.computeVertexNormals();

        // Optional: Adding edges for CAD look
        const edges = new THREE.EdgesGeometry(finalMesh.geometry);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 0.2, transparent: true } ) );
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
