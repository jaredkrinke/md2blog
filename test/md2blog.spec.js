import assert from "assert";
import cheerio from "cheerio";
import { exec } from "child_process";
import { promises } from "fs";
import { describe, it } from "mocha";
import path from "path";
import { promisify } from "util";
import { md2blogAsync } from "../md2blog.js";

const execAsync = promisify(exec);

const spawnAndRunAsync = (workingDirectory, commandLineArgumentsString) => {
    const pathToModuleRoot = "../".repeat(Array.from(workingDirectory.matchAll(/[\\/]/g)).length + 1);
    const commandLine = `node ${pathToModuleRoot}main.js ${commandLineArgumentsString}`;
    return execAsync(commandLine, {
        cwd: workingDirectory,
        windowsHide: true,
        timeout: 10 * 1000, // ms
    });
};

const testAsync = async (workingDirectory, commandLineArgumentsString, validateAsync) => {
    await validateAsync(spawnAndRunAsync(workingDirectory, commandLineArgumentsString), workingDirectory);
    // TODO: Actually delete the output directory?
};

// Validate output, including selecting elements and verifying their text content
const validateOutputAsync = async (workingDirectory, files, outputDirectory = "out") => {
    for (const file of files) {
        const filePath = path.join(workingDirectory, outputDirectory, file.name);
        if (file.exists === false) {
            assert.rejects(promises.readFile(filePath), "File does not exist");
        } else {
            const buffer = await promises.readFile(filePath);
            if (file.tests) {
                const doc = cheerio.load(buffer);
                for (const test of file.tests) {
                    const actual = test.select(doc);
                    assert.deepEqual(actual, test.expected);
                }
            }
        }
    }
};


describe("md2blog", function () {
    this.timeout(30 * 1000); // In milliseconds (note: these tests are slow because they spin up new processes and do a lot of file IO)

    describe("Basic functionality", () => {
        it("Builds trivial site successfully", async () => testAsync("test/data/trivial-site", "", async (execPromise, workingDirectory) => {
            await assert.doesNotReject(execPromise, "Builds successfully");

            // Verify all expected files are produced
            await validateOutputAsync(workingDirectory, [
                {
                    name: "index.html",
                    tests: [
                        { select: $ => $("header > h1 > a").text(), expected: "Trivial site" },
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
        it("Reads from specified input directory", async () => testAsync("test/data/input-dir", "-i root", async (execPromise, workingDirectory) => {
            await execPromise;
            await validateOutputAsync(workingDirectory, [ { name: "index.html" } ]);
        }));
    
        it("Writes to specified output directory", async () => testAsync("test/data/output-dir", "-o www", async (execPromise, workingDirectory) => {
            await execPromise;
            await validateOutputAsync(workingDirectory, [ { name: "index.html" } ], "www");
        }));

        it("Clears the output directory when requested", async () => {
            const root = "test/data/trivial-site";
            const outputDirectory = path.join(root, "out");
            const extraFilePath = path.join(outputDirectory, "extra.txt");

            // Add an extra file to the output directory
            try { await promises.mkdir(outputDirectory) } catch (err) {}
            await promises.writeFile(extraFilePath, "extra file");

            // Build without cleaning and ensure file remains
            await testAsync(root, "", async (execPromise, workingDirectory) => {
                await execPromise;
                await assert.doesNotReject(promises.readFile(extraFilePath), "Extra file still exists");
            });

            // Build with cleaning and ensure file is gone
            await testAsync(root, "--clean", async (execPromise, workingDirectory) => {
                await execPromise;
                await validateOutputAsync(workingDirectory, [{ name: "index.html" } ]);
                await assert.rejects(promises.readFile(extraFilePath), "Extra file no longer exists");
            });
        });

        it("Excludes drafts when requested", async () => {
            const root = "test/data/example";

            // By default, drafts are excluded
            await testAsync(root, "", async (execPromise, workingDirectory) => {
                await execPromise;
                await validateOutputAsync(workingDirectory, [{
                    name: "posts/category1/draft.html",
                    exists: false,
                }]);
            });

            // Test both ways of including drafts
            await testAsync(root, "-d", async (execPromise, workingDirectory) => {
                await execPromise;
                await validateOutputAsync(workingDirectory, [{ name: "posts/category1/draft.html" }]);
            });

            await testAsync(root, "--drafts", async (execPromise, workingDirectory) => {
                await execPromise;
                await validateOutputAsync(workingDirectory, [{ name: "posts/category1/draft.html" }]);
            });
        });
    });

    describe("General functionality", async () => {
        const root = "test/data/example";
        const inputDirectory = path.join(root, "content");
        const outputDirectory = path.join(root, "out");
        before(async () => {
            await md2blogAsync({
                root,
                input: "content",
                output: "out",
            });
        });

        describe("Input types", async () => {
            it("Copies static assets verbatim", async () => {
                const fileName = "favicon.ico";
                const inputPath = path.join(inputDirectory, fileName);
                const outputPath = path.join(outputDirectory, fileName);
                assert.equal(await promises.readFile(outputPath, { encoding: "binary" }), await promises.readFile(inputPath, { encoding: "binary" }));
            });

            // TODO: Bug that needs to be fixed
            // it("Copies static HTML files verbatim", async () => {
            //     const fileName = "static-asset.html";
            //     const inputPath = path.join(inputDirectory, fileName);
            //     const outputPath = path.join(outputDirectory, fileName);
            //     assert.equal(await promises.readFile(outputPath), await promises.readFile(inputPath));
            // });
        
            it("Updates relative links, including anchors", () => validateOutputAsync(root, [
                {
                    // Check for relative link in cat1post content to cat2post
                    "name": "posts/category1/cat1post.html",
                    "tests": [
                        { select: $ => $("article > p > a").attr("href"), expected: "../category2/cat2post.html#target" },
                    ]
                },
                {
                    // Verify target section is in cat2post
                    "name": "posts/category2/cat2post.html",
                    "tests": [
                        { select: $ => $("#target").length, expected: 1 },
                    ]
                },
            ]));
        
            it("Inserts site metadata", () => validateOutputAsync(root, [
                {
                    "name": "index.html",
                    "tests": [
                        // Verify site title in head and body
                        { select: $ => $("head title").text(), expected: "md2blog example" },
                        { select: $ => $("body > header > h1").text(), expected: "md2blog example" },

                        // Verify site description in meta and body
                        { select: $ => $("meta[name='description']").attr("content"), expected: "Example site used for testing md2blog" },
                        { select: $ => $("body > header > p").text(), expected: "Example site used for testing md2blog" },
                    ]
                },
            ]));
        
            it("Processes arbitrary non-post pages", () => validateOutputAsync(root, [
                {
                    // Check for HTML file with processed Markdown
                    "name": "page.html",
                    "tests": [
                        { select: $ => $("#big-heading").length, expected: 1 },
                        { select: $ => $("article > p").text(), expected: "This is a page, not a post." },
                    ]
                },
            ]));
        });

        describe("Posts", () => {
            it("Implicitly categorizes uncategorized posts as misc", () => validateOutputAsync(root, [
                {
                    // Verify title, link, and description are in the "misc" tag index page
                    "name": "posts/misc/index.html",
                    "tests": [
                        { select: $ => $("article > header > h1 > a").text(), expected: "Uncategorized; test out escaping: \\<>&:'\"!`[]()^" },
                        { select: $ => $("article > header a").attr("href"), expected: "../../posts/uncategorized.html" },
                        { select: $ => $("article > p").text(), expected: "Test out escaping: \\<>&:'\"!`[]()^; 子曰：「學而時習之，不亦說乎？有朋自遠方來，不亦樂乎？人不知而不慍，不亦君子乎？」" },
                    ]
                },
                {
                    "name": "posts/uncategorized.html",
                    "tests": [
                        // Verify title and description
                        { select: $ => $("main header h1").text(), expected: "Uncategorized; test out escaping: \\<>&:'\"!`[]()^" },
                        { select: $ => $("meta[name='description']").attr("content"), expected: "Test out escaping: \\<>&:'\"!`[]()^; 子曰：「學而時習之，不亦說乎？有朋自遠方來，不亦樂乎？人不知而不慍，不亦君子乎？」" },

                        // Verify tag navigation link exists
                        { select: $ => $("nav li").text(), expected: "misc" },
                    ]
                },
            ]));
    
            it("Implicitly categorizes posts using directory name", () => validateOutputAsync(root, [
                {
                    // Verify title and link in "category1" index page
                    "name": "posts/category1/index.html",
                    "tests": [
                        { select: $ => $("article > header > h1 > a").text(), expected: "Category 1 post" },
                        { select: $ => $("article > header a").attr("href"), expected: "../../posts/category1/cat1post.html" },
                    ]
                },
                {
                    // Verify title in cat1post output
                    "name": "posts/category1/cat1post.html",
                    "tests": [
                        { select: $ => $("main header h1").text(), expected: "Category 1 post" },
                    ]
                },
                {
                    // Same tests for another category
                    "name": "posts/category2/index.html",
                    "tests": [
                        { select: $ => $("article > header > h1 > a").text(), expected: "Category 2 post" },
                        { select: $ => $("article > header a").attr("href"), expected: "../../posts/category2/cat2post.html" },
                    ]
                },
                {
                    "name": "posts/category2/cat2post.html",
                    "tests": [
                        { select: $ => $("main header h1").text(), expected: "Category 2 post" },
                    ]
                },
            ]));
    
            it("Categorizes posts based on provided keywords", () => validateOutputAsync(root, [
                {
                    // Verify cat1post and cat2post are both in the "random" index page (ordered newest to oldest)
                    "name": "posts/random/index.html",
                    "tests": [
                        { select: $ => $("main ul li:nth-child(1) h1").text(), expected: "Category 2 post" },
                        { select: $ => $("main ul li:nth-child(2) h1").text(), expected: "Category 1 post" },
                    ]
                },
            ]));
    
            it("Adds tag navigation links to posts", () => validateOutputAsync(root, [
                {
                    // Check for both category and keyword links in navigation header
                    "name": "posts/category1/cat1post.html",
                    "tests": [
                        { select: $ => $("nav li:contains('category1')").length, expected: 1 },
                        { select: $ => $("nav li:contains('random')").length, expected: 1 },
                    ]
                },
            ]));

            it("Adds syntax highlighting", () => validateOutputAsync(root, [
                {
                    // Verify in JavaScript fragment that "const" is highlighted as a language keyword
                    "name": "posts/category1/cat1post.html",
                    "tests": [
                        { select: $ => $("#code-block ~ pre span.hljs-keyword").text(), expected: "const" },
                    ]
                },
            ]));

            it("Fails on broken link", () => {
                assert.rejects(md2blogAsync({
                    root: "test/data/broken-link",
                    input: "content",
                    output: "out",
                }));
            });

            it("Fails on broken link anchor", () => {
                assert.rejects(md2blogAsync({
                    root: "test/data/broken-anchor",
                    input: "content",
                    output: "out",
                }));
            });

            it("Fails on broken image", () => {
                assert.rejects(md2blogAsync({
                    root: "test/data/broken-image",
                    input: "content",
                    output: "out",
                }));
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
    });
});
