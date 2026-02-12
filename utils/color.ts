
export function normalizeColor(color: string): string {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return color.toLowerCase();
  ctx.fillStyle = color;
  return ctx.fillStyle.toUpperCase(); // Returns #RRGGBB
}

export function isValidColor(color: string): boolean {
  const s = new Option().style;
  s.color = color;
  return s.color !== '';
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Converts HEX to HSL
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Converts HSL to HEX
 */
export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/**
 * Returns harmonious colors based on a source hex
 */
export function getHarmonyColors(hex: string, type: 'complementary' | 'triad' | 'analogous'): string[] {
  const { h, s, l } = hexToHsl(hex);
  switch (type) {
    case 'complementary':
      return [hslToHex((h + 180) % 360, s, l)];
    case 'triad':
      return [
        hslToHex((h + 120) % 360, s, l),
        hslToHex((h + 240) % 360, s, l)
      ];
    case 'analogous':
      return [
        hslToHex((h + 30) % 360, s, l),
        hslToHex((h + 330) % 360, s, l)
      ];
    default:
      return [];
  }
}
