import React from 'react';
import { CADPart } from '../types';

interface DraftingViewProps {
  parts: CADPart[];
}

const DraftingView: React.FC<DraftingViewProps> = ({ parts }) => {
  // Simple 2D projection using SVG
  // We'll show Top, Front, and Side views
  
  const renderProjection = (view: 'top' | 'front' | 'side') => {
    return (
      <div className="flex-1 min-h-[300px] bg-[#0c0d10] border border-[var(--border)] rounded flex flex-col p-4 shadow-2xl">
        <span className="text-[10px] uppercase font-mono text-[var(--text-dim)] mb-2 tracking-widest">{view} VIEW (ISO-A)</span>
        <svg viewBox="-5 -5 10 10" className="flex-1 w-full h-full stroke-[var(--accent)] fill-[var(--accent)]/5 stroke-[0.05]">
          <g transform="scale(1, -1)"> {/* Cartesian to SVG screen coords */}
            {parts.map(part => {
              if (part.type.startsWith('hole')) return null;

              const [x, y, z] = part.position;
              const [sx, sy, sz] = part.scale;

              if (view === 'top') {
                // X-Z projection
                return (
                  <rect 
                    key={part.id}
                    x={x - sx/2} 
                    y={z - sz/2} 
                    width={sx} 
                    height={sz} 
                  />
                );
              } else if (view === 'front') {
                // X-Y projection
                return (
                  <rect 
                    key={part.id}
                    x={x - sx/2} 
                    y={y - sy/2} 
                    width={sx} 
                    height={sy} 
                  />
                );
              } else {
                // Z-Y projection
                return (
                  <rect 
                    key={part.id}
                    x={z - sz/2} 
                    y={y - sy/2} 
                    width={sz} 
                    height={sy} 
                  />
                );
              }
            })}
          </g>
        </svg>
      </div>
    );
  };

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-4 bg-[var(--bg-deep)] p-8 rounded overflow-auto" id="drafting-view">
      {renderProjection('top')}
      {renderProjection('front')}
      {renderProjection('side')}
      <div className="flex-1 min-h-[300px] bg-[var(--bg-panel)] border border-[var(--border)] rounded p-8 flex flex-col items-center justify-center text-center shadow-2xl">
         <div className="w-full p-4 border border-[var(--border)] bg-[#0c0d10] text-[var(--accent)] rounded mb-4">
            <h4 className="font-bold text-xs uppercase tracking-widest">Engineering Sheet</h4>
            <p className="text-[10px] text-[var(--text-dim)] mt-1">Propriété de SOFTWIRE 3D</p>
         </div>
         <div className="space-y-2 w-full text-left font-mono text-[10px]">
            <div className="flex justify-between border-b border-[var(--border)] py-1 text-[var(--text-dim)]">
              <span>DRAWN BY:</span>
              <span className="text-[var(--text-main)] font-bold">SYSTEM_AUTO</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)] py-1 text-[var(--text-dim)]">
              <span>DATE:</span>
              <span className="text-[var(--text-main)] font-bold">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between border-b border-[var(--border)] py-1 text-[var(--text-dim)]">
              <span>SCALE:</span>
              <span className="text-[var(--text-main)] font-bold">1:1.25</span>
            </div>
         </div>
         <button className="mt-8 w-full py-2 bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-widest rounded hover:opacity-90 transition-opacity">
             Exporter ISO A3
         </button>
      </div>
    </div>
  );
};

export default DraftingView;
