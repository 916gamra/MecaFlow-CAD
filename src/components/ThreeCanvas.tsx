import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';
import { CADPart } from '../types';

interface ThreeCanvasProps {
  parts: CADPart[];
  selectedPartId: string | null;
  onSelectPart: (id: string | null) => void;
  gridVisible: boolean;
}

const ThreeCanvas: React.FC<ThreeCanvasProps> = ({ parts, selectedPartId, onSelectPart, gridVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const [webglError, setWebglError] = useState<string | null>(null);

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
      setWebglError("Votre navigateur ou carte graphique ne supporte pas WebGL. Veuillez activer l'accélération matérielle ou utiliser un navigateur moderne.");
      return;
    }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090A0C);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    const initRenderer = (useSafeMode: boolean) => {
      // Intercept and swallow console errors during renderer creation 
      // to prevent Three.js internal errors from bubbling up to the UI logs
      const originalError = console.error;
      const originalWarn = console.warn;
      console.error = () => {};
      console.warn = () => {};
      
      try {
        const options: THREE.WebGLRendererParameters = {
          antialias: !useSafeMode,
          alpha: true,
          powerPreference: useSafeMode ? 'default' : 'high-performance',
          precision: useSafeMode ? 'mediump' : 'highp',
        };
        
        let canvasParams: Record<string, any> = { alpha: true };
        if (useSafeMode) {
          canvasParams.failIfMajorPerformanceCaveat = false;
        }

        const newRenderer = new THREE.WebGLRenderer({ ...options, ...canvasParams });
        newRenderer.domElement.style.display = 'block';
        newRenderer.domElement.style.width = '100%';
        newRenderer.domElement.style.height = '100%';
        newRenderer.setSize(containerRef.current!.clientWidth, containerRef.current!.clientHeight);
        newRenderer.shadowMap.enabled = !useSafeMode;
        containerRef.current!.appendChild(newRenderer.domElement);
        return newRenderer;
      } finally {
        // Always restore the original console methods
        console.error = originalError;
        console.warn = originalWarn;
      }
    };

    try {
      renderer = initRenderer(false);
      rendererRef.current = renderer;
    } catch (e) {
      try {
        renderer = initRenderer(true);
        rendererRef.current = renderer;
      } catch (e2) {
        setWebglError("Le moteur 3D n'a pas pu démarrer même en mode compatibilité. Cela est souvent dû à un blocage de l'accélération matérielle par votre système ou votre navigateur (VENDOR: 0x8086).");
        return;
      }
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.name = 'grid';
    scene.add(gridHelper);

    // Raycaster for selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(Array.from(meshesRef.current.values()));

      if (intersects.length > 0) {
        const objectId = intersects[0].object.name;
        onSelectPart(objectId);
      } else {
        onSelectPart(null);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handleClick);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Advanced API: ResizeObserver for highly robust dimension tracking
    const resizeObserver = new ResizeObserver((entries) => {
      window.requestAnimationFrame(() => {
        if (!entries.length) return;
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && renderer && camera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false); // false = don't update style, let CSS handle it
        }
      });
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('pointerdown', handleClick);
        renderer.dispose();
        renderer.domElement.remove();
      }
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Sync parts
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || webglError) return;

    // Add/Update meshes
    parts.forEach(part => {
      let mesh = meshesRef.current.get(part.id);
      
      if (!mesh) {
        let geometry: THREE.BufferGeometry;
        switch (part.type) {
          case 'cylinder':
          case 'hole_cylinder':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
            break;
          case 'hex_nut':
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 6);
            break;
          case 'block':
          case 'hole_block':
          default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
            break;
        }

        const material = new THREE.MeshStandardMaterial({ 
          color: part.color, 
          transparent: part.type.startsWith('hole') || part.opacity < 1,
          opacity: part.type.startsWith('hole') ? 0.3 : part.opacity,
          wireframe: part.type.startsWith('hole')
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.name = part.id;
        meshesRef.current.set(part.id, mesh);
        scene.add(mesh);
      }

      // Update transform
      mesh.position.set(...part.position);
      mesh.rotation.set(...part.rotation);
      mesh.scale.set(...part.scale);
      
      // Update selection look
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        if (part.id === selectedPartId) {
          mesh.material.emissive.setHex(0x333333);
        } else {
          mesh.material.emissive.setHex(0x000000);
        }
      }
    });

    // Remove old meshes
    Array.from(meshesRef.current.keys()).forEach(id => {
      if (!parts.find(p => p.id === id)) {
        const mesh = meshesRef.current.get(id);
        if (mesh) {
          scene.remove(mesh);
          mesh.geometry.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
        meshesRef.current.delete(id);
      }
    });

    const grid = scene.getObjectByName('grid');
    if (grid) grid.visible = gridVisible;

  }, [parts, selectedPartId, gridVisible]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-neutral-900 rounded-lg overflow-hidden relative flex items-center justify-center p-8 text-center" id="three-container">
      {webglError && (
        <div className="max-w-md bg-red-500/10 border border-red-500/20 p-6 rounded-xl backdrop-blur-sm">
          <h3 className="text-red-500 font-bold mb-2 uppercase tracking-widest text-sm">Précision Graphique Limitée</h3>
          <p className="text-xs text-[var(--text-dim)] leading-relaxed mb-4">{webglError}</p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2 bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-widest rounded transition-all hover:bg-[var(--accent)]/90"
            >
              Tentative de reconnexion
            </button>
            <p className="text-[9px] text-[var(--accent)] italic">Astuce: La vue "Mise en Plan 2D" utilise la technologie vectorielle et reste entièrement fonctionnelle sur votre système.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeCanvas;
