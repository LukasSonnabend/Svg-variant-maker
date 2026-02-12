
import React from 'react';
import { ColorOption } from '../types';
import ColorPicker from './ColorPicker';
import { Plus, Trash2, Palette, Info } from 'lucide-react';

interface ColorVariantManagerProps {
  colorOptions: ColorOption[];
  onUpdate: (updated: ColorOption[]) => void;
  permutationMode: boolean;
}

const ColorVariantManager: React.FC<ColorVariantManagerProps> = ({ colorOptions, onUpdate, permutationMode }) => {
  
  const maxSets = Math.max(0, ...colorOptions.map(opt => opt.replacements.length));

  const addSet = () => {
    onUpdate(colorOptions.map(opt => ({
      ...opt,
      replacements: [...opt.replacements, opt.replacements[opt.replacements.length - 1]]
    })));
  };

  const removeSet = (setIndex: number) => {
    if (maxSets <= 1) return;
    onUpdate(colorOptions.map(opt => ({
      ...opt,
      replacements: opt.replacements.filter((_, i) => i !== setIndex)
    })));
  };

  const updateSetColor = (colorOptionId: string, setIndex: number, newColor: string) => {
    onUpdate(colorOptions.map(opt => {
      if (opt.id === colorOptionId) {
        const next = [...opt.replacements];
        next[setIndex] = newColor;
        return { ...opt, replacements: next };
      }
      return opt;
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Palette className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">Theme Sets</h3>
        </div>
        <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase tracking-widest">
          {maxSets} Active {maxSets === 1 ? 'Set' : 'Sets'}
        </span>
      </div>

      {permutationMode && (
        <div className="flex items-start space-x-3 p-4 bg-slate-900 rounded-2xl border border-slate-800 text-slate-200">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-400" />
          <p className="text-xs font-medium leading-relaxed">
            Permutation Mode is ON. Every unique color defined across all sets will be used to generate exhaustive combinations.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {Array.from({ length: maxSets }).map((_, setIdx) => (
          <div 
            key={`set-card-${setIdx}`} 
            className="relative p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm transition-all hover:border-blue-300 group"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-slate-200">
                  {setIdx + 1}
                </div>
                <h4 className="font-bold text-slate-900">Set {setIdx + 1} {setIdx === 0 ? '(Original)' : ''}</h4>
              </div>
              
              {maxSets > 1 && (
                <button 
                  onClick={() => removeSet(setIdx)}
                  className="text-slate-300 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove this set"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {colorOptions.map((opt) => (
                <div key={`${opt.id}-set-${setIdx}`} className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 transition-colors hover:bg-white hover:border-slate-200">
                  <div className="flex items-center space-x-3 overflow-hidden pr-2">
                    <div 
                      className="w-6 h-6 rounded border border-slate-200 shadow-sm flex-shrink-0" 
                      style={{ backgroundColor: opt.originalColor }}
                    />
                    <span className="text-[10px] font-mono text-slate-400 truncate">{opt.originalColor}</span>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <ColorPicker 
                      value={opt.replacements[setIdx] || opt.originalColor}
                      onChange={(color) => updateSetColor(opt.id, setIdx, color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={addSet}
        className="w-full py-6 flex flex-col items-center justify-center space-y-2 rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-all group shadow-sm active:scale-[0.98]"
      >
        <div className="bg-slate-50 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest">Create New Variation Set</span>
      </button>
    </div>
  );
};

export default ColorVariantManager;
