import { Goldsmith, Plugin } from "./goldsmith.ts"

const input = "content";
const output = "out";

// Logging plugins
const logMetadata: Plugin = (_files, metadata) => console.log(metadata);
const logFiles: Plugin = (files, _metadata) => {
    // deno-lint-ignore no-explicit-any
    const fileInfo: { [path: string]: { [prop: string]: any } } = {};
    Object.keys(files).forEach(key => {
        const { data, ...rest } = files[key];
        fileInfo[key] = {
            ...rest,
            ["data.length"]: data.length,
        };
    });

    console.log(fileInfo);
};

interface ReadMetadataOptions {
    path: string;
    propertyName?: string;
};

function readMetadata(options: ReadMetadataOptions): Plugin {
    const textDecoder = new TextDecoder();
    const path = options.path;
    const propertyName = options.propertyName;
    return (files, metadata) => {
        const file = files[path];
        delete files[path];
        let destination = metadata;
        if (propertyName) {
            destination = {};
            metadata[propertyName] = destination;
        }
        Object.assign(destination, JSON.parse(textDecoder.decode(file.data)));
    };
}

await Goldsmith()
    .source(input)
    .destination(output)
    .clean(true)
    .use(readMetadata({
        path: "site.json",
        propertyName: "site",
    }))
    .use(logMetadata)
    .use(logFiles)
    .build();
