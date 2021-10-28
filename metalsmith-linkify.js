/** Metalsmith plugin to add links to each item, for example:
 * 
 * file.link = {
 *     fromRoot: "path/From/Root/" // Forward slashes only
 *     absolute: "https://site.com/path/From/Root/" // Using site.url from global metadata
 * };
 */
export default () => ((files, metalsmith, done) => {
    Object.keys(files).forEach(key => {
        // Link relative to the site root
        const link = {};
        files[key].link = link;
        link.fromRoot = key.replace(/\\/g, "/"); // Convert slashes...
        
        // Absolute link (if absolute link to site root provided)
        const siteUrl = metalsmith?.metadata()?.site?.url;
        if (siteUrl) {
            link.absolute = siteUrl + (siteUrl.endsWith("/") ? "" : "/") + link.fromRoot;
        }
    });
    done();
});
