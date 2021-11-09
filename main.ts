import { Goldsmith, Plugin, File, Metadata } from "./goldsmith.ts";
import { parse as parseYAML } from "https://deno.land/std@0.113.0/encoding/_yaml/parse.ts";
import { marked } from "./node_modules/marked/lib/marked.esm.js"; // TODO: Is the module for Marked on any CDN?

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
    const frontMatterPattern = /^---\r?\n(.*?)\r?\n---\r?\n/ms;
    return (files) => {
        for (const key of Object.keys(files)) {
            if (pattern.test(key)) {
                const file = files[key];
                const text = textDecoder.decode(file.data);
                const matches = frontMatterPattern.exec(text);
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

// Plugin for injecting files
type GoldsmithInjectedFile = Metadata & {
    data?: string | Uint8Array | ((metadata: Metadata) => Uint8Array);
};

function goldsmithInjectFiles(options: { [path: string]: GoldsmithInjectedFile }): Plugin {
    const textEncoder = new TextEncoder();
    return (files, goldsmith) => {
        for (const key of Object.keys(options)) {
            const { data: stringOrDataOrCallback, ...rest } = options[key];
            let data: Uint8Array;
            switch (typeof(stringOrDataOrCallback)) {
                case "undefined":
                    data = new Uint8Array(0);
                    break;

                case "string":
                    data = textEncoder.encode(stringOrDataOrCallback);
                    break;
                
                case "function":
                    data = stringOrDataOrCallback(goldsmith.metadata());
                    break;

                default:
                    data = stringOrDataOrCallback;
                    break;
            }

            files[key] = { data, ...rest };
        }
    };
}

// Plugin for processing Markdown using Marked
interface goldsmithMarkedOptions {
    replaceLinks?: (link: string) => string;
    highlight?: (code: string, language: string) => string;
}

const markdownPattern = /(.+)\.md$/;
function goldsmithMarked(_options?: goldsmithMarkedOptions): Plugin {
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    return (files, _goldsmith) => {
        // TODO: Link replacing and highlighting
        for (const key of Object.keys(files)) {
            const matches = markdownPattern.exec(key);
            if (matches) {
                const file = files[key];
                const markdown = textDecoder.decode(file.data);
                const html = marked(markdown);
                file.data = textEncoder.encode(html);
                delete files[key];
                files[`${matches[1]}.html`] = file;
            }
        }
    };
}

// Plugin for computing root path
const goldsmithRootPath: Plugin = (files) => {
    for (const key of Object.keys(files)) {
        files[key].rootPath = "../".repeat(Array.from(key.matchAll(/[/]/g)).length);
    }
};

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
            // layout: "post.hbs", // TODO

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
    .use((_files, goldsmith) => {
        // Create index and archive tag lists
        const metadata = goldsmith.metadata();

        // Sort "all tags" list alphabetically
        metadata.tagsAll = Object.keys(metadata.indexes.tags).sort((a, b) => (a < b ? -1 : 1));

        // Sort "top tags" list by most posts, and then most recent post if there's a tie
        metadata.tagsTop = Object.keys(metadata.indexes.tags).sort((a, b) => {
            const postsA = metadata.indexes.tags[a];
            const postsB = metadata.indexes.tags[b];
            return (postsB.length - postsA.length) || (postsB[0].date - postsA[0].date);
        }).slice(0, 4);

        // Also include the current time
        metadata.now = new Date();

        // TODO: Consider using  absolute links for content in the Atom feed
    })
    // TODO: Syntax highlighting
    .use(goldsmithInjectFiles({
        "index.html": { /*layout: "index.hbs"*/ }, // TODO
        "posts/index.html": { /*layout: "archive.hbs"*/ },
        "404.html": { /*layout: "404.hbs"*/ },
        "feed.xml": { /*layout: "feed.hbs"*/ },
    }))
    .use(goldsmithInjectFiles({
        "css/style.css": {
            data: () => {
                // let source = (await promises.readFile(path.join(moduleStaticFromCWD, "css", "style.less"))).toString();

                // // Override default colors, if custom colors provided
                // const customColors = metadata?.site?.colors ?? {};
                // const colorRegExp = /^(#[0-9a-fA-F]{3,6})|([a-z]{3,30})$/;
                // for (const mapping of [
                //     { key: "title", variable: "textTitle" },
                //     { key: "heading", variable: "textHeading" },
                //     { key: "link", variable: "textLink" },
                //     { key: "comment", variable: "textComment" },
                // ]) {
                //     const value = customColors[mapping.key];
                //     if (value && colorRegExp.test(value)) {
                //         source = source.replace(new RegExp(`[@]${mapping.variable}:[^;]*;`), `@${mapping.variable}: ${value};`);
                //     }
                // }

                // const output = await less.render(source);
                // return output.css;
                // TODO
                return new Uint8Array(0);
            }
        },
    }))
    .use(goldsmithMarked())
    .use(goldsmithRootPath)
    .use(goldsmithLog)
    .build();
