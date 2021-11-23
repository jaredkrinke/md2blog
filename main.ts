import { processFlags } from "https://deno.land/x/flags_usage@1.0.1/mod.ts";
import { Goldsmith, GoldsmithPlugin } from "../goldsmith/mod.ts";
import { goldsmithJSONMetadata } from "../goldsmith/plugins/json_metadata/mod.ts";
import { goldsmithFrontMatter } from "../goldsmith/plugins/front_matter/mod.ts";
import { goldsmithExcludeDrafts } from "../goldsmith/plugins/exclude_drafts/mod.ts";
import { goldsmithFileMetadata } from "../goldsmith/plugins/file_metadata/mod.ts";
import { goldsmithIndex } from "../goldsmith/plugins/index/mod.ts";
import { goldsmithCollections } from "../goldsmith/plugins/collections/mod.ts";
import { goldsmithInjectFiles } from "../goldsmith/plugins/inject_files/mod.ts";
import { goldsmithMarkdown } from "../goldsmith/plugins/markdown/mod.ts";
import { goldsmithRootPaths } from "../goldsmith/plugins/root_paths/mod.ts";
import { goldsmithLayout } from "../goldsmith/plugins/layout/mod.ts";
import { goldsmithLayoutLiteralHTML } from "../goldsmith/plugins/layout/literal_html.ts";
import { goldsmithWatch } from "../goldsmith/plugins/watch/mod.ts";
import { goldsmithServe } from "../goldsmith/plugins/serve/mod.ts";
import { goldsmithFeed } from "../goldsmith/plugins/feed/mod.ts";
import { goldsmithLinkChecker } from "../goldsmith/plugins/link_checker/mod.ts";
import { templates, generateCSS } from "./templates.ts";
// @deno-types="./deps/highlightjs-11.3.1.d.ts"
import highlightJS from "./deps/highlightjs-11.3.1.js";
import copyrightNotice from "./LICENSE.ts";

// Command line arguments
const { clean, drafts, input, output, serve, watch, copyright } = processFlags(Deno.args, {
    description: {
        clean: "Clean output directory before processing",
        drafts: "Include drafts in output",
        serve: "Serve web site, with automatic reloading",
        watch: "Watch for changes and rebuild automatically",
        input: "Input directory",
        output: "Output directory",
        copyright: "Display open source software copyright notices"
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

declare module "../goldsmith/mod.ts" {
    interface GoldsmithMetadata {
        site?: {
            title: string;
            description?: string;
            url?: string;
            colors?: {
                title?: string;
                heading?: string;
                link?: string;
                comment?: string;
            };
        };

        tagsAll?: string[];
        tagsTop?: string[];
    }

    interface GoldsmithFile {
        title?: string;
        description?: string;
        date?: Date;
        draft?: boolean;
        keywords?: string[];

        category?: string;
        tags?: string[];

        // Tag index properties
        tag?: string;
        isTagIndex?: boolean;
        postsWithTag?: GoldsmithFile[];
    }
}

// Path format for posts: posts/(:category/)postName.md
// Groups:                       |-- 2 --|
const postPathPattern = /^posts(\/([^/]+))?\/[^/]+.md$/;

const noop: GoldsmithPlugin = (_files, _goldsmith) => {};

await Goldsmith()
    .source(input)
    .destination(output)
    .clean(clean)
    .use(goldsmithJSONMetadata({ "site.json": "site" }))
    .use(goldsmithFrontMatter())
    .use(drafts ? noop : goldsmithExcludeDrafts())
    .use(goldsmithFileMetadata({
        pattern: /\.html$/,
        metadata: { layout: false }, // Opt raw HTML files out of layouts so they're copied verbatim
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
            title: file.term,
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
            data: (metadata) => generateCSS(metadata.site!.colors ?? {}),
        },
    }))
    .use(goldsmithMarkdown({
        replaceLinks: link => link.replace(/^([^/][^:]*)\.md(#[^#]+)?$/, "$1.html$2"),
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
