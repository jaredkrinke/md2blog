import assert from "assert";
import { exec } from "child_process";
import { promises } from "fs";
import { describe, it } from "mocha";
import path from "path";
import { promisify } from "util";
import cheerio from "cheerio";

const execAsync = promisify(exec);

const validateSuccessAsync = async (execPromise) => {
    await assert.doesNotReject(execPromise);
};

const testAsync = async (workingDirectory, commandLineArgumentsString, validate = validateSuccessAsync) => {
    const pathToModuleRoot = "../".repeat(Array.from(workingDirectory.matchAll(/[\\/]/g)).length + 1);
    const commandLine = `node ${pathToModuleRoot}main.js ${commandLineArgumentsString}`;
    await validate(execAsync(commandLine, {
        cwd: workingDirectory,
        windowsHide: true,
        timeout: 10 * 1000, // ms
    }), workingDirectory);

    // TODO: Actually delete the output directory?
};

// Validate output, including selecting elements and verifying their text content
const validateOutput = async (workingDirectory, files, outputDirectory = "out") => {
    for (const file of files) {
        const buffer = await promises.readFile(path.join(workingDirectory, outputDirectory, file.name));
        if (file.tests) {
            const doc = cheerio.load(buffer);
            for (const test of file.tests) {
                const element = doc(test[0]);
                assert.equal(element.text(), test[1]);
            }
        }
    }
};


describe("md2blog", () => {
    describe("Trivial site", () => {
        it("Builds successfully", async () => testAsync("test/data/trivial-site", "", async (execPromise, workingDirectory) => {
                await assert.doesNotReject(execPromise);
                await validateOutput(workingDirectory, [
                    {
                        name: "index.html",
                        tests: [
                            ["header > h1 > a", "Trivial site"],
                        ],
                    },
                    { name: "404.html" },
                ]);
            })
        );
    });

    describe("Command line arguments", () => {
        it("Input directory", async () => {
        });
    
        it("Output directory", async () => {
        });

        it("Clean output directory", async () => {
        });

        it("Exclude drafts", async () => {
        });
    });

    describe("Static assets", () => {
    });

    describe("Relative links", () => {
    });

    describe("Site metadata", () => {
    });

    describe("Arbitrary pages", () => {
    });

    describe("Posts", () => {
        describe("Uncategorized posts", () => {
        });

        describe("Implicit categorization", () => {
        });

        describe("Keywords", () => {
        });

        describe("Tag navigation", () => {
        });

        describe("Syntax highlighting", () => {
        });

        describe("Broken links", () => {
        });
    });

    describe("Tag indexes", () => {
    });

    describe("Index page", () => {
        describe("Top tags", () => {
        });
    });

    describe("News archive", () => {
    });

    describe("News feed", () => {
        describe("Absolute links", () => {
        });

        describe("Relative links", () => {
        });
    });

    describe("Error page", () => {
    });
});
