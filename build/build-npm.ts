// Build md2blog for Node/NPM using dnt (to support 32-bit platforms, etc.)

import { build, emptyDir } from "https://deno.land/x/dnt/mod.ts";
import { version } from "../version.ts";

const outDir = "./npm";

await emptyDir(outDir);

await build({
  entryPoints: [
    {
        kind: "bin",
        name: "md2blog",
        path: "../main.ts",
    },
  ],
  outDir,
  scriptModule: false,
  typeCheck: false,
  declaration: false,
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  package: {
    // package.json properties
    name: "md2blog",
    version,
    description: "md2blog for NPM",
    license: "MIT",
  },
});
