import { join } from "https://deno.land/std@0.113.0/path/mod.ts";

type Metadata = {
    // deno-lint-ignore no-explicit-any
    [propertyName: string]: any,
};

type File = Metadata & {
    path: string,
    data: Uint8Array,
};

type Plugin = (files: File[], metadata: Metadata) => Promise<void>;

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
        if (!this.inputDirectory) {
            throw "Input directory must be specified using: .source(\"something\")";
        } else if (!this.outputDirectory) {
            throw "Output directory must be specified using: .destination(\"something\")";
        }

        const inputFilePaths = await enumerateFiles(this.inputDirectory);
        const files: File[] = await Promise.all(inputFilePaths.map(async (path) => ({
            path,
            data: await Deno.readFile(path),
        })));

        console.log("Site:");
        console.log(this.properties);
        console.log(`Copying from ${this.inputDirectory} to ${this.outputDirectory}:`);
        console.log(files.map(file => ({
            path: file.path,
            bytes: file.data.byteLength,
        })));
    }
}

const Goldsmith = () => new GoldsmithObject();

// TODO: This is just a test
const input = "content";
const output = "out";

await Goldsmith()
    .metadata({
        site: {
            title: "Hi there",
        },
    })
    .source(input)
    .destination(output)
    // .clean(true)
    .build();
