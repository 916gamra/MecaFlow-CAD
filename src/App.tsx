/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ThreeCanvas from './components/ThreeCanvas';
import DraftingView from './components/DraftingView';
import CNCView from './components/CNCView';
import ZeroGapControlPanel from './components/ZeroGapControlPanel';
import { CADState, ZeroGapState } from './types';
import { Settings, Info, Minimize2, Maximize2 } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<CADState>({
    parts: [],
    selectedPartId: null,
    viewMode: '3d',
    gridVisible: true,
    units: 'mm',
    zeroGap: {
      pan: { bottomDiameter: 150, topDiameter: 250, height: 60, filletRadius: 20 },
      tube: { width: 30, height: 15, thickness: 1.2, length: 120, cornerRadius: 5.75 },
      assembly: { tiltAngle: 25, insertionDistance: 50, heightOffset: 25 },
      renderMode: 'boolean'
    }
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<{ exportSTL: () => void }>(null);

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[var(--accent)] selection:text-white" style={{ backgroundColor: 'var(--bg-deep)', color: 'var(--text-main)' }}>
      {/* Header */}
      <header className="h-[48px] px-4 bg-[var(--bg-header)] border-b border-[var(--border)] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <h1 className="text-sm font-bold tracking-wider uppercase text-[var(--accent)]">ZERO-GAP LASER CAD</h1>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex gap-5">
            {['محاكاة هندسية', 'مخططات 2D', 'تحضير CNC', 'بيئة التصنيع'].map((item, idx) => (
              <button 
                key={item} 
                onClick={() => {
                  if (idx === 0) setState(prev => ({ ...prev, viewMode: '3d' }));
                  if (idx === 1) setState(prev => ({ ...prev, viewMode: 'drafting' }));
                  if (idx === 2) setState(prev => ({ ...prev, viewMode: 'cnc' }));
                }}
                className={`text-[13px] transition-colors ${
                  (idx === 0 && state.viewMode === '3d') || 
                  (idx === 1 && state.viewMode === 'drafting') || 
                  (idx === 2 && state.viewMode === 'cnc') 
                  ? 'text-[var(--text-main)] font-semibold border-b-2 border-[var(--accent)] pb-1' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="text-[12px] opacity-80 text-[var(--text-dim)]">المستخدم: مبرمج ليزر (Admin_Mech)</div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden relative">

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View Container */}
          <div className="flex-1 relative group overflow-hidden bg-[#1a1d23]" style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            {state.viewMode === '3d' && (
              <ThreeCanvas 
                ref={canvasRef}
                config={state.zeroGap}
                gridVisible={state.gridVisible}
              />
            )}
            {state.viewMode === 'drafting' && (
              <DraftingView parts={state.parts} />
            )}
            {state.viewMode === 'cnc' && (
              <CNCView />
            )}

            {/* View HUD */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 scale-75 origin-top-right">
              <div className="text-right font-mono text-[11px] text-[var(--text-dim)]">
                محرك التوليد الصناعي<br />التطابق: 100%
              </div>
            </div>

            <div className="absolute bottom-4 left-4 bg-[var(--bg-panel)]/80 backdrop-blur px-3 py-1 border border-[var(--border)] flex gap-4 text-[10px] text-[var(--text-dim)] font-mono">
              <span>UNITS: {state.units.toUpperCase()}</span>
              <span>ENGINE: CADQUERY / THREE-CSG</span>
            </div>
          </div>

          {/* Bottom Bar / Status */}
          <div className="h-[24px] bg-[var(--bg-header)] border-t border-[var(--border)] font-[10px] flex items-center px-4 gap-5 text-[var(--text-dim)] uppercase tracking-tight">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              تم التفعيل (ZERO-GAP)
            </span>
            <span>السمك الداخلي: {state.zeroGap.tube.thickness}mm</span>
            <span>زاوية الإسقاط: {state.zeroGap.assembly.tiltAngle}°</span>
            <div className="ml-auto flex gap-4">
              <span>حساس القطع (Capacitive): جاهز</span>
            </div>
          </div>
        </div>

        <ZeroGapControlPanel 
          config={state.zeroGap}
          onUpdate={(newConfig) => setState(prev => ({ ...prev, zeroGap: newConfig }))}
          onExport={() => canvasRef.current?.exportSTL()}
        />
      </main>
    </div>
  );
}

