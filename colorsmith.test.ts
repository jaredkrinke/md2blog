import { assertEquals } from "https://deno.land/std@0.113.0/testing/asserts.ts";
import { hexToRGB, rgbToHex, rgbToHSL, hslToRGB } from "./colorsmith.ts";

Deno.test({
    name: "RGB to hex",
    fn: () => {
        assertEquals(rgbToHex({ r: 0.5, g: 0.5, b: 0.5 }), "#808080");
        assertEquals(rgbToHex({ r: 0, g: 0, b: 0 }), "#000000");
        assertEquals(rgbToHex({ r: 1, g: 1, b: 1 }), "#ffffff");
    },
});

Deno.test({
    name: "Hex to RGB",
    fn: () => {
        assertEquals(hexToRGB("#808080"), { r: 0.5, g: 0.5, b: 0.5 });
    },
});

Deno.test({
    name: "Round-trip hex through RGB",
    fn: () => {
        for (const color of [
            "#000000",
            "#ffffff",
            "#654321",
            "#123456",
        ]) {
            assertEquals(rgbToHex(hexToRGB(color)), color);
        }
    },
});

Deno.test({
    name: "RGB to HSL",
    fn: () => {
        assertEquals(rgbToHSL({ r: 1, g: 0, b: 0}), { h: 0, s: 1, l: 0.5});
        assertEquals(rgbToHSL({ r: 0, g: 1, b: 1}), { h: 180, s: 1, l: 0.5});
    },
});

Deno.test({
    name: "Round-trip hex through RGB and HSL",
    fn: () => {
        const colors = [
            "#123456",
            "#654321",
            "#808080",
            "#baf00d",
            "#999999",
            "#f1f2f3",
        ];

        for (const color of colors) {
            assertEquals(rgbToHex(hslToRGB(rgbToHSL(hexToRGB(color)))), color);
        }
    },
});
