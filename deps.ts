import type { SiteMetadata } from "./schema/site.ts";
import type { PostMetadata } from "./schema/post.ts";

export type { SiteMetadata };
export type { PostMetadata };
export { validate as validateSiteMetadata } from "./schema/site.ts";
export { validate as validatePostMetadata } from "./schema/post.ts";
export { Goldsmith } from "https://deno.land/x/goldsmith@1.2.1/mod.ts";
export type { GoldsmithPlugin, GoldsmithFile } from "https://deno.land/x/goldsmith@1.2.1/mod.ts";
export { goldsmithJSONMetadata } from "https://deno.land/x/goldsmith@1.2.1/plugins/json_metadata/mod.ts";
export { goldsmithFrontMatter } from "https://deno.land/x/goldsmith@1.2.1/plugins/front_matter/mod.ts";
export { goldsmithExcludeDrafts } from "https://deno.land/x/goldsmith@1.2.1/plugins/exclude_drafts/mod.ts";
export { goldsmithFileMetadata } from "https://deno.land/x/goldsmith@1.2.1/plugins/file_metadata/mod.ts";
export { goldsmithIndex } from "https://deno.land/x/goldsmith@1.2.1/plugins/index/mod.ts";
export { goldsmithCollections } from "https://deno.land/x/goldsmith@1.2.1/plugins/collections/mod.ts";
export { goldsmithInjectFiles } from "https://deno.land/x/goldsmith@1.2.1/plugins/inject_files/mod.ts";
export { goldsmithMarkdown } from "../goldsmith/plugins/markdown/mod.ts";
export { goldsmithRootPaths } from "https://deno.land/x/goldsmith@1.2.1/plugins/root_paths/mod.ts";
export { goldsmithLayout } from "https://deno.land/x/goldsmith@1.2.1/plugins/layout/mod.ts";
export { goldsmithLayoutLiteralHTML } from "https://deno.land/x/goldsmith@1.2.1/plugins/layout/literal_html.ts";
export type { GoldsmithLiteralHTMLLayoutContext, GoldsmithLiteralHTMLLayoutCallback, GoldsmithLiteralHTMLLayoutMap } from "https://deno.land/x/goldsmith@1.2.1/plugins/layout/literal_html.ts";
export { goldsmithWatch } from "../goldsmith/plugins/watch/mod.ts";
export { goldsmithServe } from "https://deno.land/x/goldsmith@1.2.1/plugins/serve/mod.ts";
export { goldsmithFeed } from "https://deno.land/x/goldsmith@1.2.1/plugins/feed/mod.ts";
export { goldsmithLinkChecker } from "../goldsmith/plugins/link_checker/mod.ts";
export { version } from "./version.ts";

declare module "https://deno.land/x/goldsmith@1.2.1/mod.ts" {
    interface GoldsmithMetadata {
        site?: SiteMetadata;
        tagsAll?: string[];
        tagsTop?: string[];
    }

    interface GoldsmithFile extends Partial<PostMetadata> {
        // Generic post schema comes from PostMetadata

        // Derived properties
        category?: string;
        tags?: string[];

        // Root properties
        isRoot?: boolean;

        // Tag index properties
        tag?: string;
        isTagIndex?: boolean;
        postsWithTag?: GoldsmithFile[];
    }
}
