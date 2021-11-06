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

// const readMetadata: (path: string) => Plugin = (path) => {
//     const textDecoder = new TextDecoder();
//     return async (files, metadata) => {

//     };
// };

await Goldsmith()
    .metadata({
        site: {
            title: "Hi there",
        },
    })
    .source(input)
    .destination(output)
    .clean(true)
    .use(logMetadata)
    .use(logFiles)
    .build();
