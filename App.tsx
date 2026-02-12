
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import Header from './components/Header';
import ColorVariantManager from './components/ColorVariantManager';
import SVGPreview from './components/SVGPreview';
import ColorPicker from './components/ColorPicker';
import { ColorOption, SvgData, ColorMapping, SVGVariant, SavedPalette } from './types';
import { extractUniqueColors, applyColorMapping, injectBackground, injectMetadata, extractMetadata } from './services/svgProcessor';
import { generateId } from './utils/color';
import { cartesianProduct } from './utils/cartesian';
import { Upload, Download, Copy, LayoutGrid, List, AlertCircle, RefreshCw, Box, Save, Bookmark, Trash2, CheckCircle2, Palette, Layers, Shuffle, Sparkles, Info, FileCode } from 'lucide-react';
import JSZip from 'jszip';

const MAX_SAFE_VARIANTS = 500;
const LIBRARY_STORAGE_KEY = 'svg_palette_pro_library_v4';
const SESSION_STORAGE_KEY = 'svg_palette_pro_session_v4';

const App: React.FC = () => {
  const [svgData, setSvgData] = useState<SvgData | null>(null);
  const [colorOptions, setColorOptions] = useState<ColorOption[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [permutationMode, setPermutationMode] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [canvasBg, setCanvasBg] = useState('#F8FAFC');
  const [bakeBg, setBakeBg] = useState(false);

  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);

  useEffect(() => {
    try {
      const storedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY);
      if (storedLibrary) {
        const parsed = JSON.parse(storedLibrary);
        if (Array.isArray(parsed)) setSavedPalettes(parsed);
      }
    } catch (e) {
      console.error("Failed to load library", e);
    }

    try {
      const storedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        const session = JSON.parse(storedSession);
        if (session.svgData) setSvgData(session.svgData);
        if (session.colorOptions) setColorOptions(session.colorOptions);
        if (session.canvasBg) setCanvasBg(session.canvasBg);
        if (session.permutationMode !== undefined) setPermutationMode(session.permutationMode);
        if (session.bakeBg !== undefined) setBakeBg(session.bakeBg);
      }
    } catch (e) {
      console.error("Failed to load session", e);
    }
  }, []);

  useEffect(() => {
    if (!svgData) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return;
    }
    const sessionData = {
      svgData,
      colorOptions,
      canvasBg,
      permutationMode,
      bakeBg
    };
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn("Session too large to persist fully");
    }
  }, [svgData, colorOptions, canvasBg, permutationMode, bakeBg]);

  const updateLibrary = (newLibrary: SavedPalette[]) => {
    setSavedPalettes(newLibrary);
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(newLibrary));
  };

  const processFiles = async (files: FileList | File[]) => {
    let projectMetadataFound = false;
    let newBaseSvg: { content: string, name: string } | null = null;
    const additionalSvgPalettes: string[][] = [];
    const incomingLibraryPalettes: SavedPalette[] = [];

    for (const file of Array.from(files)) {
      if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) continue;

      try {
        const text = await file.text();
        const metadata = extractMetadata(text);
        
        if (metadata) {
          if (metadata.savedPalettes && Array.isArray(metadata.savedPalettes)) {
            incomingLibraryPalettes.push(...metadata.savedPalettes);
          }
          if (!projectMetadataFound && metadata.svgData && metadata.colorOptions) {
            setSvgData(metadata.svgData);
            setColorOptions(metadata.colorOptions);
            if (metadata.canvasBg) setCanvasBg(metadata.canvasBg);
            setRestoreSuccess(true);
            setTimeout(() => setRestoreSuccess(false), 3000);
            projectMetadataFound = true;
          }
        } else {
          if (!newBaseSvg) {
            newBaseSvg = { content: text, name: file.name };
          } else {
            additionalSvgPalettes.push(extractUniqueColors(text));
          }
        }
      } catch (err) {
        console.error("Error processing file", file.name, err);
      }
    }

    if (incomingLibraryPalettes.length > 0) {
      const existingIds = new Set(savedPalettes.map(p => p.id));
      const filteredIncoming = incomingLibraryPalettes.filter(p => !existingIds.has(p.id));
      if (filteredIncoming.length > 0) {
        updateLibrary([...filteredIncoming, ...savedPalettes]);
      }
    }

    if (!projectMetadataFound && newBaseSvg) {
      const baseColors = extractUniqueColors(newBaseSvg.content);
      const options: ColorOption[] = baseColors.map(c => ({
        id: generateId(),
        originalColor: c,
        replacements: [c]
      }));

      additionalSvgPalettes.forEach(palette => {
        options.forEach((opt, idx) => {
          const replacement = palette[idx] || opt.originalColor;
          opt.replacements.push(replacement);
        });
      });

      setSvgData({
        originalContent: newBaseSvg.content,
        detectedColors: baseColors
      });
      setColorOptions(options);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
    e.target.value = '';
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const saveCurrentPalette = () => {
    const name = prompt("Name your theme configuration:", `Theme ${savedPalettes.length + 1}`);
    if (!name) return;

    const newPalette: SavedPalette = {
      id: generateId(),
      name,
      timestamp: Date.now(),
      colorOptions: JSON.parse(JSON.stringify(colorOptions)), 
      canvasBg
    };

    updateLibrary([newPalette, ...savedPalettes]);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const applySavedPalette = (palette: SavedPalette) => {
    if (!svgData) {
        alert("Please upload an SVG first to apply these colors.");
        return;
    }
    const newOptions = colorOptions.map(currentOpt => {
      const matchingSaved = palette.colorOptions.find(p => p.originalColor.toUpperCase() === currentOpt.originalColor.toUpperCase());
      if (matchingSaved) {
        return { ...currentOpt, replacements: [...matchingSaved.replacements] };
      }
      return currentOpt;
    });
    setColorOptions(newOptions);
    setCanvasBg(palette.canvasBg);
  };

  const deletePalette = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this theme from your library?")) {
      updateLibrary(savedPalettes.filter(p => p.id !== id));
    }
  };

  const resetApp = () => {
    if (confirm("Clear current work and start over?")) {
      setSvgData(null);
      setColorOptions([]);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const variants = useMemo(() => {
    if (!svgData) return [];
    const metadata = { svgData, colorOptions, canvasBg, savedPalettes, v: '5' };

    if (permutationMode) {
      const replacementArrays = colorOptions.map(opt => Array.from(new Set(opt.replacements)));
      const combinations = cartesianProduct<string>(replacementArrays);
      if (combinations.length > MAX_SAFE_VARIANTS) return [];
      return combinations.map((combo, idx) => {
        const mapping: ColorMapping = {};
        colorOptions.forEach((opt, i) => { mapping[opt.originalColor] = combo[i]; });
        let content = applyColorMapping(svgData.originalContent, mapping);
        if (bakeBg) content = injectBackground(content, canvasBg);
        content = injectMetadata(content, metadata);
        return { id: `variant-${idx}`, mapping, svgContent: content };
      });
    } else {
      const maxSets = Math.max(0, ...colorOptions.map(opt => opt.replacements.length));
      return Array.from({ length: maxSets }).map((_, idx) => {
        const mapping: ColorMapping = {};
        colorOptions.forEach(opt => {
          mapping[opt.originalColor] = opt.replacements[idx] || opt.replacements[opt.replacements.length - 1];
        });
        let content = applyColorMapping(svgData.originalContent, mapping);
        if (bakeBg) content = injectBackground(content, canvasBg);
        content = injectMetadata(content, metadata);
        return { id: `set-${idx}`, mapping, svgContent: content };
      });
    }
  }, [svgData, colorOptions, canvasBg, bakeBg, permutationMode, savedPalettes]);

  const totalPossiblePermutations = colorOptions.reduce((acc, opt) => acc * (new Set(opt.replacements).size), 1);
  const tooManyVariants = permutationMode && totalPossiblePermutations > MAX_SAFE_VARIANTS;

  const downloadAll = async () => {
    if (!variants.length) return;
    const zip = new JSZip();
    variants.forEach((v, i) => {
      zip.file(`${permutationMode ? 'variation' : 'theme'}-${i + 1}.svg`, v.svgContent);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `svg_bundle_${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadSingle = (content: string, name: string) => {
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${name}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className={`min-h-screen flex flex-col bg-slate-50 transition-colors duration-300 ${isDragging ? 'bg-blue-50/50' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {restoreSuccess && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
            <div className="bg-blue-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-blue-500/50">
              <Sparkles className="w-5 h-5 text-blue-200" />
              <span className="font-bold uppercase tracking-widest text-xs">Full Project Restored</span>
            </div>
          </div>
        )}

        {!svgData ? (
          <div className="space-y-16 py-12">
            <div 
              className={`h-[45vh] flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] bg-white shadow-sm p-12 transition-all duration-300 group ${isDragging ? 'border-blue-500 bg-blue-50/20 scale-[1.01]' : 'border-slate-300 hover:border-blue-400'}`}
            >
              <div className={`p-6 rounded-[2rem] mb-6 transition-all duration-300 ${isDragging ? 'bg-blue-600 scale-110' : 'bg-blue-50 group-hover:scale-110'}`}>
                {isDragging ? <FileCode className="w-12 h-12 text-white" /> : <Upload className="w-12 h-12 text-blue-600" />}
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">
                {isDragging ? 'Drop to Sync State' : 'Drop your SVG files here'}
              </h2>
              <p className="text-slate-500 mb-4 text-center max-w-sm font-medium">
                Drag exported files to restore all sets and themes, or drop multiple SVGs to create a collection.
              </p>
              <div className="flex items-center space-x-2 mb-8 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Library and session autosync included</span>
              </div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-100 active:scale-95">
                Select Files
                <input type="file" className="hidden" accept=".svg" multiple onChange={handleFileUpload} />
              </label>
            </div>

            {savedPalettes.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                       <Bookmark className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Saved Themes</h2>
                  </div>
                  <span className="text-xs text-slate-400 font-black uppercase tracking-widest">{savedPalettes.length} Presets</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {savedPalettes.map(palette => (
                    <div 
                      key={palette.id}
                      onClick={() => applySavedPalette(palette)}
                      className="group cursor-pointer p-6 bg-white border border-slate-200 rounded-[2.5rem] hover:border-blue-400 hover:shadow-2xl hover:shadow-blue-500/10 transition-all flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <span className="font-black text-slate-800 truncate pr-4 text-lg leading-tight">{palette.name}</span>
                        <button 
                          onClick={(e) => deletePalette(palette.id, e)}
                          className="text-slate-200 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex -space-x-3 mb-8">
                        {palette.colorOptions.slice(0, 5).map((o, idx) => (
                          <div 
                            key={idx} 
                            className="w-12 h-12 rounded-2xl border-4 border-white shadow-md transition-transform group-hover:-translate-y-2" 
                            style={{ backgroundColor: o.replacements[0], zIndex: 10 - idx }} 
                          />
                        ))}
                      </div>
                      <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(palette.timestamp).toLocaleDateString()}</span>
                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest group-hover:translate-x-1 transition-transform">Apply Theme →</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Controls</h2>
                  <div className="flex space-x-2">
                    <button 
                      onClick={saveCurrentPalette}
                      className={`p-2.5 flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${saveSuccess ? 'text-white bg-emerald-500 shadow-lg shadow-emerald-200' : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'}`}
                    >
                      {saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                      <span>{saveSuccess ? 'Saved' : 'Save Theme'}</span>
                    </button>
                    <button 
                      onClick={resetApp}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-colors"
                      title="Clear & Restart"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shuffle className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-700">Permutations</span>
                    </div>
                    <button 
                      onClick={() => setPermutationMode(!permutationMode)}
                      className={`w-10 h-6 rounded-full relative transition-all ${permutationMode ? 'bg-blue-600 shadow-inner' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${permutationMode ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Box className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-700">Canvas</span>
                    </div>
                    <ColorPicker value={canvasBg} onChange={setCanvasBg} />
                  </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  <ColorVariantManager 
                    colorOptions={colorOptions}
                    onUpdate={setColorOptions}
                    permutationMode={permutationMode}
                  />
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button 
                    onClick={downloadAll}
                    disabled={tooManyVariants || variants.length === 0}
                    className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 disabled:cursor-not-allowed text-white py-5 px-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-3 transition-all shadow-xl shadow-slate-100 active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download Bundle</span>
                  </button>
                  <p className="text-[9px] text-slate-400 text-center mt-4 font-black uppercase tracking-widest">Metadata-rich export</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <div className={`bg-white p-10 rounded-[3rem] shadow-sm border transition-all duration-300 min-h-[70vh] ${isDragging ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-200'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-4">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                        {isDragging ? 'Drop to Sync Files' : (permutationMode ? 'All Combinations' : 'Theme Results')}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        {isDragging ? 'Add more files to the workspace.' : `Displaying ${variants.length} unique variations.`}
                    </p>
                  </div>
                </div>

                {variants.length === 0 ? (
                  <div className="py-32 flex flex-col items-center justify-center text-slate-300">
                    <div className="bg-slate-50 p-10 rounded-[2.5rem] mb-8">
                        <LayoutGrid className="w-20 h-20 opacity-20" />
                    </div>
                    <p className="text-center font-bold uppercase tracking-widest text-sm">
                      {tooManyVariants ? "Variation limit reached." : "Customize sets to see results."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {variants.map((v, i) => (
                      <div 
                        key={v.id} 
                        className="group bg-slate-50 border border-slate-100 rounded-[3rem] overflow-hidden hover:border-blue-300 hover:bg-white transition-all hover:shadow-2xl hover:shadow-blue-500/10 active:scale-[0.98]"
                      >
                        <div 
                          className="p-10 flex justify-center items-center min-h-[300px] relative transition-colors"
                          style={{ backgroundColor: v.svgContent.includes('data-generated-bg="true"') ? 'transparent' : canvasBg }}
                        >
                           <SVGPreview content={v.svgContent} className="max-h-[220px] max-w-full drop-shadow-2xl" />
                           <div className="absolute top-6 left-8">
                                <span className="text-[11px] font-black text-slate-300 group-hover:text-blue-400 transition-colors uppercase tracking-widest">
                                    {permutationMode ? `P-${i + 1}` : `Theme ${i + 1}`}
                                </span>
                           </div>
                        </div>
                        <div className="px-8 py-5 bg-white border-t border-slate-50 flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Export Variation</span>
                          <div className="flex space-x-2">
                             <button 
                                onClick={() => downloadSingle(v.svgContent, `variation-${i+1}`)}
                                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                                title="Download"
                             >
                               <Download className="w-5 h-5" />
                             </button>
                             <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(v.svgContent);
                                    alert("SVG code copied.");
                                }}
                                className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                                title="Copy"
                             >
                               <Copy className="w-5 h-5" />
                             </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-16 border-t border-slate-200 mt-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
          <div className="flex items-center space-x-2 mb-6">
            <Palette className="w-6 h-6 text-blue-600" />
            <span className="text-slate-900 font-black uppercase tracking-widest text-lg">SVG Palette Pro</span>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">&copy; {new Date().getFullYear()} — Built for Designers</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
