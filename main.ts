import { Goldsmith, Plugin, File, Metadata } from "./goldsmith.ts"
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

// Plugin to exclude drafts
function goldsmithExcludeDrafts(exclude?: boolean): Plugin {
    const excludeDrafts = exclude ?? true;
    return (files) => {
        if (excludeDrafts) {
            for (const key of Object.keys(files)) {
                const file = files[key];
                if (file.draft) {
                    delete files[key];
                }
            }
        }
    };
}

// Plugin for adding metadata based on regular expressions
type GoldsmithFileCreateMetadataCallback = (file: File, matches: RegExpMatchArray, metadata: Metadata) => Metadata;

function goldsmithFileMetadata(options: { pattern: RegExp, metadata: Metadata | GoldsmithFileCreateMetadataCallback }): Plugin {
    const { pattern, metadata } = options;
    return (files, goldsmith) => {
        for (const key of Object.keys(files)) {
            const matches = pattern.exec(key);
            if (matches) {
                const file = files[key];
                Object.assign(file, (typeof(metadata) === "function") ? metadata(file, matches, goldsmith.metadata()) : metadata);
            }
        }
    };
}

// Plugin for creating indexes on properties
interface GoldsmithIndexOptions {
    pattern: RegExp;
    property: string;
    createTermPagePath?: (term: string) => string;
    // indexPagePath?: string; // TODO
}

function goldsmithIndex(options: GoldsmithIndexOptions): Plugin {
    const { pattern, createTermPagePath } = options;
    const propertyName = options.property;
    return (files, goldsmith) => {
        const index: { [term: string]: File[] } = {};
        for (const key of Object.keys(files)) {
            if (pattern.test(key)) {
                const file = files[key];
                const termOrTerms = file[propertyName];
                const terms = Array.isArray(termOrTerms) ? termOrTerms : [termOrTerms];
                for (const term of terms) {
                    const list = index[term] ?? [];
                    index[term] = [...list, file];
                }
            }
        }

        const metadata = goldsmith.metadata();
        const { ...rest } = metadata.indexes ?? {};
        metadata.indexes = { [propertyName]: index, ...rest };

        if (createTermPagePath) {
            for (const term of Object.keys(index)) {
                files[createTermPagePath(term)] = {
                    term,
                    data: new Uint8Array(0),
                };
            }
        }
    };
}

// Plugin for creating collections of files
interface GoldsmithCollection {
    pattern: RegExp;
    sortBy: string;
    reverse?: boolean;
    limit?: number;
}

function goldsmithCollections(options: { [collectionName: string]: GoldsmithCollection}): Plugin {
    return (files, goldsmith) => {
        for (const collectionKey of Object.keys(options)) {
            const collection = options[collectionKey];

            const { pattern, sortBy } = collection;
            const reverse = collection.reverse ?? false;
            const limit = collection.limit;

            const list = [];
            for (const key of Object.keys(files)) {
                if (pattern.test(key)) {
                    list.push(files[key]);
                }
            }
    
            list.sort((a, b) => a[sortBy] - b[sortBy]);
            if (reverse) {
                list.reverse();
            }
            if (limit !== undefined) {
                list.splice(limit);
            }

            goldsmith.metadata({ [collectionKey]: list});
        }
    };
}

// Path format for posts: posts/(:category/)postName.md
// Groups:                       |-- 2 --|
const postPathPattern = /^posts(\/([^/]+))?\/[^/]+.md$/;

await Goldsmith()
    .metadata({ metadataWorks: true }) // TODO: Move to test only
    .source(input)
    .destination(output)
    .clean(true)
    .use(goldsmithMetadata({ site: "site.json" }))
    .use(goldsmithFrontMatter())
    .use(goldsmithExcludeDrafts())
    .use(goldsmithFileMetadata({
        pattern: postPathPattern,
        metadata: (_file, matches) => ({ category: matches[2] ?? "misc" }),
    }))
    .use(goldsmithFileMetadata({
        pattern: postPathPattern,
        metadata: (file) => ({
            layout: "post.hbs",

            // Set "tags" to be [ category, ...keywords ] (with duplicates removed)
            tags: [...new Set([ file.category, ...(file.keywords ?? []) ])],
        }),
    }))
    .use(goldsmithIndex({
        pattern: postPathPattern,
        property: "tags",
        createTermPagePath: term => `posts/${term}/index.html`,
    }))
    .use(goldsmithFileMetadata({
        pattern: /^posts\/[^/]+?\/index.html$/,
        metadata: (file, _matches, metadata) => ({
            title: file.term,
            tag: file.term,
            // layout: "tagIndex.hbs", // TODO
            // isTagIndex: true, // TODO: Needed?
            postsWithTag: metadata.indexes.tags[file.term].slice().sort((a: File, b: File) => (b.date - a.date)),
        }),
    }))
    .use(goldsmithCollections({
        posts: {
            pattern: postPathPattern,
            sortBy: "date",
            reverse: true,
        },
        posts_recent: {
            pattern: postPathPattern,
            sortBy: "date",
            reverse: true,
            limit: 5,
        },
    }))
    .use(goldsmithLog)
    .build();
