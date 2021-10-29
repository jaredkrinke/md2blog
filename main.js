#!/usr/bin/env node

import handlebars from "handlebars";
import marked from "marked";
import Metalsmith from "metalsmith";
import metalsmithBrokenLinkChecker from "metalsmith-broken-link-checker";
import metalsmithCollections from "metalsmith-collections";
import metalsmithDiscoverPartials from "metalsmith-discover-partials";
import metalsmithDrafts from "metalsmith-drafts";
import metalsmithExpress from "metalsmith-express";
import metalsmithFileMetadata from "metalsmith-filemetadata";
import metalsmithLayouts from "metalsmith-layouts";
import metalsmithMetadata from "metalsmith-metadata";
import metalsmithRootPath from "metalsmith-rootpath";
import metalsmithStatic from "metalsmith-static";
import metalsmithTaxonomy from "metalsmith-taxonomy";
import metalsmithWatch from "metalsmith-watch";
import path from "path";
import url from "url";
import { createReplaceLinksOptions } from "./marked-replace-links.js";
import metalsmithGraphvizDiagrams from "./metalsmith-graphviz-diagrams.js";
import metalsmithInjectFiles from "./metalsmith-inject-files.js";
import metalsmithLinkify from "./metalsmith-linkify.js";
import metalsmithMarked from "./metalsmith-marked.js";
import metalsmithNormalizeSlashes from "./metalsmith-normalize-slashes.js";
import metalsmithReplaceLinks from "./metalsmith-replace-links.js";
import metalsmithRouteMetadata from "./metalsmith-route-metadata.js";
import metalsmithSyntaxHighlighting from "./metalsmith-syntax-highlighting.js";

// Command line arguments
const serve = process.argv.includes("--serve");
const drafts = process.argv.includes("--drafts");
const clean = !serve && process.argv.includes("--clean");

// Handlebars template custom helpers
const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
[
    [ "not", (a) => (!a) ],
    [ "and", (a, b) => (a && b) ],
    [ "equal", (a, b) => (a === b) ],
    [ "formatDateISO", date => date.toISOString() ],
    [ "formatDateShort", date => date.toISOString().replace(/T.*$/, "") ],
    [ "formatDate", date => dateFormatter.format(date) ],
    [ "encodeURIComponent", text => encodeURIComponent(text) ],
].forEach(row => handlebars.registerHelper(row[0], row[1]));

// Trivial plugin that does nothing (for toggling on/off plugins)
const noop = (files, metalsmith, done) => done();

// Translate .md links to .html (with anchor support)
const translateLink = link => link.replace(/^([^/][^:]*)\.md(#[^#]+)?$/, "$1.html$2");

// Find templates and CSS
const siteRoot = process.cwd();
const moduleRootRelative = path.relative(siteRoot, path.dirname(url.fileURLToPath(import.meta.url)));
const moduleStaticRelative = path.join(moduleRootRelative, "static");
const moduleTemplatesRelative = path.join(moduleRootRelative, "templates");

Metalsmith(siteRoot)
    .clean(clean)
    .source("./content")
    .destination("./out")
    .use(metalsmithMetadata({ site: "site.json" }))
    .use(metalsmithStatic({
        src: moduleStaticRelative,
        dest: ".",
    }))
    .use(metalsmithNormalizeSlashes()) // Only needed due to this metalsmith-taxonomy issue: https://github.com/webketje/metalsmith-taxonomy/issues/14
    .use((drafts || serve) ? noop : metalsmithDrafts()) // By default, exclude drafts when building, but include them when serving locally
    .use(metalsmithRouteMetadata({ "posts/(:category/):postName.md": { category: "misc" } }))
    .use(metalsmithFileMetadata([
        {
            pattern: "posts/**/*.md",

            metadata: (file) => ({
                layout: "post.hbs",

                // Set "tags" to be [ category, ...keywords ] (with duplicates removed)
                tags: [...new Set([ file.category, ...(file.keywords ?? []) ])],
            }),
        }
    ]))
    .use(metalsmithTaxonomy({
        pattern: "posts/**/*.md",
        taxonomies: ["tags"],
        pages: ["term"],
    }))
    .use(metalsmithFileMetadata([
        {
            pattern: "tags/*.html",
            metadata: (file, metadata) => ({
                title: file.term,
                tag: file.term,
                layout: "tagIndex.hbs",
                isTagIndex: true,
                postsWithTag: metadata.taxonomies.tags[file.term].slice().sort((a, b) => (b.date - a.date)),
            }),
        },
    ]))
    .use(metalsmithCollections({
        posts: {
            pattern: "posts/**/*.md",
            sortBy: "date",
            reverse: true,
        },
        posts_recent: {
            pattern: "posts/**/*.md",
            sortBy: "date",
            reverse: true,
            limit: 5,
        },
    }))
    .use((files, metalsmith, done) => {
        // Create index and archive tag lists
        const metadata = metalsmith.metadata();

        // Sort "all tags" list alphabetically
        metadata.tagsAll = Object.keys(metadata.taxonomies.tags).sort((a, b) => (a < b ? -1 : 1));

        // Sort "top tags" list by most posts, and then most recent post if there's a tie
        metadata.tagsTop = Object.keys(metadata.taxonomies.tags).sort((a, b) => {
            const postsA = metadata.taxonomies.tags[a];
            const postsB = metadata.taxonomies.tags[b];
            return (postsB.length - postsA.length) || (postsB[0].date - postsA[0].date);
        }).slice(0, 4);

        // Also include the current time
        metadata.now = new Date();

        // Move tag list pages to "posts/<topic>/index.html"
        Object.keys(files).forEach(key => {
            const file = files[key];
            if (file.type === "taxonomy:term") {
                const newKey = `posts/${file.term}/index.html`;
                files[newKey] = file;
                delete files[key];
            }
        });

        // Use absolute links for content in the Atom feed
        const siteUrl = metadata?.site?.url;
        const recentPosts = metadata.posts_recent;
        const textDecoder = new TextDecoder();
        const relativeLinkRegExp = /^([^/][^:]*)$/;
        recentPosts.forEach(file => {
            marked.setOptions(marked.getDefaults());
            marked.use(createReplaceLinksOptions(href => {
                // Special handling for relative links
                if (relativeLinkRegExp.exec(href)) {
                    // Relative link; convert to absolute (if possible)
                    return `${siteUrl ?? ""}${path.dirname(file.path)}/${translateLink(href)}`;
                } else {
                    // Not a relative link; return unmodified link
                    return href;
                }
            }));
    
            file.htmlWithAbsoluteLinks = marked(textDecoder.decode(file.contents));
        });
        
        done();
    })
    .use(metalsmithReplaceLinks(translateLink))
    .use(metalsmithSyntaxHighlighting({
        aliases: [
            { tag: "dot", language: "c" },
        ],
    }))
    .use(metalsmithGraphvizDiagrams({
        cssClasses: true,
        useDefaultFonts: true,
    }))
    .use(metalsmithInjectFiles({
        "index.html": { layout: "index.hbs" },
        "posts/index.html": { layout: "archive.hbs" },
        "404.html": { layout: "404.hbs" },
        "feed.xml": { layout: "feed.hbs" },
    }))
    .use(metalsmithMarked())
    .use(metalsmithNormalizeSlashes({ usePlatformSeparators: true })) // Platform separators are needed to compute rootPath
    .use(metalsmithRootPath())
    .use(metalsmithDiscoverPartials({ directory: moduleTemplatesRelative }))
    .use(metalsmithLinkify())
    .use(metalsmithLayouts({
        directory: moduleTemplatesRelative,
        default: "default.hbs",
        pattern: ["**/*.html", "feed.xml"],
    }))
    .use(serve ? metalsmithExpress({ host: "localhost" }) : noop)
    .use(serve
        ? metalsmithWatch({
            paths: {
                // Just rebuild everything (technically only the modified post and all index pages *need* to be rebuilt)
                "${source}/**/*": "**/*",
                [path.join(moduleStaticRelative, "**/*")]: "**/*",
                [path.join(moduleTemplatesRelative, "**/*")]: "**/*",
            },
            livereload: true,
        })
        : noop)
    .use(metalsmithBrokenLinkChecker({ checkAnchors: true }))
    .build(err => { if (err) throw err; });
