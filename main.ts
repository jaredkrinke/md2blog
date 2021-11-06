import { Goldsmith, Plugin } from "./goldsmith.ts"
import { parse as parseYAML } from "https://deno.land/std@0.113.0/encoding/_yaml/parse.ts";

const input = "content";
const output = "out";

// Logging plugins
const logMetadata: Plugin = (_files, goldsmith) => console.log(goldsmith.metadata());
const logFiles: Plugin = (files) => {
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

// Plugin for reading global metadata
interface ReadMetadataOptions {
    path: string;
    propertyName?: string;
}

function readMetadata(options: ReadMetadataOptions): Plugin {
    const textDecoder = new TextDecoder();
    const path = options.path;
    const propertyName = options.propertyName;
    return (files, goldsmith) => {
        const file = files[path];
        delete files[path];
        const parsedObject = JSON.parse(textDecoder.decode(file.data));
        if (propertyName) {
            goldsmith.metadata({ [propertyName]: parsedObject});
        } else {
            goldsmith.metadata(parsedObject);
        }
    };
}

// Plugin for reading YAML front matter
interface FrontmatterOptions {
    pattern?: RegExp;
}

function frontmatter(options?: FrontmatterOptions): Plugin {
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    const pattern = options?.pattern ?? /\.md$/;
    const frontmatterPattern = /^---\r?\n(.*?)\r?\n---\r?\n/ms;
    return (files) => {
        for (const key of Object.keys(files)) {
            if (pattern.test(key)) {
                const file = files[key];
                const text = textDecoder.decode(file.data);
                const matches = frontmatterPattern.exec(text);
                if (matches) {
                    const yamlText = matches[1];
                    const yaml = parseYAML(yamlText);
                    Object.assign(file, yaml);

                    const body = text.slice(matches[0].length);
                    file.data = textEncoder.encode(body);
                }
            }
        }
    };
}

await Goldsmith()
    .metadata({ metadataWorks: true })
    .source(input)
    .destination(output)
    .clean(true)
    .use(readMetadata({
        path: "site.json",
        propertyName: "site",
    }))
    .use(frontmatter())
    .use(logMetadata)
    .use(logFiles)
    .build();
