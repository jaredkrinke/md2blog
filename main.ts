import { Goldsmith, Plugin } from "./goldsmith.ts"
import { parse as parseYAML } from "https://deno.land/std@0.113.0/encoding/_yaml/parse.ts";

const input = "content";
const output = "out";

// Logging plugins
const goldsmithLog: Plugin = (files, goldsmith) => {
    // deno-lint-ignore no-explicit-any
    const fileInfo: { [path: string]: { [prop: string]: any } } = {};
    Object.keys(files).forEach(key => {
        const { data, ...rest } = files[key];
        fileInfo[key] = {
            ...rest,
            ["data.length"]: data.length,
        };
    });

    console.log(goldsmith.metadata())
    console.log(fileInfo);
};

// Plugin for reading global metadata from files
type GoldsmithMetadataOptions = string | { [property: string]: string };

function goldsmithMetadata(options: GoldsmithMetadataOptions): Plugin {
    const textDecoder = new TextDecoder();
    const rows: { path: string, propertyName?: string }[] = [];
    if (typeof(options) === "string") {
        rows.push({ path: options });
    } else {
        rows.push(...Object.keys(options).map(key => ({
            path: options[key],
            propertyName: key,
        })));
    }

    return (files, goldsmith) => {
        for (const { path, propertyName } of rows) {
            const file = files[path];
            delete files[path];
            const parsedObject = JSON.parse(textDecoder.decode(file.data));
            if (propertyName) {
                goldsmith.metadata({ [propertyName]: parsedObject});
            } else {
                goldsmith.metadata(parsedObject);
            }
        }
    };
}

// Plugin for reading YAML front matter
interface GoldsmithFrontMatterOptions {
    pattern?: RegExp;
}

function goldsmithFrontMatter(options?: GoldsmithFrontMatterOptions): Plugin {
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
    .use(goldsmithMetadata({ site: "site.json" }))
    .use(goldsmithFrontMatter())
    .use(goldsmithLog)
    .build();
