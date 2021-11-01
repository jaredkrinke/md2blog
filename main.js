#!/usr/bin/env node

import { Command } from "commander";
import { md2blogAsync } from "./md2blog.js";

// Command line arguments
const program = new Command()
    .option("-s, --serve", "serve web site, with automatic reloading")
    .option("-c, --clean", "clean output directory before processing")
    .option("-d, --drafts", "include drafts in output")
    .option("-i, --input <dir>", "input directory", "content")
    .option("-o, --output <dir>", "output directory", "out")
    .option("--ignore-broken-links", "don't check for broken relative links")
    .parse();

await md2blogAsync(program.opts());
