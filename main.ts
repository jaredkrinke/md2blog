import { Goldsmith, Plugin, File, Metadata } from "./goldsmith.ts";
import { parse as parseYAML } from "https://deno.land/std@0.113.0/encoding/_yaml/parse.ts";
import HighlightJS from "https://jspm.dev/highlight.js@11.3.1";
import { marked, Renderer } from "https://jspm.dev/marked@4.0.0";
import { html, xml } from "../lites-templar/mod.ts";
import { cheerio, Root, Cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";
import { hexToRGB, rgbToHSL, hslToRGB, rgbToHex } from "./colorsmith.ts";

// TODO: Types from JSPM don't work
// deno-lint-ignore no-explicit-any
const highlightJS: any = HighlightJS;

// TODO: Command line interface
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
function goldsmithMarked(options?: goldsmithMarkedOptions): Plugin {
    const replaceLinks = options?.replaceLinks;
    const highlight = options?.highlight;
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    return (files, _goldsmith) => {
        marked.setOptions(marked.getDefaults());
        if (replaceLinks) {
            const renderer = new Renderer();
            const base = renderer.link;
            renderer.link = function (href: string, title: string, text: string) {
                return base.call(this, replaceLinks(href), title, text);
            };
            marked.use({ renderer });
        }

        if (highlight) {
            marked.use({ highlight });
        }

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

// Plugin for computing root paths
const goldsmithRootPaths: Plugin = (files) => {
    for (const key of Object.keys(files)) {
        const file = files[key];
        file.pathToRoot = "../".repeat(Array.from(key.matchAll(/[/]/g)).length);
        file.pathFromRoot = key;
    }
};

// Plugin for layouts
// TODO: Support other layout engines
type GoldsmithLayoutCallback = (file: File, metadata: Metadata) => Uint8Array;

interface GoldsmithLayoutOptions {
    pattern: RegExp;
    layout: GoldsmithLayoutCallback;
}

function goldsmithLayout(options: GoldsmithLayoutOptions): Plugin {
    const { pattern, layout } = options;
    return (files, goldsmith) => {
        const metadata = goldsmith.metadata(); 
        for (const key of Object.keys(files)) {
            if (pattern.test(key)) {
                const file = files[key];
                file.data = layout(file, metadata);
            }
        }
    };
}

// Lites Templar template handler
type GoldsmithLitesTemplarLayoutCallback = (content: string, metadata: Metadata) => string;
type GoldsmithLitesTemplarLayoutMap = {
    [name: string]: GoldsmithLitesTemplarLayoutCallback;
};

interface GoldsmithLitesTemplarOptions {
    templates: GoldsmithLitesTemplarLayoutMap;
    defaultTemplate?: string;
}

function goldsmithLayoutLitesTemplar(options: GoldsmithLitesTemplarOptions): GoldsmithLayoutCallback {
    const { templates, defaultTemplate } = options;
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();
    return (file, metadata) => {
        const layout = templates[file.layout ?? defaultTemplate];
        if (!layout) {
            throw `Unknown layout: ${layout} (available layouts: ${Object.keys(templates).join(", ")})`;
        }

        const source = textDecoder.decode(file.data);
        const context = { ...metadata, ...file };
        const result = layout(source, context);
        return textEncoder.encode(result);
    };
}

// Plugin that checks for broken links
interface BrokenLink {
    filePath: string;
    href: string;
}

// TODO: Tests for these, and maybe publish in its own module
function pathUp(path: string): string {
    const lastIndexOfSlash = path.lastIndexOf("/");
    if (lastIndexOfSlash < 0) {
        throw "Tried to go up one level from a root path!";
    }

    return path.substr(0, lastIndexOfSlash)
}

function pathRelativeResolve(from: string, to: string): string {
    let currentPath = pathUp("/" + from);
    for (const part of to.split("/")) {
        switch (part) {
            case ".":
                break;
            
            case "..":
                currentPath = pathUp(currentPath);
                break;
            
            default:
                currentPath = currentPath + "/" + part;
                break;
        }
    }
    return currentPath.slice(1);
}

// TODO: Make other plugins functions for future extensibility without breaking change
const relativeLinkPattern = /^[^/][^:]*$/;
function goldsmithBrokenLinkChecker(): Plugin {
    const pattern = /^.+\.html$/; // TODO: Make customizable?
    const textDecoder = new TextDecoder();
    return (files, _goldsmith) => {
        // Accumulate a list of broken links
        const brokenLinks: BrokenLink[] = [];

        // Cache documents, in case anchors need to be checked
        const documentCache: { [path: string]: Root & Cheerio} = {};
        const getOrLoadDocument: (path: string) => Root & Cheerio = (path) => (documentCache[path] ?? (documentCache[path] = cheerio.load(textDecoder.decode(files[path].data))));

        for (const sourcePath of Object.keys(files)) {
            if (pattern.test(sourcePath)) {
                const sourceDocument = getOrLoadDocument(sourcePath);
                sourceDocument("a[href], img[src], link[href]").each((_index, element) => {
                    // TODO: Type definitions aren't correct... this definitely works...
                    // deno-lint-ignore no-explicit-any
                    const href = (element as any).attribs["href"] ?? (element as any).attribs["src"];
                    if (relativeLinkPattern.test(href)) {
                        const targetParts = href.split("#");
                        if (targetParts.length > 2) {
                            throw `Invalid link: "${href}"`;
                        }

                        const targetPath = targetParts[0];
                        const targetAnchor = targetParts[1];

                        // Check that link target exists, if provided
                        let broken = false;
                        let targetPathFromRoot;
                        if (targetPath) {
                            targetPathFromRoot = pathRelativeResolve(sourcePath, targetPath);
                            if (!files[targetPathFromRoot]) {
                                broken = true;
                            }
                        }

                        // Check that anchor exists, if provided
                        if (!broken && targetAnchor) {
                            const targetDocument = targetPathFromRoot
                                ? getOrLoadDocument(targetPathFromRoot)
                                : sourceDocument;

                            // TODO: Validate anchor format first
                            if (targetDocument(`#${targetAnchor}`).length <= 0) {
                                broken = true;
                            }
                        }

                        if (broken) {
                            brokenLinks.push({ filePath: sourcePath, href });
                        }
                    }
                });
            }
        }

        if (brokenLinks.length > 0) {
            throw `The site has broken relative links:\n\n${brokenLinks.map(bl => `From "${bl.filePath}" to "${bl.href}"`).join("\n")}`;
        }
    };
}

// Path format for posts: posts/(:category/)postName.md
// Groups:                       |-- 2 --|
const postPathPattern = /^posts(\/([^/]+))?\/[^/]+.md$/;

// TODO: Move
const partialBase = (m: Metadata, mainVerbatim: string, navigationVerbatim?: string) => 
html`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${m.site.title}${m.title ? `: ${m.title}` : ""}</title>
${{verbatim: m.description ? html`<meta name="description" content="${m.description}" />` : ""}}
${{verbatim: m.keywords ? html`<meta name="keywords" content="${m.keywords.join(",")}" />` : ""}}
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
<link rel="stylesheet" href="${m.pathToRoot}css/style.css" />
${{verbatim: m.isRoot ? html`<link rel="alternate" type="application/rss+xml" href="${m.pathToRoot}feed.xml" />` : ""}}
</head>
<body>
<header>
<h1><a href="${m.pathToRoot}index.html">${m.site.title}</a></h1>
${{verbatim: m.site.description ? html`<p>${m.site.description}</p>` : ""}}
${{verbatim: navigationVerbatim ? navigationVerbatim : ""}}
</header>
<main>
${{verbatim: mainVerbatim}}
</main>
</body>
</html>
`;

function partialNavigation(m: Metadata, tags: string[], incomplete?: boolean, isTagIndex?: boolean, tag?: string): string {
    return tags ? html`<nav>
<ul>
${{verbatim: tags.map(t => (isTagIndex && t === tag) ? html`<li>${tag}</li>` : html`<li><a href="${m.pathToRoot}posts/${t}/index.html">${t}</a></li>`).join("\n")}}
${{verbatim: incomplete ? html`<li><a href="${m.pathToRoot}posts/index.html">&hellip;</a></li>\n` : ""}}</ul>
</nav>` : "";
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const formatDateShort = (date: Date) => date.toISOString().replace(/T.*$/, "");
const formatDate = (date: Date) => dateFormatter.format(date);
function partialDate(date: Date): string {
    return html`<p><time datetime="${formatDateShort(date)}">${formatDate(date)}</time></p>`;
}

const partialArticleSummary: (m: Metadata, post: Metadata) => string = (m, post) => {
    return html`<article>
<header>
<h1><a href="${m.pathToRoot}${post.pathFromRoot}">${post.title}</a></h1>
${{verbatim: partialDate(post.date)}}
</header>
${{verbatim: post.description ? html`<p>${post.description}</p>` : ""}}
</article>
`;
};

function partialArticleSummaryList(m: Metadata, posts: Metadata[]): string {
    return html`<ul>
${{verbatim: posts.map((post: Metadata) => html`<li>${{verbatim: partialArticleSummary(m, post)}}</li>`).join("\n")}}
</ul>`;
}

const template404: GoldsmithLitesTemplarLayoutCallback = (_content, m) => partialBase(m,
`<h1>Not found</h1>
<p>The requested page does not exist.</p>
<p><a href="index.html">Click here</a> to go to the home page.</p>
`);

const templateArchive: GoldsmithLitesTemplarLayoutCallback = (_content, m) => partialBase(
    {
        title: "Archive of all posts since the beginning of time",
        ...m
    },
    partialArticleSummaryList(m, m.posts),
    partialNavigation(m, m.tagsAll)
);

const templateDefault: GoldsmithLitesTemplarLayoutCallback = (content, m) => partialBase(
    m,
    html`<article>
${{verbatim: content}}
</article>`,
    partialNavigation(m, m.tags)
);

const templatePost: GoldsmithLitesTemplarLayoutCallback = (content, m) => partialBase(
    m,
    html`<article>
<header>
<h1><a href="${m.pathToRoot}${m.pathFromRoot}">${m.title}</a></h1>
${{verbatim: partialDate(m.date)}}
</header>
${{verbatim: content}}
<footer>
<p><a href="${m.pathToRoot}index.html">Back to home</a></p>
</footer>
</article>`,
    partialNavigation(m, m.tags)
);

const templateRoot: GoldsmithLitesTemplarLayoutCallback = (_content, m) => partialBase(
    {
        isRoot: true,
        description: m.site.description,
        ...m,
    },
    html`${{verbatim: partialArticleSummaryList(m, m.posts_recent)}}
<footer>
<p><a href="posts/index.html">See all articles</a> or subscribe to the <a href="feed.xml">Atom feed</a></p>
</footer>`,
    partialNavigation(m, m.tagsTop, m.tagsTop.length !== m.tagsAll.length)
);

const templateTagIndex: GoldsmithLitesTemplarLayoutCallback = (_content, m) => partialBase(
    {
        title: "Archive of all posts since the beginning of time",
        ...m
    },
    partialArticleSummaryList(m, m.postsWithTag),
    partialNavigation(m, m.tagsAll, false, true, m.tag)
);

// TODO: Test with a URL with ampersand, etc.
const textDecoder = new TextDecoder();
const templateFeed: GoldsmithLitesTemplarLayoutCallback = (_content, m) => xml`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${m.site.title}</title>
<id>${{verbatim: m.site.url ? xml`${m.site.url}` : xml`urn:md2blog:${{param: m.site.title}}`}}</id>
${{verbatim: m.site.url ? xml`<link rel="self" href="${m.site.url}feed.xml"/>
<link rel="alternate" href="${m.site.url}"/>` : ""}}
<author>
<name>${m.site.title}</name>
</author>
<updated>${m.now.toISOString()}</updated>

${{verbatim: m.posts_recent.map((post: Metadata) => xml`<entry>
<title>${post.title}}</title>
<id>${{verbatim: m.site.url ? xml`${m.site.url}${post.pathFromRoot}` : xml`urn:md2blog:${{param: m.site.title}}:${{param: post.title}}`}}</id>
<link rel="alternate" href="${m.site.url ? m.site.url : ""}${post.pathFromRoot}"/>
<updated>${post.date.toISOString()}</updated>
${{verbatim: post.description ? xml`<summary type="text">${post.description}</summary>` : ""}}
<content type="html">${textDecoder.decode(post.data)}</content>
</entry>`).join("\n")}}
</feed>
`;

const templates: GoldsmithLitesTemplarLayoutMap = {
    "404": template404,
    "archive": templateArchive,
    "default": templateDefault,
    "feed": templateFeed,
    "index": templateRoot,
    "post": templatePost,
    "tagIndex": templateTagIndex,
};

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
            layout: "post",

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
            layout: "tagIndex",
            isTagIndex: true,
            postsWithTag: metadata.indexes.tags[file.term].sort((a: File, b: File) => (b.date - a.date)), // Note: Sorts the array in place!
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
    .use(goldsmithInjectFiles({
        "index.html": { layout: "index" },
        "posts/index.html": { layout: "archive" },
        "404.html": { layout: "404" },
        "feed.xml": { layout: "feed" },
    }))
    .use(goldsmithInjectFiles({
        "css/style.css": {
            data: (metadata: Metadata) => {
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
    .use(goldsmithMarked({
        replaceLinks: link => link.replace(/^([^/][^:]*)\.md(#[^#]+)?$/, "$1.html$2"),
        highlight: (code, language) => {
            if (language && highlightJS.getLanguage(language)) {
                return highlightJS.highlight(code, { language }).value;
            } else {
                return highlightJS.highlightAuto(code).value;
            }
        },
    }))
    .use(goldsmithRootPaths)
    .use(goldsmithLayout({
        pattern: /.+\.html$|^feed.xml$/,
        layout: goldsmithLayoutLitesTemplar({
            templates,
            defaultTemplate: "default",
        })
    }))
    .use(goldsmithBrokenLinkChecker())
    // TODO: Local web server with automatic reloading
    .build();
