import type { GoldsmithPlugin, GoldsmithFile, GoldsmithMetadata } from "../goldsmith/mod.ts";
import { xml } from "https://deno.land/x/literal_html@1.0.2/mod.ts";
import { cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";

// TODO: Consolidate these helpers somewhere
function pathToRoot(path: string): string {
    return "../".repeat(Array.from(path.matchAll(/[/]/g)).length);
}

function pathUp(path: string): string {
    const lastIndexOfSlash = path.lastIndexOf("/");
    if (lastIndexOfSlash < 0) {
        throw "Tried to go up one level from a root path!";
    }

    return path.substr(0, lastIndexOfSlash)
}

interface GoldsmithFeedEntry {
    pathFromRoot: string;
    title: string;
    date: Date;
    description?: string;
    html: string;
}

export interface GoldsmithFeedOptions {
    path?: string;
    getCollection: (metadata: GoldsmithMetadata) => GoldsmithFile[];
}

export function goldsmithFeed(options: GoldsmithFeedOptions): GoldsmithPlugin {
    const feedPath = options.path ?? "feed.xml";
    const textDecoder = new TextDecoder();
    const textEncoder = new TextEncoder();
    const relativeLinkPattern = /^[^/][^:]*$/;
    return (files, goldsmith) => {
        const collection = options.getCollection(goldsmith.metadata());
        const list: GoldsmithFeedEntry[] = [];
        const m = goldsmith.metadata();
        const siteURL = m.site?.url;
        const feedPathToRoot = pathToRoot(feedPath);
        const prefix = (siteURL ? (siteURL.endsWith("/") ? siteURL : (siteURL + "/")) :feedPathToRoot);
        for (const file of collection) {
            // Find path (TODO: make this not O(n^2)?)
            // TODO: This is very fragile and should not rely on object identity
            let pathFromRoot: string | undefined;
            for (const key of Object.keys(files)) {
                if (files[key] === file) {
                    pathFromRoot = key;
                    break;
                }
            }

            if (!pathFromRoot) {
                const { data: _, ...rest } = file;
                throw `Could not determine path for file: ${JSON.stringify({ ...rest })}`;
            }

            // Update relative links
            const document = cheerio.load(textDecoder.decode(file.data));
            for (const row of [
                { element: "a", attribute: "href" },
                { element: "link", attribute: "href" },
                { element: "img", attribute: "src" },
            ]) {
                // TODO: Path helper for getting directory path? Can I use the standard library one?
                const documentLinkPrefix = `${prefix}${pathUp(`/${pathFromRoot}`).substr(1)}/`;

                // TODO: Types aren't right!
                // deno-lint-ignore no-explicit-any
                (document(`${row.element}[${row.attribute}]`) as any)
                    .attr(row.attribute, (_: number, href: string) => relativeLinkPattern.test(href) ? (documentLinkPrefix + href) : href);
            }

            // TODO: Types aren't right!
            // deno-lint-ignore no-explicit-any
            const html = (document("body") as any).html();
            const { title, date, description } = file;
            list.push({
                pathFromRoot,
                title: title ?? "",
                date: date ?? new Date(),
                description,
                html,
            });
        }

        // Build the feed
        // TODO: Test with a URL with ampersand, etc.
        const feedXML = xml`<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${m.site?.title ?? ""}</title>
<id>${{verbatim: m.site?.url ? xml`${m.site.url}` : xml`urn:md2blog:${{param: m.site?.title ?? ""}}`}}</id>
${{verbatim: m.site?.url ? xml`<link rel="self" href="${prefix}${feedPath}"/>
<link rel="alternate" href="${m.site.url}"/>` : ""}}
<author>
<name>${m.site?.title ?? ""}</name>
</author>
<updated>${(new Date()).toISOString()}</updated>

${{verbatim: list.map(post => xml`<entry>
<title>${post.title}}</title>
<id>${{verbatim: m.site?.url ? xml`${m.site.url}${post.pathFromRoot}` : xml`urn:md2blog:${{param: m.site?.title ?? ""}}:${{param: post.title}}`}}</id>
<link rel="alternate" href="${prefix}${post.pathFromRoot}"/>
<updated>${post.date.toISOString()}</updated>
${{verbatim: post.description ? xml`<summary type="text">${post.description}</summary>` : ""}}
<content type="html">${post.html}</content>
</entry>`).join("\n")}}
</feed>
`;

        files[feedPath] = { data: textEncoder.encode(feedXML) };
    };
}
