import path from "path";

export default (options) => ((files, metalsmith, done) => {
    const keys = Object.keys(files);
    for (const key of keys) {
        const newKey = key.replace(/[\\/]/g, options?.usePlatformSeparators ? path.sep : "/");
        if (newKey !== key) {
            files[newKey] = files[key];
            delete files[key];
        }
    }
    done();
});
