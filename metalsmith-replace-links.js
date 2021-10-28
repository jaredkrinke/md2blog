import { createReplaceLinksOptions } from "./marked-replace-links.js";
import metalsmithMarked from "./metalsmith-marked.js";

export default (replace) => {
    return metalsmithMarked.options(createReplaceLinksOptions(replace));
};
