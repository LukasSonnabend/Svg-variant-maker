
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Check } from 'lucide-react';
import { getHarmonyColors } from '../utils/color';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, onRemove, showRemove }) => {
  const [showHarmony, setShowHarmony] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const harmonies = [
    { label: 'Triad', colors: getHarmonyColors(value, 'triad') },
    { label: 'Complementary', colors: getHarmonyColors(value, 'complementary') },
    { label: 'Analogous', colors: getHarmonyColors(value, 'analogous') }
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHarmony(false);
      }
    };
    if (showHarmony) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHarmony]);

  return (
    <div className="relative flex flex-col space-y-2 group/root" ref={containerRef}>
      <div className="flex items-center space-x-2">
        <div className="relative w-8 h-8 rounded-lg border border-slate-300 overflow-hidden cursor-pointer shadow-sm flex-shrink-0 group hover:border-blue-400 transition-colors">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
          />
        </div>
        <input 
          type="text" 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="text-[10px] font-mono w-16 px-1.5 py-1 rounded border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none uppercase font-bold text-slate-700"
        />
        
        <button
          onClick={() => setShowHarmony(!showHarmony)}
          className={`p-1.5 rounded-lg transition-all ${showHarmony ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-300 hover:text-blue-600 hover:bg-blue-50'}`}
          title="Color Harmonies"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        {showRemove && onRemove && (
          <button 
            onClick={onRemove}
            className="text-slate-200 hover:text-red-500 transition-colors p-1"
            title="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {showHarmony && (
        <div className="absolute top-full mt-2 left-0 z-[100] bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 w-56 animate-in fade-in zoom-in-95 duration-200 origin-top-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.1em]">Harmonies</span>
            <button onClick={() => setShowHarmony(false)} className="text-slate-300 hover:text-slate-500">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {harmonies.map((h) => (
              <div key={h.label} className="space-y-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{h.label}</p>
                <div className="flex space-x-2">
                  {h.colors.map((c, i) => (
                    <button
                      key={`${h.label}-${i}`}
                      onClick={() => {
                        onChange(c);
                        setShowHarmony(false);
                      }}
                      className="flex-1 h-7 rounded-lg border border-slate-100 shadow-sm transition-all hover:scale-110 hover:shadow-md active:scale-95 group/swatch relative"
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/swatch:opacity-100 transition-opacity">
                         <Check className="w-3 h-3 text-white mix-blend-difference" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;
