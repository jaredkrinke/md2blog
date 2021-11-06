import { Goldsmith, Plugin } from "./goldsmith.ts"

const input = "content";
const output = "out";

// Logging plugins
const logMetadata: Plugin = (_files, metadata) => console.log(metadata);
const logFiles: Plugin = (files, _metadata) => {
    console.log(files.map(file => {
        const { data, ...rest } = file;
        return { ...rest, ["data.length"]: data.length };
    }));
};

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
