export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function getLuminance(r: number, g: number, b: number): number {
  const [lr, lg, lb] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

export function isDark(hex: string): boolean {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return getLuminance(rgb.r, rgb.g, rgb.b) < 0.5;
}

export function adjustBrightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 + amount / 100;

  const newRgb = {
    r: Math.max(0, Math.min(255, rgb.r * factor)),
    g: Math.max(0, Math.min(255, rgb.g * factor)),
    b: Math.max(0, Math.min(255, rgb.b * factor))
  };

  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

export function addAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`;
}

export function adjustLightness(hex: string, lightness: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  const newL = Math.max(0, Math.min(1, lightness));

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
  const p = 2 * newL - q;

  const newR = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const newG = Math.round(hue2rgb(p, q, h) * 255);
  const newB = Math.round(hue2rgb(p, q, h - 1/3) * 255);

  return rgbToHex(newR, newG, newB);
}

export function generateThemeColors(backgroundColor: string, textColor: string) {
  const bgIsDark = isDark(backgroundColor);
  const textIsDark = isDark(textColor);

  let surfaceColor: string;
  if (bgIsDark) {
    surfaceColor = adjustBrightness(backgroundColor, 5);
  } else {
    surfaceColor = adjustBrightness(backgroundColor, -5);
  }

  const surfaceTransparent = addAlpha(surfaceColor, 0.9);

  let hoverColor: string;
  if (bgIsDark) {
    hoverColor = addAlpha(textColor, 0.08);
  } else {
    hoverColor = addAlpha(textColor, 0.05);
  }

  let inputColor: string;
  if (bgIsDark) {
    inputColor = adjustBrightness(backgroundColor, 3);
  } else {
    inputColor = "#ffffff";
  }

  const borderColor = addAlpha(textColor, 0.15);
  const borderSubtle = addAlpha(textColor, 0.08);

  const textPrimary = textColor;
  const textSecondary = addAlpha(textColor, 0.7);
  const textMuted = addAlpha(textColor, 0.5);

  let accentColor: string;
  let accentHover: string;

  if (textIsDark) {
    accentColor = "#60A5FA";
    accentHover = "#93C5FD";
  } else {
    accentColor = "#2563EB";
    accentHover = "#1D4ED8";
  }

  const shadowColor = addAlpha(textColor, 0.1);

  const focusRing = addAlpha(accentColor, 0.6);

  return {
    background: backgroundColor,
    surface: surfaceColor,
    surfaceTransparent: surfaceTransparent,
    hover: hoverColor,
    input: inputColor,
    border: borderColor,
    borderSubtle: borderSubtle,
    textPrimary,
    textSecondary,
    textMuted,
    accent: accentColor,
    accentHover,
    shadow: shadowColor,
    focusRing
  };
}

export function generateAllThemeColors(presets: Array<{ backgroundColor: string; textColor: string }>) {
  return presets.map(preset =>
    generateThemeColors(preset.backgroundColor, preset.textColor)
  );
}
