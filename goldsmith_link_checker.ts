import type { GoldsmithPlugin } from "../goldsmith/mod.ts";
import { cheerio, Root, Cheerio } from "https://deno.land/x/cheerio@1.0.4/mod.ts";

interface BrokenLink {
    filePath: string;
    href: string;
}

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
export function goldsmithLinkChecker(): GoldsmithPlugin {
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
