import highlight from "highlight.js";
import markdown from "./metalsmith-marked.js";

export default (options) => {
    // Configure syntax highlighting aliases
    const aliases = options.aliases ?? [];
    aliases.forEach(row => highlight.registerAliases(row.tag, { languageName: row.language }));

    return markdown.options({
        highlight: (code, language) => {
            if (language && highlight.getLanguage(language)) {
                return highlight.highlight(code, { language }).value;
            } else {
                return highlight.highlightAuto(code).value;
            }
        },
    });
};
