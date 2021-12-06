deno run --allow-read=site.schema.json --allow-write=site.ts ../../json-schema-aot/main.ts site.schema.json --ts site.ts
deno run --allow-read=post.schema.json --allow-write=post.ts ../../json-schema-aot/main.ts post.schema.json --ts post.ts
