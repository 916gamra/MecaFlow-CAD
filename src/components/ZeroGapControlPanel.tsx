import React from 'react';
import { ZeroGapState } from '../types';
import { generateCadQueryScript } from '../lib/exportUtils';
import { STLExporter } from 'three-stdlib';
import * as THREE from 'three';

interface ControlPanelProps {
  config: ZeroGapState;
  onUpdate: (config: ZeroGapState) => void;
  onExport: () => void;
}

const ZeroGapControlPanel: React.FC<ControlPanelProps> = ({ config, onUpdate, onExport }) => {
  const updatePan = (key: keyof ZeroGapState['pan'], val: string | number) => {
    const numericVal = typeof val === 'string' ? parseFloat(val) || 0 : val;
    onUpdate({ ...config, pan: { ...config.pan, [key]: numericVal } });
  };
  const updateTube = (key: keyof ZeroGapState['tube'], val: string | number) => {
    const numericVal = typeof val === 'string' ? parseFloat(val) || 0 : val;
    onUpdate({ ...config, tube: { ...config.tube, [key]: numericVal } });
  };
  const updateAssembly = (key: keyof ZeroGapState['assembly'], val: string | number) => {
    const numericVal = typeof val === 'string' ? parseFloat(val) || 0 : val;
    onUpdate({ ...config, assembly: { ...config.assembly, [key]: numericVal } });
  };

  const renderSlider = (
    label: string, 
    val: number, 
    onChange: (v: string) => void, 
    min: number, 
    max: number, 
    step: number = 1
  ) => (
    <div className="flex flex-col gap-1 mb-4">
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-[var(--text-dim)] uppercase">{label}</span>
        <span className="text-[var(--accent)] font-mono font-bold">{val.toFixed(step < 1 ? 2 : 1)}</span>
      </div>
      <input 
        type="range" 
        min={min} max={max} step={step} 
        value={val}
        onChange={e => onChange(e.target.value)}
        className="w-full h-1 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
      />
    </div>
  );

  return (
    <aside className="w-72 h-full bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col" id="zero-gap-panel">
      <div className="p-4 border-b border-[var(--border)]">
        <h3 className="text-[12px] font-bold text-[var(--text-main)] uppercase tracking-widest">المعايير الفيزيائية</h3>
        <p className="text-[9px] text-[var(--accent)] font-mono mt-1">ZERO-GAP LASER CAD ENGINE</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {/* Render Mode */}
        <div className="mb-6 mb-8 border-b border-[var(--border)] pb-4">
           <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-3">حالة العرض والفيزياء (Simulation)</label>
           <div className="flex bg-[#0c0d10] p-1 border border-[var(--border)] rounded">
             <button 
               className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors rounded ${config.renderMode === 'preview' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-dim)] hover:text-white'}`}
               onClick={() => onUpdate({ ...config, renderMode: 'preview' })}
             >تقاطع التحضير</button>
             <button 
               className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors rounded ${config.renderMode === 'boolean' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-dim)] hover:text-white'}`}
               onClick={() => onUpdate({ ...config, renderMode: 'boolean' })}
             >التطابق الصفري</button>
           </div>
        </div>

        {/* Pan Parameters */}
        <section className="mb-6 border-b border-[var(--border)] pb-2">
          <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-3 text-right">أبعاد المقلاة (أداة القطع)</label>
          {renderSlider('القطر السفلي القاع', config.pan.bottomDiameter, v => updatePan('bottomDiameter', v), 50, 400)}
          {renderSlider('القطر العلوي', config.pan.topDiameter, v => updatePan('topDiameter', v), 100, 500)}
          {renderSlider('الارتفاع الكلي', config.pan.height, v => updatePan('height', v), 20, 200)}
          {renderSlider('نصف قطر تقوس الجدار', config.pan.curveRadius, v => updatePan('curveRadius', v), 50, 250, 5)}
          {renderSlider('قوس القاع (Fillet)', config.pan.bottomFilletRadius, v => updatePan('bottomFilletRadius', v), 0, 30, 0.5)}
          {renderSlider('سماكة الحافة العلوية', config.pan.rimThickness, v => updatePan('rimThickness', v), 0, 10, 0.5)}
        </section>

        {/* Tube Parameters */}
        <section className="mb-6 border-b border-[var(--border)] pb-2">
          <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-3 text-right">المقبض / الأنبوب (الخامة الأساسية)</label>
          <div className="flex justify-between text-[11px] mb-3 text-[var(--text-dim)]">
             <span>عرض: <b className="text-[var(--text-main)] font-mono">{config.tube.width}</b></span>
             <span>ارتفاع: <b className="text-[var(--text-main)] font-mono">{config.tube.height}</b></span>
          </div>
          {renderSlider('عرض المقبض', config.tube.width, v => updateTube('width', v), 10, 80)}
          {renderSlider('ارتفاع المقبض', config.tube.height, v => updateTube('height', v), 5, 50)}
          {renderSlider('سماكة المعدن', config.tube.thickness, v => updateTube('thickness', v), 0.5, 5.0, 0.1)}
          {renderSlider('تنعيم الحواف (R)', config.tube.cornerRadius, v => updateTube('cornerRadius', v), 0, Math.min(config.tube.width/2, config.tube.height/2), 0.1)}
          {renderSlider('الطول الكلي للأنبوب', config.tube.totalLength, v => updateTube('totalLength', v), 50, 300)}
          {renderSlider('طول القطعة الناتجة', config.tube.partLength, v => updateTube('partLength', v), 10, config.tube.totalLength)}
        </section>

        {/* Nesting Parameters */}
        <section className="mb-6 border-b border-[var(--border)] pb-4">
          <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-3 text-right">وضع التعشيش (Nesting)</label>
          <div className="flex bg-[#0c0d10] p-1 border border-[var(--border)] rounded mb-4">
             <button 
               className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors rounded ${config.nestingMode === 'single' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-dim)] hover:text-white'}`}
               onClick={() => onUpdate({ ...config, nestingMode: 'single' })}
             >قطعة واحدة</button>
             <button 
               className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors rounded ${config.nestingMode === 'twin' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-dim)] hover:text-white'}`}
               onClick={() => onUpdate({ ...config, nestingMode: 'twin' })}
             >قطعتان متعاكستان</button>
           </div>
           {config.nestingMode === 'twin' && renderSlider('خلوص الفاصل (Slug Gap)', config.slugGap, v => onUpdate({ ...config, slugGap: parseFloat(v) || 0 }), 0, 20, 0.5)}
        </section>

        {/* Assembly Parameters */}
        <section className="mb-2 border-b border-[var(--border)] pb-4">
          <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-3 text-right">زاوية التركيب والتموضع</label>
          <div className="flex bg-[#0c0d10] p-1 border border-[var(--border)] rounded mb-4">
             <button 
               className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors rounded ${config.assembly.tiltAxis === 'X' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-dim)] hover:text-white'}`}
               onClick={() => onUpdate({ ...config, assembly: { ...config.assembly, tiltAxis: 'X' } })}
             >محور X</button>
             <button 
               className={`flex-1 py-1 text-[10px] font-bold uppercase transition-colors rounded ${config.assembly.tiltAxis === 'Y' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-dim)] hover:text-white'}`}
               onClick={() => onUpdate({ ...config, assembly: { ...config.assembly, tiltAxis: 'Y' } })}
             >محور Y</button>
           </div>
          {renderSlider('زاوية ميلان المقلاة', config.assembly.tiltAngle, v => updateAssembly('tiltAngle', v), -90, 90)}
          {renderSlider('زاوية المقبض (Handle Angle)', config.assembly.handleAngle, v => updateAssembly('handleAngle', v), 0, 45)}
          {renderSlider('الارتفاع من القاع', config.assembly.heightOffset, v => updateAssembly('heightOffset', v), 0, 150)}
          {renderSlider('مسافة الاختراق', config.assembly.insertionDistance, v => updateAssembly('insertionDistance', v), 0, 150)}
        </section>

        {/* Final Touches */}
        <section className="mt-4 pb-4">
          <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase mb-3 text-right">اللمسات النهائية</label>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => onUpdate({ ...config, addFillet: !config.addFillet })}
              className={`w-full py-2 text-[10px] font-bold uppercase border border-[var(--border)] rounded flex items-center justify-between px-3 ${config.addFillet ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-dim)] hover:border-[var(--text-main)]'}`}
            >
              <span>تنعيم حافة القطع (0.2mm)</span>
              <div className={`w-3 h-3 rounded-full ${config.addFillet ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
            </button>
            <button 
              onClick={() => onUpdate({ ...config, thermalClearance: !config.thermalClearance })}
              className={`w-full py-2 text-[10px] font-bold uppercase border border-[var(--border)] rounded flex items-center justify-between px-3 ${config.thermalClearance ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--text-dim)] hover:border-[var(--text-main)]'}`}
            >
              <span>إضافة تخليص حراري (+0.1mm)</span>
              <div className={`w-3 h-3 rounded-full ${config.thermalClearance ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
            </button>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-[#090a0c]">
        <button 
          onClick={onExport}
          className="w-full py-2 mb-2 bg-[var(--accent)] hover:opacity-90 transition-opacity text-white font-bold text-[11px] uppercase tracking-widest rounded shadow-[0_0_15px_rgba(242,125,38,0.3)]"
        >
          تصدير 3D مباشر (STL)
        </button>
        <button 
          onClick={() => {
            const scriptContent = generateCadQueryScript(config);
            const blob = new Blob([scriptContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ZeroGap_Pipeline_${new Date().getTime()}.py`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white font-bold text-[11px] uppercase tracking-widest rounded border border-blue-500"
        >
          تنزيل سكريبت المصنع (STEP)
        </button>
        <p className="text-[9px] text-[var(--text-dim)] mt-3 text-center leading-relaxed">
          جاهز للتوجيه لمنظومة الليزر (Scrap-free Guarantee)
        </p>
      </div>
    </aside>
  );
};

export default ZeroGapControlPanel;
