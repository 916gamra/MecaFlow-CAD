import React from 'react';
import { Box, Circle, Hexagon, Trash2, Layers, Cpu, Compass, Settings, Grid, FileText, Download } from 'lucide-react';
import { PartType } from '../types';

interface ToolbarProps {
  onAddPart: (type: PartType) => void;
  onDeletePart: () => void;
  selectedPartId: string | null;
  viewMode: '3d' | 'drafting' | 'cnc';
  onChangeView: (mode: '3d' | 'drafting' | 'cnc') => void;
  toggleGrid: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  onAddPart, 
  onDeletePart, 
  selectedPartId, 
  viewMode, 
  onChangeView,
  toggleGrid
}) => {
  return (
    <aside className="w-[48px] bg-[var(--bg-panel)] border-r border-[var(--border)] flex flex-col items-center py-4 gap-4 z-10" id="main-toolbar">
      {/* Tool Groups */}
      <div className="flex flex-col gap-2">
        <button onClick={() => onAddPart('block')} className="w-8 h-8 flex items-center justify-center text-[var(--text-main)] hover:bg-white/5 rounded transition-all" title="Add Block">
          <Box size={18} />
        </button>
        <button onClick={() => onAddPart('cylinder')} className="w-8 h-8 flex items-center justify-center text-[var(--text-main)] hover:bg-white/5 rounded transition-all" title="Add Cylinder">
          <Circle size={18} />
        </button>
        <button onClick={() => onAddPart('hex_nut')} className="w-8 h-8 flex items-center justify-center text-[var(--text-main)] hover:bg-white/5 rounded transition-all" title="Add Hex Nut">
          <Hexagon size={18} />
        </button>
      </div>

      <div className="w-8 h-px bg-[var(--border)]" />

      <div className="flex flex-col gap-2">
        <button onClick={() => onAddPart('hole_block')} className="w-8 h-8 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition-all" title="Subtract Block">
          <Box size={18} />
        </button>
        <button onClick={() => onAddPart('hole_cylinder')} className="w-8 h-8 flex items-center justify-center text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition-all" title="Subtract Cylinder">
          <Circle size={18} />
        </button>
      </div>

      <div className="w-8 h-px bg-[var(--border)]" />

      <div className="flex flex-col gap-2">
        <button onClick={toggleGrid} className="w-8 h-8 flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-main)] transition-all" title="Toggle Grid">
          <Grid size={18} />
        </button>
        <button 
          onClick={onDeletePart} 
          disabled={!selectedPartId}
          className={`w-8 h-8 flex items-center justify-center transition-all ${selectedPartId ? 'text-red-500 hover:bg-red-500/10' : 'text-neutral-700 cursor-not-allowed'}`}
          title="Delete Selection"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="mt-auto">
        <button className="w-8 h-8 flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text-main)]" title="Settings">
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
};

export default Toolbar;
