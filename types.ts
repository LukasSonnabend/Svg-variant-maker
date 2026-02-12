
export interface ColorOption {
  id: string;
  originalColor: string;
  replacements: string[];
}

export interface ColorMapping {
  [originalColor: string]: string;
}

export interface SVGVariant {
  id: string;
  mapping: ColorMapping;
  svgContent: string;
}

export interface SvgData {
  originalContent: string;
  detectedColors: string[];
}

export interface SavedPalette {
  id: string;
  name: string;
  timestamp: number;
  colorOptions: ColorOption[];
  canvasBg: string;
}
