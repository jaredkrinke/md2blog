import type {
    GoldsmithFile,
    GoldsmithLiteralHTMLLayoutContext,
    GoldsmithLiteralHTMLLayoutCallback,
    GoldsmithLiteralHTMLLayoutMap,
} from "./deps.ts";

import { html } from "https://deno.land/x/literal_html@1.1.0/mod.ts";
import { hexToRGB, rgbToHSL, hslToRGB, rgbToHex } from "./colorsmith.ts";

// CSS template
export interface GenerateCSSOptions {
    title?: string;
    heading?: string;
    link?: string;
    comment?: string;
}

const cssTemplate = `:root { color-scheme: dark; }
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
nav > ul { display: inline; padding: 0; }
nav > ul > li { display: inline; }
nav > ul > li + li:before { content: " | "; }
header > nav > ul { margin: 0; }
header > nav > ul > li:first-child:before { content: "Topics: "; }
footer > nav > ul { margin-bottom: 0; }

body > header > h1 > a {
    font-size: 1.75rem;
    text-decoration: inherit;
}

article > header > h1 { margin-bottom: 0.25em; }
article > header > p { margin-top: 0em; }

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
body > main { border-bottom: 1px solid @backgroundLightest; }
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

export function generateCSS(options: GenerateCSSOptions): string {
    let css = cssTemplate;
    
    // Base colors
    const textTitle = options.title ?? "#e6b95c";
    const textHeading = options.heading ?? "#d97c57";
    const textLink = options.link ?? "#59c5ff";
    const textComment = options.comment ?? "#7bbf56";
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

    // Validate format of each color
    for (const value of Object.values(colors)) {
        hexToRGB(value);
    }

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

    return css;
}

// HTML templates
interface PartialBaseOptions {
    navigationVerbatim?: string;
    headVerbatim?: string;
}

const partialBase = (m: GoldsmithLiteralHTMLLayoutContext, mainVerbatim: string, o?: PartialBaseOptions) => 
html`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${m.site!.title!}${m.title ? `: ${m.title}` : ""}</title>
${{verbatim: m.description ? html`<meta name="description" content="${m.description}" />` : ""}}
${{verbatim: m.keywords ? html`<meta name="keywords" content="${m.keywords.join(",")}" />` : ""}}
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
<link rel="stylesheet" href="${m.pathToRoot!}css/style.css" />
${{verbatim: m.isRoot ? html`<link rel="alternate" type="application/rss+xml" href="${m.pathToRoot!}feed.xml" />` : ""}}
${{verbatim: o?.headVerbatim ?? ""}}
</head>
<body>
<header>
<h1><a href="${m.pathToRoot!}index.html">${m.site!.title!}</a></h1>
${{verbatim: m.site?.description ? html`<p>${m.site.description}</p>` : ""}}
${{verbatim: o?.navigationVerbatim ?? ""}}
</header>
<main>
${{verbatim: mainVerbatim}}
</main>
${{verbatim: m.site?.footer ? html`<footer>
${{verbatim: m.site.footer.text ? html`<p>${m.site.footer.text}</p>` : ""}}
</footer>` : ""}}
</body>
</html>
`;

interface PartialNavigationOptions {
    incomplete?: boolean;
    isTagIndex?: boolean;
    tag?: string;
}

function partialNavigation(m: GoldsmithLiteralHTMLLayoutContext, tags: string[], o?: PartialNavigationOptions): string {
    return tags ? html`<nav>
<ul>
${{verbatim: tags.map(t => (o?.isTagIndex && t === o.tag) ? html`<li>${o.tag}</li>` : html`<li><a href="${m.pathToRoot ?? ""}posts/${t}/index.html">${t}</a></li>`).join("\n")}}
${{verbatim: o?.incomplete ? html`<li><a href="${m.pathToRoot!}posts/index.html">&hellip;</a></li>\n` : ""}}</ul>
</nav>` : "";
}

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const formatDateShort = (date: Date) => date.toISOString().replace(/T.*$/, "");
const formatDate = (date: Date) => dateFormatter.format(date);
function partialDate(date: Date): string {
    return html`<p><time datetime="${formatDateShort(date)}">${formatDate(date)}</time></p>`;
}

const partialArticleSummary: (m: GoldsmithLiteralHTMLLayoutContext, post: GoldsmithFile) => string = (m, post) => {
    return html`<article>
<header>
<h1><a href="${m.pathToRoot!}${post.pathFromRoot!}">${post.title!}</a></h1>
${{verbatim: partialDate(post.date!)}}
</header>
${{verbatim: post.description ? html`<p>${post.description}</p>` : ""}}
</article>
`;
};

function partialArticleSummaryList(m: GoldsmithLiteralHTMLLayoutContext, posts: GoldsmithFile[]): string {
    return html`<ul>
${{verbatim: posts.map((post: GoldsmithFile) => html`<li>${{verbatim: partialArticleSummary(m, post)}}</li>`).join("\n")}}
</ul>`;
}

const template404: GoldsmithLiteralHTMLLayoutCallback = (_content, m) => partialBase(m,
`<h1>Not found</h1>
<p>The requested page does not exist.</p>
<p><a href="index.html">Click here</a> to go to the home page.</p>
`);

const templateArchive: GoldsmithLiteralHTMLLayoutCallback = (_content, m) => partialBase(
    {
        title: "Archive of all posts since the beginning of time",
        ...m
    },
    partialArticleSummaryList(m, m.collections!.posts!),
    { navigationVerbatim: partialNavigation(m, m.tagsAll!) }
);

const templateDefault: GoldsmithLiteralHTMLLayoutCallback = (content, m) => partialBase(
    m,
    html`<article>
${{verbatim: content}}
</article>`,
    { navigationVerbatim: partialNavigation(m, m.tags!) }
);

const templatePost: GoldsmithLiteralHTMLLayoutCallback = (content, m) => partialBase(
    m,
    html`<article>
<header>
<h1><a href="${m.pathToRoot!}${m.pathFromRoot!}">${m.title!}</a></h1>
${{verbatim: partialDate(m.date!)}}
</header>
${{verbatim: content}}
<footer>
<p>&crarr; <a href="${m.pathToRoot!}index.html">Back to home</a></p>
</footer>
</article>`,
    {
        navigationVerbatim: partialNavigation(m, m.tags!),
        headVerbatim: html`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "${{scriptString: m.title!}}",
${{verbatim: m.description ? html`  "abstract": "${{scriptString: m.description}}",` : ""}}
${{verbatim: m.tags ? html`  "keywords": "${{scriptString: m.tags.join(",")}}",` : ""}}
  "datePublished": "${{scriptString: formatDateShort(m.date!)}}"
}
</script>`
    }
);

const templateRoot: GoldsmithLiteralHTMLLayoutCallback = (_content, m) => partialBase(
    {
        isRoot: true,
        description: m.site?.description,
        ...m,
    },
    html`${{verbatim: partialArticleSummaryList(m, m.collections!.postsRecent!)}}
<footer>
<p>&rarr; <a href="posts/index.html">See all articles</a> or subscribe to the <a href="feed.xml">Atom feed</a></p>
</footer>`,
    {
        navigationVerbatim: partialNavigation(m, m.tagsTop!, {
            incomplete: m.tagsTop!.length !== m.tagsAll!.length,
        }),
    }
);

const templateTagIndex: GoldsmithLiteralHTMLLayoutCallback = (_content, m) => partialBase(
    {
        title: "Archive of all posts since the beginning of time",
        ...m
    },
    partialArticleSummaryList(m, m.postsWithTag!),
    {
        navigationVerbatim: partialNavigation(m, m.tagsAll!, {
            isTagIndex: true,
            tag: m.tag,
        }),
    }
);

export const templates: GoldsmithLiteralHTMLLayoutMap = {
    "404": template404,
    "archive": templateArchive,
    "default": templateDefault,
    "index": templateRoot,
    "post": templatePost,
    "tagIndex": templateTagIndex,
};
