import type { GoldsmithFile } from "../goldsmith/mod.ts";
import type { GoldsmithLiteralHTMLLayoutContext, GoldsmithLiteralHTMLLayoutCallback, GoldsmithLiteralHTMLLayoutMap } from "../goldsmith/plugins/layout/literal_html.ts";
import { html } from "https://deno.land/x/literal_html@1.0.2/mod.ts";

const partialBase = (m: GoldsmithLiteralHTMLLayoutContext, mainVerbatim: string, navigationVerbatim?: string) => 
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
</head>
<body>
<header>
<h1><a href="${m.pathToRoot!}index.html">${m.site!.title!}</a></h1>
${{verbatim: m.site?.description ? html`<p>${m.site.description}</p>` : ""}}
${{verbatim: navigationVerbatim ? navigationVerbatim : ""}}
</header>
<main>
${{verbatim: mainVerbatim}}
</main>
</body>
</html>
`;

function partialNavigation(m: GoldsmithLiteralHTMLLayoutContext, tags: string[], incomplete?: boolean, isTagIndex?: boolean, tag?: string): string {
    return tags ? html`<nav>
<ul>
${{verbatim: tags.map(t => (isTagIndex && t === tag) ? html`<li>${tag}</li>` : html`<li><a href="${m.pathToRoot ?? ""}posts/${t}/index.html">${t}</a></li>`).join("\n")}}
${{verbatim: incomplete ? html`<li><a href="${m.pathToRoot!}posts/index.html">&hellip;</a></li>\n` : ""}}</ul>
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
<h1><a href="${m.pathToRoot!}${post.pathFromRoot as string}">${post.title!}</a></h1>
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
    partialNavigation(m, m.tagsAll!)
);

const templateDefault: GoldsmithLiteralHTMLLayoutCallback = (content, m) => partialBase(
    m,
    html`<article>
${{verbatim: content}}
</article>`,
    partialNavigation(m, m.tags!)
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
<p><a href="${m.pathToRoot!}index.html">Back to home</a></p>
</footer>
</article>`,
    partialNavigation(m, m.tags!)
);

const templateRoot: GoldsmithLiteralHTMLLayoutCallback = (_content, m) => partialBase(
    {
        isRoot: true,
        description: m.site?.description,
        ...m,
    },
    html`${{verbatim: partialArticleSummaryList(m, m.collections!.postsRecent!)}}
<footer>
<p><a href="posts/index.html">See all articles</a> or subscribe to the <a href="feed.xml">Atom feed</a></p>
</footer>`,
    partialNavigation(m, m.tagsTop!, m.tagsTop!.length !== m.tagsAll!.length)
);

const templateTagIndex: GoldsmithLiteralHTMLLayoutCallback = (_content, m) => partialBase(
    {
        title: "Archive of all posts since the beginning of time",
        ...m
    },
    partialArticleSummaryList(m, m.postsWithTag!),
    partialNavigation(m, m.tagsAll!, false, true, m.tag)
);

export const templates: GoldsmithLiteralHTMLLayoutMap = {
    "404": template404,
    "archive": templateArchive,
    "default": templateDefault,
    "index": templateRoot,
    "post": templatePost,
    "tagIndex": templateTagIndex,
};
