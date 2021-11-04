import { Buffer } from "buffer";

export default (options) => (async (files, metalsmith, done) => {
    // Note: this code could be modified to run promises in parallel
    try {
        for (const key of Object.keys(options)) {
            const definition = options[key];
            const file = Object.assign({}, definition);

            // definition.contents can be a string, a function returning a string or promise, or undefined
            const contents = definition.contents;
            switch (typeof(contents)) {
                case "string":
                    file.contents = Buffer.from(contents);
                    break;

                case "function":
                    // Function returning a promise
                    const result = contents(metalsmith.metadata());
                    file.contents = result.then ? await result : result;
                    break;

                default:
                    file.contents = Buffer.from("");
                    break;
            }

            files[key] = file;
        }

        done();
    } catch (err) {
        done(err);
    }
});
