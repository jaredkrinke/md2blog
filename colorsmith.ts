// Color conversions
/** Represents a color in red, green, and blue (all 0 - 1.0). */
export type RGB = { r: number, g: number, b: number };

/** Represents a color using hue (0 - 360 degrees), saturation (0 - 1.0), and lightness (0 - 1.0). */
export type HSL = { h: number, s: number, l: number };

export class ColorsmithError extends Error {
    constructor(message: string) {
        super(message);
    }
}

const max = 256;

/** Converts a 6 digit hex color of the form "#RRGGBB" to RGB (0 - 1.0). Note: 3 digit form ("#123") is not supported.  */
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
export function hexToRGB(hex: string): RGB {
    if (!hexColorPattern.test(hex)) {
        throw new ColorsmithError(`Invalid color format: "${hex}" (expected: "#789abc")`);
    }

    const r = parseInt(hex.substr(1, 2), 16) / max;
    const g = parseInt(hex.substr(3, 2), 16) / max;
    const b = parseInt(hex.substr(5, 2), 16) / max;
    return { r, g, b};
}

export function rgbToHex(rgb: RGB): string {
    const { r, g, b } = rgb;
    return "#" + [r, g, b]
        .map(x => Math.min(max - 1, Math.floor(x * max)).toString(16))
        .map(str => str.length === 1 ? "0" + str : str)
        .join("");
}

export function rgbToHSL(rgb: RGB): HSL {
    const { r, g, b} = rgb;
    const v = Math.max(r, g, b);
    const c = Math.max(r, g, b) - Math.min(r, g, b);
    const l = v - c / 2;
    const h = 60 * ((c === 0) ? 0
        : ((v === r) ? ((g - b) / c)
        : ((v === g) ? (2 + (b - r) / c)
        : (4 + (r - g) / c)
    )));

    const s = (l === 0 || l === 1) ? 0 : (c / (1 - Math.abs(2 * v - c - 1)));

    return { h, s, l };
}

export function hslToRGB(hsl: HSL): RGB {
    const { h, s, l } = hsl;
    const f: (n: number) => number = (n) => {
        const k = (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }

    return {
        r: f(0),
        g: f(8),
        b: f(4),
    }
}
