import React from 'react';
import { CADPart } from '../types';

interface PropertiesPanelProps {
  part: CADPart | null;
  onUpdatePart: (updates: Partial<CADPart>) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ part, onUpdatePart }) => {
  if (!part) {
    return (
      <aside className="w-60 h-full bg-[var(--bg-panel)] border-l border-[var(--border)] p-6 flex items-center justify-center text-center">
        <p className="text-[var(--text-dim)] text-xs font-mono">Select a part to view properties</p>
      </aside>
    );
  }

  const handleTransform = (axis: number, val: string, type: 'position' | 'rotation' | 'scale') => {
    const newVal = parseFloat(val) || 0;
    const current = [...part[type]];
    current[axis] = newVal;
    onUpdatePart({ [type]: current as [number, number, number] });
  };

  return (
    <aside className="w-60 h-full bg-[var(--bg-panel)] border-l border-[var(--border)] overflow-y-auto" id="properties-panel">
      <div className="p-4">
        <div className="flex justify-between items-center mb-6 border-b border-[var(--border)] pb-2">
            <h3 className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Propriétés</h3>
            <span className="text-[10px] text-[var(--accent)] font-mono">ID_{part.id.slice(0,4)}</span>
        </div>
        
        <div className="space-y-6">
          {/* Identity */}
          <section>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-2">Nom de la pièce</label>
            <input 
              type="text" 
              value={part.name}
              onChange={(e) => onUpdatePart({ name: e.target.value })}
              className="w-full bg-[#0c0d10] px-3 py-1.5 border border-[var(--border)] rounded text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--accent)] font-mono"
            />
          </section>

          {/* Position */}
          <section>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-2 text-center border-b border-[var(--border)] pb-1 mb-3">Position (XYZ)</label>
            <div className="space-y-2">
              {['X', 'Y', 'Z'].map((label, i) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-dim)] font-mono">{label}</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={part.position[i]}
                    onChange={(e) => handleTransform(i, e.target.value, 'position')}
                    className="w-24 bg-[#0c0d10] px-2 py-1 border border-[var(--border)] rounded text-[var(--accent)] font-mono text-right focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Scale */}
          <section>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-2 text-center border-b border-[var(--border)] pb-1 mb-3">Dimensions (WHL)</label>
            <div className="space-y-2">
              {['W', 'H', 'L'].map((label, i) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-dim)] font-mono">{label}</span>
                  <input 
                    type="number" 
                    step="0.1"
                    value={part.scale[i]}
                    onChange={(e) => handleTransform(i, e.target.value, 'scale')}
                    className="w-24 bg-[#0c0d10] px-2 py-1 border border-[var(--border)] rounded text-[var(--accent)] font-mono text-right focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Rotation */}
          <section>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-2 text-center border-b border-[var(--border)] pb-1 mb-3">Rotation (DEG)</label>
            <div className="space-y-2">
              {['RX', 'RY', 'RZ'].map((label, i) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-dim)] font-mono">{label}</span>
                  <input 
                    type="number" 
                    step="1"
                    value={Math.round(part.rotation[i] * 180 / Math.PI)}
                    onChange={(e) => handleTransform(i, (parseFloat(e.target.value) * Math.PI / 180).toString(), 'rotation')}
                    className="w-24 bg-[#0c0d10] px-2 py-1 border border-[var(--border)] rounded text-[var(--accent)] font-mono text-right focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Material */}
          <section className="pt-4 border-t border-[var(--border)]">
              <div className="flex justify-between items-center text-[11px] mb-2">
                  <span className="text-[var(--text-dim)] uppercase">Matériau</span>
                  <span className="text-[var(--accent)] font-mono">Alu 6061-T6</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                  <span className="text-[var(--text-dim)] uppercase">Masse</span>
                  <span className="text-[var(--accent)] font-mono">1.42 kg</span>
              </div>
          </section>

          {/* Visuals */}
          <section>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-2">Couleur & Opacité</label>
            <div className="flex gap-3 items-center">
              <input 
                type="color" 
                value={part.color}
                onChange={(e) => onUpdatePart({ color: e.target.value })}
                className="w-6 h-6 rounded bg-transparent border border-[var(--border)] cursor-pointer"
              />
              <input 
                type="range" min="0" max="1" step="0.1"
                value={part.opacity}
                onChange={(e) => onUpdatePart({ opacity: parseFloat(e.target.value) })}
                className="flex-1 accent-[var(--accent)] h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </section>
        </div>
      </div>
    </aside>
  );
};

export default PropertiesPanel;
