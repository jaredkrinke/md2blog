import { build, emptyDir } from "https://deno.land/x/dnt@0.33.1/mod.ts";
import { version } from "../version.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./main.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
  },
  typeCheck: false,
  scriptModule: false,
  declaration: false,
  package: {
    // package.json properties
    name: "md2blog",
    version,
    description: "md2blog, but for Node!",
    license: "MIT",
  },
});

Deno.copyFileSync("README.md", "npm/README.md");
