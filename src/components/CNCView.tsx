import React from 'react';

const CNCView: React.FC = () => {
  return (
    <div className="w-full h-full bg-[var(--bg-deep)] text-[var(--accent)] font-mono p-8 rounded overflow-hidden flex flex-col" id="cnc-view">
      <div className="bg-[var(--bg-header)] p-4 border border-[var(--border)] rounded-t flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
          <span className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-widest">CNC CONTROLLER - ONLINE</span>
        </div>
        <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-[#0c0d10] text-[10px] rounded border border-[var(--border)] text-[var(--text-dim)]">X: 142.052</span>
            <span className="px-2 py-0.5 bg-[#0c0d10] text-[10px] rounded border border-[var(--border)] text-[var(--text-dim)]">Y: -84.221</span>
            <span className="px-2 py-0.5 bg-[#0c0d10] text-[10px] rounded border border-[var(--border)] text-[var(--text-dim)]">Z: 12.000</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-[#0c0d10] border-x border-[var(--border)] space-y-1 text-[12px]">
        <p className="text-[var(--text-dim)] opacity-50">% SOFTWIRE GENERATED G-CODE</p>
        <p className="text-[var(--text-dim)] opacity-50">(Part: Plaque_Support_01)</p>
        <p>G90 (Absolute Programming)</p>
        <p>G21 (Unit: Metric)</p>
        <p className="text-[var(--text-main)]">M03 S12000 (Spindle ON Clockwise)</p>
        <p>G00 Z10.0 (Rapid Move Z)</p>
        <p>G00 X0.0 Y0.0 (Rapid Move to Start)</p>
        <p className="text-[var(--accent)] font-bold">G01 Z-2.0 F500 (Plunge Feed)</p>
        <p>G01 X10.0 F1200 (Cut to X10)</p>
        <p>G01 Y10.0 (Cut to Y10)</p>
        <p>G01 X0.0 (Cut back to X0)</p>
        <p>G01 Y0.0 (Return to Start)</p>
        <p>G00 Z10.0 (Retract)</p>
        <p className="text-[var(--text-main)]">M05 (Spindle OFF)</p>
        <p>M30 (Program End)</p>
        <p className="animate-pulse">_</p>
      </div>

      <div className="p-4 bg-[var(--bg-header)] border border-[var(--border)] rounded-b flex justify-between items-center">
        <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest font-bold">Total Time: 00:04:12</div>
        <button className="px-6 py-2 bg-[var(--accent)] text-white text-[11px] font-bold rounded hover:opacity-90 transition-opacity uppercase tracking-widest">
           GÉNÉRER G-CODE
        </button>
      </div>
    </div>
  );
};

export default CNCView;
