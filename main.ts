import {
    Goldsmith,
    GoldsmithPlugin,
    goldsmithJSONMetadata,
    goldsmithFrontMatter,
    goldsmithExcludeDrafts,
    goldsmithFileMetadata,
    goldsmithIndex,
    goldsmithCollections,
    goldsmithInjectFiles,
    goldsmithMarkdown,
    goldsmithRootPaths,
    goldsmithLayout,
    goldsmithLayoutLiteralHTML,
    goldsmithWatch,
    goldsmithServe,
    goldsmithFeed,
    goldsmithLinkChecker,
    validatePostMetadata,
    validateSiteMetadata,
    version as md2blogVersion,
} from "./deps.ts";

import { processFlags } from "https://deno.land/x/flags_usage@1.0.1/mod.ts";
import { templates, generateCSS } from "./templates.ts";
// @deno-types="./deps/highlightjs-11.3.1.d.ts"
import highlightJS from "./deps/highlightjs-11.3.1.js";
import copyrightNotice from "./LICENSE.ts";

// Command line arguments
const { clean, drafts, input, output, serve, watch, version, copyright } = processFlags(Deno.args, {
    description: {
        clean: "Clean output directory before processing",
        drafts: "Include drafts in output",
        serve: "Serve web site, with automatic reloading",
        watch: "Watch for changes and rebuild automatically",
        input: "Input directory",
        output: "Output directory",
        copyright: "Display open source software copyright notices",
        version: "Display md2blog version information",
    },
    argument: {
        input: "dir",
        output: "dir",
    },
    string: [
        "input",
        "output",
    ],
    boolean: [
        "clean",
        "drafts",
        "serve",
        "watch",
        "copyright",
        "version",
    ],
    alias: {
        clean: "c",
        drafts: "d",
        input: "i",
        output: "o",
        serve: "s",
        watch: "w",
    },
    default: {
        input: "content",
        output: "out",
    },
});

if (copyright) {
    console.log(copyrightNotice);
    Deno.exit(0);
}

if (version) {
    console.log(md2blogVersion);
    Deno.exit(0);
}

// Path format for posts: posts/(:category/)postName.md
// Groups:                       |-- 2 --|
const postPathPattern = /^posts(\/([^/]+))?\/[^/]+.md$/;

function replaceLink(link: string) {
    return link.replace(/^([^/][^:]*)\.md(#[^#]+)?$/, "$1.html$2")
}

function capitalize(str: string): string {
    if (str.length > 0) {
        return str[0].toLocaleUpperCase() + str.substring(1);
    }
    return str;
}

const noop: GoldsmithPlugin = (_files, _goldsmith) => {};

await Goldsmith()
    .source(input)
    .destination(output)
    .clean(clean)
    .use(goldsmithJSONMetadata({ "site.json": "site" }))
    .use((_files, goldsmith) => {
        // Validate site.json
        try {
            validateSiteMetadata(goldsmith.metadata().site)
        } catch (error) {
            console.log("Error validating site.json:");
            throw error;
        }
    })
    .use(goldsmithFrontMatter())
    .use(drafts ? noop : goldsmithExcludeDrafts())
    .use(goldsmithFileMetadata({
        pattern: /\.html$/,
        metadata: { layout: false }, // Opt raw HTML files out of layouts so they're copied verbatim
    }))
    .use(goldsmithFileMetadata({
        pattern: postPathPattern,
        metadata: (file, matches) => {
            // Verify post metadata
            try {
                validatePostMetadata(file);
            } catch (error) {
                console.log(`Error validating ${matches[0]}:`);
                throw error;
            }
            return {};
        },
    }))
    .use(goldsmithFileMetadata({
        pattern: postPathPattern,
        metadata: (_file, matches) => ({ category: matches[2] ?? "misc" }),
    }))
    .use(goldsmithFileMetadata({
        pattern: postPathPattern,
        metadata: (file) => ({
            layout: "post",

            // Set "tags" to be [ category, ...keywords ] (with duplicates removed)
            tags: [...new Set([ file.category!, ...(file.keywords ?? []) ])],
        }),
    }))
    .use(goldsmithIndex({
        pattern: postPathPattern,
        property: "tags",
        createTermIndexPath: term => `posts/${term}/index.html`,
    }))
    .use(goldsmithFileMetadata({
        pattern: /^posts\/[^/]+?\/index.html$/,
        metadata: (file, _matches, metadata) => ({
            tag: file.term,
            layout: "tagIndex",
            isTagIndex: true,
            postsWithTag: metadata.indexes!.tags[file.term!].sort((a, b) => (b.date!.valueOf() - a.date!.valueOf())), // Note: Sorts the array in place!
        }),
    }))
    .use(goldsmithCollections({
        posts: {
            pattern: postPathPattern,
            sortBy: "date",
            reverse: true,
        },
        postsRecent: {
            pattern: postPathPattern,
            sortBy: "date",
            reverse: true,
            limit: 5,
        },
        nonPosts: {
            pattern: /^[^/]+\.(html|md)$/,
            sortBy: "title",
        },
    }))
    .use((_files, goldsmith) => {
        // Create index and archive tag lists
        const metadata = goldsmith.metadata();

        // Sort "all tags" list alphabetically
        metadata.tagsAll = Object.keys(metadata.indexes!.tags).sort((a, b) => (a < b ? -1 : 1));

        // Sort "top tags" list by most posts, and then most recent post if there's a tie
        metadata.tagsTop = Object.keys(metadata.indexes!.tags).sort((a, b) => {
            const postsA = metadata.indexes!.tags[a];
            const postsB = metadata.indexes!.tags[b];
            return (postsB.length - postsA.length) || (postsB[0].date!.getDate() - postsA[0].date!.getDate());
        }).slice(0, 4);
    })
    .use(goldsmithInjectFiles({
        "index.html": { layout: "index" },
        "posts/index.html": { layout: "archive" },
        "404.html": { layout: "404" },
    }))
    .use(goldsmithInjectFiles({
        "css/style.css": {
            data: (metadata) => generateCSS(metadata.site?.colors ?? {}),
        },
    }))
    .use(goldsmithMarkdown({
        replaceLinks: link => replaceLink(link),
        highlight: (code, language) => {
            if (language && highlightJS.getLanguage(language)) {
                return highlightJS.highlight(code, { language }).value;
            } else {
                return highlightJS.highlightAuto(code).value;
            }
        },
    }))
    .use(goldsmithRootPaths())
    .use(goldsmithFeed({ getCollection: (metadata) => metadata.collections!.postsRecent! }))
    .use((_files, goldsmith) => {
        // Set header defaults
        const metadata = goldsmith.metadata();
        const site = metadata.site!;
        const text = site.header?.text ?? site.description;
        let links = site.header?.links;
        if (!links) {
            links = {};
            for (const file of metadata.collections!.nonPosts) {
                const pathFromRoot = file.pathFromRoot!;
                if (pathFromRoot !== "index.html") {
                    const name = capitalize(
                        pathFromRoot
                            .replace(/\.[^.]*$/, "")
                            .replace("-", " ")
                    );
                    links[name] = pathFromRoot;
                }
            }
        }

        for (const [name, link] of Object.entries(links)) {
            links[name] = replaceLink(link);
        }

        site.header = {
            text,
            links,
        };
    })
    .use(goldsmithLayout({
        pattern: /\.html$/,
        layout: goldsmithLayoutLiteralHTML({
            templates,
            defaultTemplate: "default",
        })
    }))
    .use(goldsmithLinkChecker())
    .use((serve || watch) ? goldsmithWatch() : noop) // --serve implies --watch
    .use(serve ? goldsmithServe() : noop)
    .build();
