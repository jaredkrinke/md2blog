import { posix } from "https://deno.land/std@0.113.0/path/mod.ts";

// Normalize to POSIX/web (forward) slashes
const { join, dirname } = posix;

export type Metadata = {
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

export type Plugin = (files: Files, goldsmith: GoldsmithObject) => (Promise<void> | void);

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

export type GoldsmithEventType = "built";
export class GoldsmithBuiltEvent extends Event {
    constructor() { super("built"); }
}

class GoldsmithObject {
    properties: Metadata = {};
    cleanOutputDirectory = false;
    inputDirectory?: string;
    outputDirectory?: string;
    plugins: Plugin[] = [];
    events: EventTarget = new EventTarget();

    metadata(properties: Metadata): GoldsmithObject;
    metadata(): Metadata;
    metadata(properties?: Metadata): GoldsmithObject | Metadata {
        if (properties) {
            Object.assign(this.properties, properties);
            return this;
        } else {
            return this.properties;
        }
    }

    source(): string;
    source(directoryName: string): GoldsmithObject;
    source(directoryName?: string): GoldsmithObject | string {
        if (directoryName) {
            this.inputDirectory = directoryName;
            return this;
        } else {
            return this.inputDirectory ?? "";
        }
    }

    destination(): string;
    destination(directoryName: string): GoldsmithObject
    destination(directoryName?: string): GoldsmithObject | string {
        if (directoryName) {
            this.outputDirectory = directoryName;
            return this;
        } else {
            return this.outputDirectory ?? "";
        }
    }

    clean(clean: boolean): GoldsmithObject {
        this.cleanOutputDirectory = clean;
        return this;
    }

    use(plugin: Plugin): GoldsmithObject {
        this.plugins.push(plugin);
        return this;
    }

    async run(): Promise<Files> {
        // Read files
        const files: Files = {};
        if (this.inputDirectory) {
            const inputDirectory = this.inputDirectory;
            const inputFilePaths = await enumerateFiles(inputDirectory);
            await Promise.all(inputFilePaths.map(async (path) => {
                // TODO: Is there a better way to strip off the input directory name (plus slash)? path.relative requires additional permissions
                const pathFromInputDirectory = path.slice(inputDirectory.length + 1);
                files[pathFromInputDirectory] = { data: await Deno.readFile(path) };
            }));
        }

        // Process plugins
        for (const plugin of this.plugins) {
            const result = plugin(files, this);
            if (isPromise(result)) {
                await result;
            }
        }

        return files;
    }

    async build(): Promise<void> {
        // Check options
        if (!this.outputDirectory) {
            throw "Output directory must be specified using: .destination(\"something\")";
        }

        // Clean, if requested
        // TODO: Must create output directory if it doesn't exist! Does that work with command line permissions?
        const outputDirectory: string = this.outputDirectory;
        if (this.cleanOutputDirectory) {
            try {
                const tasks = [];
                for await (const dirEntry of Deno.readDir(outputDirectory)) {
                    // Ignore files that start with ".", e.g. ".git"
                    if (!dirEntry.name.startsWith(".")) {
                        tasks.push(Deno.remove(join(outputDirectory, dirEntry.name), { recursive: true }));
                    }
                }
                await Promise.all(tasks);
            } catch (e) {
                if (e instanceof Deno.errors.NotFound) {
                    // Nothing to cleanup
                } else {
                    throw e;
                }
            }
        }

        // Read files and process plugins
        const files = await this.run();

        // Output files by creating directories first and then writing files in parallel
        for (const key of Object.keys(files)) {
            const dir = join(outputDirectory, dirname(key));
            await Deno.mkdir(dir, { recursive: true });
        }

        await Promise.all(Object.keys(files).map(key => Deno.writeFile(join(outputDirectory, key), files[key].data)));

        // Signal completion
        this.events.dispatchEvent(new GoldsmithBuiltEvent());
    }

    addEventListener(type: GoldsmithEventType, listener: (event: GoldsmithBuiltEvent) => void): void {
        this.events.addEventListener(type, listener);
    }

    removeEventListener(type: GoldsmithEventType, listener: (event: GoldsmithBuiltEvent) => void): void {
        this.events.removeEventListener(type, listener);
    }
}

// TODO: Allow changing root directory
export const Goldsmith = () => new GoldsmithObject();
