import marked from "marked";
import { Buffer } from "buffer";

// Recursive merge
// TODO: Find a deep merge library?
// TODO: How to handle overwritten properties (esp. on the renderer)?
function merge(destination, source) {
    Object.keys(source).forEach(key => {
        const value = source[key];
        if (typeof(value) === "object") {
            let nestedDestination = destination[key];
            if (!nestedDestination) {
                nestedDestination = {};
                destination[key] = nestedDestination;
            }

            merge(nestedDestination, value);
        } else {
            destination[key] = value;
        }
    });
};

let markedOptionsStatic = {};
const markdown = function (options) {
    const markedOptions = markedOptionsStatic;
    if (options) {
        merge(markedOptions, options);
    }
    markedOptionsStatic = {};

    // Merge renderer options onto an actual instance of marked.Renderer
    if (markedOptions.renderer) {
        const renderer = new marked.Renderer();
        merge(renderer, markedOptions.renderer);
        markedOptions.renderer = renderer;
    }


    const markdownPattern = /^(.*)\.md$/;
    const textDecoder = new TextDecoder();
    return (files, metalsmith, done) => {
        marked.setOptions(marked.getDefaults());
        marked.use(markedOptions);
        Object.keys(files).forEach(fileName => {
            const matchGroups = markdownPattern.exec(fileName);
            const file = files[fileName];
            if (matchGroups) {
                // Process
                const html = marked(textDecoder.decode(file.contents));
                file.contents = Buffer.from(html);

                // Rename to HTML
                const htmlFileName = `${matchGroups[1]}.html`;
                delete files[fileName];
                files[htmlFileName] = file;
            }
        });

        done();
    };
};

const noop = (files, metalsmith, done) => done();
markdown.options = (options) => {
        merge(markedOptionsStatic, options);
        return noop;
};

export default markdown;
