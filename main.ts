import { join, dirname } from "https://deno.land/std@0.113.0/path/mod.ts";

type Metadata = {
    // Plugins can add arbitrary properties -- is there any way for plugins to advertise what they produce?
    // deno-lint-ignore no-explicit-any
    [propertyName: string]: any,
};

type File = Metadata & {
    path: string,
    data: Uint8Array,
};

type Plugin = (files: File[], metadata: Metadata) => (Promise<void> | void);

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
            await Deno.remove(outputDirectory, { recursive: true });
        }

        // Read files
        const inputFilePaths = await enumerateFiles(inputDirectory);
        const files: File[] = await Promise.all(inputFilePaths.map(async (path) => ({
            path,
            data: await Deno.readFile(path),
        })));

        // Process plugins
        for (const plugin of this.plugins) {
            const result = plugin(files, this.properties);
            if (isPromise(result)) {
                await result;
            }
        }

        // Output files by creating directories first and then writing files in parallel
        for (const file of files) {
            const dir = join(outputDirectory, dirname(file.path));
            await Deno.mkdir(dir, { recursive: true });
        }

        await Promise.all(files.map(file => Deno.writeFile(join(outputDirectory, file.path), file.data)));
    }
}

const Goldsmith = () => new GoldsmithObject();

// TODO: This is just a test
const input = "content";
const output = "out";

// Logging plugins
const logMetadata: Plugin = (_files, metadata) => console.log(metadata);
const logFiles: Plugin = (files, _metadata) => {
    console.log(files.map(file => {
        const { data, ...rest } = file;
        return { ...rest, ["data.length"]: data.length };
    }));
};

await Goldsmith()
    .metadata({
        site: {
            title: "Hi there",
        },
    })
    .source(input)
    .destination(output)
    .clean(true)
    .use(logMetadata)
    .use(logFiles)
    .build();
