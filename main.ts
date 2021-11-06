import { join } from "https://deno.land/std@0.113.0/path/mod.ts";

const input = "content";
// const output = "out";

// type File = {
//     path: string,
//     data: Uint8Array,
//     [propertyName: string]: any,
// };

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

console.log(await enumerateFiles(input));

// async function readDirectoryEntry(path: string, dirEntry: Deno.DirEntry) {

// }

// async function readDirectory(path: string, directoryName: string) {
//     for await (const dirEntry of Deno.readDir(join(input)))
// }
