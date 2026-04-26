/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import ThreeCanvas from './components/ThreeCanvas';
import DraftingView from './components/DraftingView';
import CNCView from './components/CNCView';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import { CADState, CADPart, PartType } from './types';
import { Settings, Info, Minimize2, Maximize2 } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<CADState>({
    parts: [
      {
        id: 'initial-block',
        name: 'Main Body',
        type: 'block',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [2, 1, 2],
        color: '#64748b',
        visible: true,
        opacity: 1
      }
    ],
    selectedPartId: 'initial-block',
    viewMode: '3d',
    gridVisible: true,
    units: 'mm'
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleAddPart = (type: PartType) => {
    const newPart: CADPart = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${type.replace('_', ' ').toUpperCase()} ${state.parts.length + 1}`,
      type,
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      scale: type.includes('hex') ? [1, 0.4, 1] : [1, 1, 1],
      color: type.startsWith('hole') ? '#ef4444' : '#64748b',
      visible: true,
      opacity: type.startsWith('hole') ? 0.3 : 1
    };

    setState(prev => ({
      ...prev,
      parts: [...prev.parts, newPart],
      selectedPartId: newPart.id
    }));
  };

  const handleDeletePart = () => {
    if (!state.selectedPartId) return;
    setState(prev => ({
      ...prev,
      parts: prev.parts.filter(p => p.id !== state.selectedPartId),
      selectedPartId: null
    }));
  };

  const handleUpdatePart = (updates: Partial<CADPart>) => {
    if (!state.selectedPartId) return;
    setState(prev => ({
      ...prev,
      parts: prev.parts.map(p => p.id === state.selectedPartId ? { ...p, ...updates } : p)
    }));
  };

  const selectedPart = state.parts.find(p => p.id === state.selectedPartId) || null;

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[var(--accent)] selection:text-white" style={{ backgroundColor: 'var(--bg-deep)', color: 'var(--text-main)' }}>
      {/* Header */}
      <header className="h-[48px] px-4 bg-[var(--bg-header)] border-b border-[var(--border)] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <h1 className="text-sm font-bold tracking-wider uppercase text-[var(--accent)]">SOFTWIRE 3D</h1>
        </div>

        <div className="flex items-center gap-6">
          <nav className="flex gap-5">
            {['CAD Design', 'Mise en Plan 2D', 'CNC Simulation', 'Fabrication'].map((item, idx) => (
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
                  ? 'text-[var(--text-main)] font-semibold' : 'text-[var(--text-dim)] hover:text-[var(--text-main)]'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
          <div className="w-px h-4 bg-[var(--border)]" />
          <div className="text-[12px] opacity-80 text-[var(--text-dim)]">User: Admin_Mech</div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        <Toolbar 
          onAddPart={handleAddPart}
          onDeletePart={handleDeletePart}
          selectedPartId={state.selectedPartId}
          viewMode={state.viewMode}
          onChangeView={(mode) => setState(prev => ({ ...prev, viewMode: mode }))}
          toggleGrid={() => setState(prev => ({ ...prev, gridVisible: !prev.gridVisible }))}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* View Container */}
          <div className="flex-1 relative group overflow-hidden bg-[#1a1d23]" style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            {state.viewMode === '3d' && (
              <ThreeCanvas 
                parts={state.parts}
                selectedPartId={state.selectedPartId}
                onSelectPart={(id) => setState(prev => ({ ...prev, selectedPartId: id }))}
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
                X: 142.052<br />Y: -84.221<br />Z: 12.000
              </div>
            </div>

            <div className="absolute bottom-4 left-4 bg-[var(--bg-panel)]/80 backdrop-blur px-3 py-1 border border-[var(--border)] flex gap-4 text-[10px] text-[var(--text-dim)] font-mono">
              <span>UNITS: {state.units.toUpperCase()}</span>
              <span>PARTS: {state.parts.length}</span>
            </div>
          </div>

          {/* Bottom Bar / Status */}
          <div className="h-[24px] bg-[var(--bg-header)] border-t border-[var(--border)] font-[10px] flex items-center px-4 gap-5 text-[var(--text-dim)] uppercase tracking-tight">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              READY
            </span>
            <span>Units: {state.units.toUpperCase()}</span>
            <span>Grid: 10.0</span>
            <div className="ml-auto flex gap-4">
              <span>FPS: 60.0</span>
              <span>RAM: 1.2GB</span>
            </div>
          </div>
        </div>

        <PropertiesPanel 
          part={selectedPart}
          onUpdatePart={handleUpdatePart}
        />
      </main>
    </div>
  );
}

