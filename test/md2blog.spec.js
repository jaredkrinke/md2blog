import assert from "assert";
import cheerio from "cheerio";
import { exec } from "child_process";
import { promises } from "fs";
import { describe, it } from "mocha";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const testAsync = async (workingDirectory, commandLineArgumentsString, validate) => {
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
        const filePath = path.join(workingDirectory, outputDirectory, file.name);
        if (file.exists === false) {
            assert.rejects(promises.readFile(filePath), "File does not exist");
        } else {
            const buffer = await promises.readFile(filePath);
            if (file.tests) {
                const doc = cheerio.load(buffer);
                for (const test of file.tests) {
                    const element = doc(test[0]);
                    assert.equal(element.text(), test[1]);
                }
            }
        }
    }
};


describe("md2blog", function () {
    this.timeout(30 * 1000); // In milliseconds (note: these tests are slow because they spin up new processes and do a lot of file IO)

    describe("Trivial site", () => {
        it("Trivial site builds successfully", async () => testAsync("test/data/trivial-site", "", async (execPromise, workingDirectory) => {
            await assert.doesNotReject(execPromise, "Builds successfully");
            await validateOutput(workingDirectory, [
                {
                    name: "index.html",
                    tests: [
                        ["header > h1 > a", "Trivial site"],
                    ],
                },
                { name: "404.html" },
                { name: "feed.xml" },
                { name: "posts/index.html" },
                { name: "css/style.css" },
            ]);
        }));
    });

    describe("Command line arguments", () => {
        it("Input directory reads from different location", async () => testAsync("test/data/input-dir", "-i root", async (execPromise, workingDirectory) => {
            await execPromise;
            await validateOutput(workingDirectory, [ { name: "index.html" } ]);
        }));
    
        it("Output directory writes to a different location", async () => testAsync("test/data/output-dir", "-o www", async (execPromise, workingDirectory) => {
            await execPromise;
            await validateOutput(workingDirectory, [ { name: "index.html" } ], "www");
        }));

        it("Cleaning clears the output directory", async () => {
            const root = "test/data/trivial-site";
            const outputDirectory = path.join(root, "out");
            const extraFilePath = path.join(outputDirectory, "extra.txt");
            try { await promises.mkdir(outputDirectory) } catch (err) {}
            await promises.writeFile(extraFilePath, "extra file");

            await testAsync(root, "", async (execPromise, workingDirectory) => {
                await execPromise;
                await assert.doesNotReject(promises.readFile(extraFilePath), "Extra file still exists");
            });

            await testAsync(root, "--clean", async (execPromise, workingDirectory) => {
                await execPromise;
                await validateOutput(workingDirectory, [{ name: "index.html" } ]);
                await assert.rejects(promises.readFile(extraFilePath), "Extra file no longer exists");
            });
        });

        it("Exclude drafts", async () => {
            const root = "test/data/example";

            await testAsync(root, "", async (execPromise, workingDirectory) => {
                await execPromise;
                await validateOutput(workingDirectory, [{
                    name: "posts/category1/draft.html",
                    exists: false,
                }])
                await validateOutput(workingDirectory, [{ name: "posts/category1/draft.html" }]);
            });

            await testAsync(root, "-d", async (execPromise, workingDirectory) => {
                await execPromise;
                await validateOutput(workingDirectory, [{ name: "posts/category1/draft.html" }]);
            });

            await testAsync(root, "--drafts", async (execPromise, workingDirectory) => {
                await execPromise;
                await validateOutput(workingDirectory, [{ name: "posts/category1/draft.html" }]);
            });
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
