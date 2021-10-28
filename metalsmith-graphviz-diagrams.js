import marked from "marked";
import markdown from "./metalsmith-marked.js";
import { createAsync as createDOTToSVGAsync } from "dot2svg-wasm";

// Generate diagrams with dot2svg
const baseMarkdownRenderer = new marked.Renderer();
const baseCodeRenderer = baseMarkdownRenderer.code;
const dotConverter = await createDOTToSVGAsync();
export default (options) => {
    const inline = options?.inline ?? true;
    const comments = options?.comments ?? false;
    const cssClasses = options?.cssClasses ?? false;
    const useDefaultFonts = options?.useDefaultFonts ?? false;

    return markdown.options({
        renderer: {
            code: function (code, language, escaped) {
                if (language === "dot2svg") {
                    let svg = dotConverter.dotToSVG(code);
                    if (svg) {
                        if (inline) {
                            svg = svg.replace(/^.*?<svg /s, "<svg ");
                        }
                        if (!comments) {
                            svg = svg.replace(/<!--.*?-->\n?/sg, "");
                        }
                        if (cssClasses) {
                            svg = svg.replace(/fill="([^"]+)" stroke="([^"]+)"/g, "class=\"diagram-$2-$1\"");
                        }
                        if (useDefaultFonts) {
                            svg = svg.replace(/ font-family="[^"]+?"/g, "");
                        }
                        return svg;
                    } else {
                        // On error, just treat the code block like normal
                        console.log(dotConverter.getConsoleOutput());
                        language = "";
                    }
                }
                return baseCodeRenderer.call(this, code, language, escaped);
            },
        },
    });
};
