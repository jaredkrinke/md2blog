import { Buffer } from "buffer";

export default (options) => ((files, metalsmith, done) => {
    Object.keys(options).forEach(key => {
        const definition = options[key];
        const file = Object.assign({}, definition);
        file.contents = Buffer.from(definition.contents ?? "");

        files[key] = file;
    });

    done();
});
