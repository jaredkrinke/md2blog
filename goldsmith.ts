import { posix } from "https://deno.land/std@0.113.0/path/mod.ts";

// Normalize to POSIX/web (forward) slashes
const { join, dirname } = posix;

type Metadata = {
    // TODO: Plugins can add arbitrary properties -- is there any way for plugins to advertise what they produce?
    // deno-lint-ignore no-explicit-any
    [propertyName: string]: any,
};

export type File = Metadata & {
    data: Uint8Array,
};

export type Files = {
    [key: string]: File,
};

export type Plugin = (files: Files, metadata: Metadata) => (Promise<void> | void);

function isPromise<T>(value: void | Promise<T>): value is Promise<T> {
    return !!(value && value.then);
}

async function enumerateFiles(directoryName: string): Promise<string[]> {
    const filePaths: string[] = [];
    for await (const dirEntry of Deno.readDir(directoryName)) {
        const path = join(directoryName, dirEntry.name);
        if (dirEntry.isFile) {
            filePaths.push(path);
        } else if (dirEntry.isDirectory) {
            filePaths.push(...(await enumerateFiles(path)));
        }
    }
    return filePaths;
}

class GoldsmithObject {
    properties: Metadata = {};
    cleanOutputDirectory = false;
    inputDirectory?: string;
    outputDirectory?: string;
    plugins: Plugin[] = [];

    metadata(properties: Metadata): GoldsmithObject {
        Object.assign(this.properties, properties);
        return this;
    }

    source(directoryName: string): GoldsmithObject {
        this.inputDirectory = directoryName;
        return this;
    }

    destination(directoryName: string): GoldsmithObject {
        this.outputDirectory = directoryName;
        return this;
    }

    clean(clean: boolean) {
        this.cleanOutputDirectory = clean;
        return this;
    }

    use(plugin: Plugin): GoldsmithObject {
        this.plugins.push(plugin);
        return this;
    }

    async build() {
        // Check options
        if (!this.inputDirectory) {
            throw "Input directory must be specified using: .source(\"something\")";
        } else if (!this.outputDirectory) {
            throw "Output directory must be specified using: .destination(\"something\")";
        }

        const inputDirectory: string = this.inputDirectory;
        const outputDirectory: string = this.outputDirectory;

        if (this.cleanOutputDirectory) {
            try {
                await Deno.remove(outputDirectory, { recursive: true });
            } catch (e) {
                if (e instanceof Deno.errors.NotFound) {
                    // Nothing to cleanup
                } else {
                    throw e;
                }
            }
        }

        // Read files
        const inputFilePaths = await enumerateFiles(inputDirectory);
        const files: Files = {};
        await Promise.all(inputFilePaths.map(async (path) => {
            // TODO: Is there a better way to strip off the input directory name (plus slash)? path.relative requires additional permissions
            const pathFromInputDirectory = path.slice(inputDirectory.length + 1);
            files[pathFromInputDirectory] = { data: await Deno.readFile(path) };
        }));

        // Process plugins
        for (const plugin of this.plugins) {
            const result = plugin(files, this.properties);
            if (isPromise(result)) {
                await result;
            }
        }

        // Output files by creating directories first and then writing files in parallel
        for (const key of Object.keys(files)) {
            const dir = join(outputDirectory, dirname(key));
            await Deno.mkdir(dir, { recursive: true });
        }

        await Promise.all(Object.keys(files).map(key => Deno.writeFile(join(outputDirectory, key), files[key].data)));
    }
}

// TODO: Allow changing root directory
export const Goldsmith = () => new GoldsmithObject();
