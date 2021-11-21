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
import { goldsmithFeed } from "./goldsmith_feed.ts";
import { goldsmithLinkChecker } from "./goldsmith_link_checker.ts";
import { templates } from "./templates.ts";

import HighlightJS from "https://jspm.dev/highlight.js@11.3.1";
import { hexToRGB, rgbToHSL, hslToRGB, rgbToHex } from "./colorsmith.ts";

// TODO: Include libraries instead of loading from CDNs...

// TODO: Types from JSPM don't work
// deno-lint-ignore no-explicit-any
const highlightJS: any = HighlightJS;

// Command line arguments
const { clean, drafts, input, output, serve, watch } = processFlags(Deno.args, {
    description: {
        clean: "Clean output directory before processing",
        drafts: "Include drafts in output",
        serve: "Serve web site, with automatic reloading",
        watch: "Watch for changes and rebuild automatically",
        input: "Input directory",
        output: "Output directory",
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

// TODO: These types are for md2blog, NOT this plugin
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
    .metadata({ metadataWorks: true }) // TODO: Move to test only
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
            data: (metadata) => {
                let css = `:root { color-scheme: dark; }
html, body { margin: 0; }

body {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: sans-serif;
    overflow-y: scroll;
}

body > header, main { width: 40em; }
body > header, main { padding: 0.5em; }

@media screen and (max-width: 40em) {
    body > header, main { width: calc(100% - 1em); }
}

body { line-height: 1.5; }
pre code { line-height: 1.3; }
h1, h2, h3, h4, h5 { line-height: 1.2; }
td { line-height: 1.2; }

body > header { text-align: center; }
body > header > h1 { margin-bottom: 0.25em; }
body > header > p { margin-top: 0.25em; }

nav { display: flex; flex-direction: row; justify-content: center; }
nav > ul { margin: 0; padding: 0 0 0 0.5em; display: inline; }
nav > ul > li { display: inline; }
nav > ul > li:first-child:before { content: "Topics: "; }
nav > ul > li + li:before { content: " | "; }

body > header > h1 > a {
    font-size: 1.75rem;
    text-decoration: inherit;
}

article > header > h1 { margin-bottom: 0.25em; }
article > header > p { margin-top: 0em; }
main footer { margin-top: 1em; }

main { overflow: auto; }
pre { overflow: auto; }
article img, article svg { display: block; }

code { font-size: 1rem; }
pre code { font-size: 0.8125rem; }

th, td { padding: 0.25em; }
pre { border: solid 1px; padding: 0em 0.25em; }
table, th, tr, td { border-collapse: collapse; border: solid 1px; }

main > ul { padding-left: 0em; }
main > ul > li { list-style: none; margin-bottom: 2em; }

ul { padding-left: 1.5em; }
li { margin-bottom: 0.5em; }

h1 { font-size: 1.6rem; font-weight: bold; }
h2 { font-size: 1.3rem; font-weight: bold; }
h3 { font-size: 1.2rem; font-weight: normal; }
h4 { font-size: 1rem; font-weight: bold; }
h5 { font-size: 1rem; font-weight: normal; }

:is(h1, h2, h3, h4, h5) :is(a:link, a:visited) { color: inherit; }

body { background-color: @background; }
* { color: @textDefault; }
main footer { border-top: 1px solid @backgroundLightest; }
th { background-color: @backgroundLightest; color: @textLight; }
pre, table, th, tr, td { border-color: @border; }
pre { background-color: @backgroundLighter; }
tr:nth-child(even) { background-color: @backgroundLight; }

code {
    background-color: @backgroundEvenLighter;
    border-radius: 0.2em;
    padding: 0em 0.1em;
}

pre code {
    background-color: revert;
    border-radius: revert;
    padding: revert;
}

body > header > h1 { color: @textTitle; }
nav > ul > li:first-child:before { font-weight: bold; color: @textHeading; }
h1, h2, h3, h4, h5 { color: @textHeading; }
a:link { color: @textLink; }
a:visited { color: @textLinkVisited; }
/* Also b5cea8 or 7dce52 or 7bbf56 */

/* Diagrams */
svg text { fill: @textLight; }
.diagram-transparent-white { stroke: none; fill: none; }
ellipse.diagram-black-none { stroke: @textDark; fill: @backgroundEvenLighter; }
.diagram-black-none { stroke: @textDark; fill:none; }
.diagram-black-black { stroke: @textDark; fill: @backgroundLighter; }

/* Syntax highlighting */
.hljs-comment { color: @textCommentDark; }

.hljs-tag,
.hljs-punctuation { color: @textDark; }

.hljs-literal { color: @textLinkVisited; }

.hljs-title.class_,
.hljs-tag .hljs-name,
.hljs-tag .hljs-attr { color: @textComment; }

.hljs-attr,
.hljs-symbol,
.hljs-variable,
.hljs-template-variable,
.hljs-link,
.hljs-selector-attr,
.hljs-selector-pseudo { color: @textLink; }

.hljs-keyword,
.hljs-attribute,
.hljs-selector-tag,
.hljs-meta .hljs-keyword,
.hljs-doctag,
.hljs-name { color: @textLinkVisited; }

.hljs-type,
.hljs-string,
.hljs-number,
.hljs-quote,
.hljs-template-tag,
.hljs-deletion,
.hljs-title,
.hljs-section,
.hljs-meta { color: @textHeading; }

.hljs-regexp,
.hljs-meta .hljs-string { color: @textHeadingDark; }

.hljs-title.function_,
.hljs-built_in,
.hljs-bullet,
.hljs-code,
.hljs-addition,
.hljs-selector-id,
.hljs-selector-class { color: @textTitle; }
`;
                
                // Base colors
                const textTitle = metadata?.site?.colors?.title ?? "#e6b95c";
                const textHeading = metadata?.site?.colors?.heading ?? "#d97c57";
                const textLink = metadata?.site?.colors?.link ?? "#59c5ff";
                const textComment = metadata?.site?.colors?.comment ?? "#7bbf56";
                const textDefault = "#c8c8c8";
                const background = "#181818";

                let colors: { [name: string]: string } = {
                    textTitle,
                    textHeading,
                    textLink,
                    textComment,
                    textDefault,
                    background,
                };

                // Derived colors
                const desaturateStep = -0.15;
                const darkenStep = -0.05;
                const lightenStep = 0.04;

                function adjust(hex: string, h?: number, s?: number, l?: number): string {
                    const hsl = rgbToHSL(hexToRGB(hex));
                    if (h) {
                        hsl.h = (hsl.h + h) % 360;
                    }
                    if (s) {
                        hsl.s = Math.min(1, Math.max(0, hsl.s + s));
                    }
                    if (l) {
                        hsl.l = Math.min(1, Math.max(0, hsl.l + l));
                    }
                    return rgbToHex(hslToRGB(hsl));
                }

                colors = {
                    ...colors,
                    textDark: adjust(textDefault, 0, 0, -0.15),
                    textLight: adjust(textDefault, 0, 0, lightenStep * 2),
                    textHeadingDark: adjust(textHeading, 0, desaturateStep, darkenStep),
                    textLinkVisited: adjust(textLink, 0, desaturateStep, darkenStep),
                    textCommentDark: adjust(textComment, 0, desaturateStep, darkenStep),
                    backgroundLight: adjust(background, 0, 0, lightenStep),
                    backgroundLighter: adjust(background, 0, 0, lightenStep * 2),
                    backgroundEvenLighter: adjust(background, 0, 0, lightenStep * 3),
                    backgroundLightest: adjust(background, 0, 0, lightenStep * 5),
                    border: adjust(background, 0, 0, lightenStep * 7),
                }

                // Find and replace
                for (const colorName of Object.keys(colors)) {
                    css = css.replaceAll(`@${colorName};`, `${colors[colorName]};`);
                }

                const textEncoder = new TextEncoder();
                return textEncoder.encode(css);
            }
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
