import marked from "marked";

export const createReplaceLinksOptions = (replace) => {
    const createHandler = baseHandler => {
        return function (href, title, text) {
            return baseHandler.call(this, replace(href), title, text);
        };
    }

    const baseMarkdownRenderer = new marked.Renderer();
    return {
        renderer: {
            link: createHandler(baseMarkdownRenderer.link),
            image: createHandler(baseMarkdownRenderer.image),
        },
    };
};
