import React from 'react';

const CNCView: React.FC = () => {
  return (
    <div className="w-full h-full bg-[var(--bg-deep)] text-[var(--accent)] font-mono p-8 rounded overflow-hidden flex flex-col" id="cnc-view">
      <div className="bg-[var(--bg-header)] p-4 border border-[var(--border)] rounded-t flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
          <span className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-widest">NCCSTUDIO V15 G-CODE GEN</span>
        </div>
        <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-[#0c0d10] text-[10px] rounded border border-[var(--border)] text-[var(--text-dim)]">Laser PWR: 1500W</span>
            <span className="px-2 py-0.5 bg-[#0c0d10] text-[10px] rounded border border-[var(--border)] text-[var(--text-dim)]">Gas: O2</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-[#0c0d10] border-x border-[var(--border)] space-y-1 text-[12px]">
        <p className="text-[var(--text-dim)] opacity-50">% ZERO-GAP GENERATED G-CODE</p>
        <p className="text-[var(--text-dim)] opacity-50">(Part: Handle Intersection Cut)</p>
        <p>G90 (Absolute Programming)</p>
        <p>G21 (Unit: Metric)</p>
        <p className="text-[var(--text-main)]">M03 S100 (Laser ON)</p>
        <p>G00 Z5.0 (Rapid Move Sensor Clear)</p>
        <p>G00 X0.0 Y0.0 (Rotary Axis Home)</p>
        <p className="text-[var(--text-dim)] opacity-50">... (Geometric Toolpath calculated via Boolean Subtraction)</p>
        <p className="text-[var(--accent)] font-bold">G01 X15.0 A45 F200 (Cut to Intersection Edge)</p>
        <p>G01 X30.0 A90 F200 (Rotate and Cut)</p>
        <p className="text-[var(--text-dim)] opacity-50">... (Complex 3D Path Data Interpolation)</p>
        <p>G00 Z10.0 (Retract from Tube)</p>
        <p className="text-[var(--text-main)]">M05 (Laser OFF)</p>
        <p>M30 (Program End)</p>
        <p className="animate-pulse">_</p>
      </div>

      <div className="p-4 bg-[var(--bg-header)] border border-[var(--border)] rounded-b flex justify-between items-center">
        <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest font-bold">EST TUBE CUT TIME: 00:00:42</div>
        <button className="px-6 py-2 bg-[var(--accent)] text-white text-[11px] font-bold rounded hover:opacity-90 transition-opacity uppercase tracking-widest shadow-[0_0_15px_rgba(242,125,38,0.2)]">
           تصدير مسار الليزر
        </button>
      </div>
    </div>
  );
};

export default CNCView;
