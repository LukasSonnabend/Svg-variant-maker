
import { normalizeColor } from '../utils/color';

export function extractUniqueColors(svgString: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const colors = new Set<string>();

  const colorAttributes = ['fill', 'stroke', 'stop-color'];

  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    colorAttributes.forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val && val !== 'none' && val !== 'inherit' && !val.startsWith('url(')) {
        colors.add(normalizeColor(val));
      }
    });

    const style = el.getAttribute('style');
    if (style) {
      colorAttributes.forEach((attr) => {
        const regex = new RegExp(`${attr}\\s*:\\s*([^;!]+)`, 'i');
        const match = style.match(regex);
        if (match && match[1]) {
          const val = match[1].trim();
          if (val !== 'none' && val !== 'inherit' && !val.startsWith('url(')) {
            colors.add(normalizeColor(val));
          }
        }
      });
    }
  });

  const styleTags = doc.querySelectorAll('style');
  styleTags.forEach((tag) => {
    const css = tag.textContent || '';
    const colorRegex = /#(?:[0-9a-fA-F]{3}){1,2}\b|rgba?\([^)]+\)|[a-z]{3,20}/gi;
    const matches = css.match(colorRegex);
    if (matches) {
      matches.forEach((m) => {
        if (m !== 'none' && m !== 'inherit' && isActuallyColor(m)) {
          colors.add(normalizeColor(m));
        }
      });
    }
  });

  return Array.from(colors).filter(c => c !== 'TRANSPARENT');
}

function isActuallyColor(str: string): boolean {
  const s = new Option().style;
  s.color = str;
  return s.color !== '';
}

export function applyColorMapping(svgString: string, mapping: Record<string, string>): string {
  let result = svgString;
  const sortedColors = Object.keys(mapping).sort((a, b) => b.length - a.length);

  sortedColors.forEach((original) => {
    const replacement = mapping[original];
    const escaped = original.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`${escaped}(?=[\\s;'"\\),}]|$)`, 'gi');
    result = result.replace(regex, replacement);
  });

  return result;
}

export function injectBackground(svgString: string, color: string): string {
  if (!color || color === 'transparent' || color === '#F8FAFC') return svgString;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', color);
  rect.setAttribute('data-generated-bg', 'true');

  svg.insertBefore(rect, svg.firstChild);

  return new XMLSerializer().serializeToString(doc);
}

export function injectMetadata(svgString: string, metadata: any): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return svgString;

  const existing = doc.querySelector('#svg-palette-pro-metadata');
  if (existing) existing.remove();

  const script = doc.createElementNS('http://www.w3.org/2000/svg', 'script');
  script.setAttribute('id', 'svg-palette-pro-metadata');
  script.setAttribute('type', 'application/json');
  script.textContent = JSON.stringify(metadata);
  
  svg.appendChild(script);

  return new XMLSerializer().serializeToString(doc);
}

export function extractMetadata(svgString: string): any | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const script = doc.querySelector('#svg-palette-pro-metadata');
    if (script && script.textContent) {
      return JSON.parse(script.textContent);
    }
  } catch (e) {
    console.error('Failed to extract metadata', e);
  }
  return null;
}
