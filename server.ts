const webRoot = "out";
const hostname = "localhost";
const port = 8888;

async function handleConnection(connection: Deno.Conn) {
    try {
        const httpConnection = Deno.serveHttp(connection);
        for await (const re of httpConnection) {
            const url = new URL(re.request.url);
            try {
                const path = webRoot + (url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname);
                await re.respondWith(new Response((await Deno.readFile(path)), { status: 200 }));
                console.log(`Response: ${re.request.url} => ${path}`);
            } catch (_e) {
                await re.respondWith(new Response("", { status: 404 }));
                console.log(`Response: ${re.request.url} => (not found)`);
            }
        }
    } catch (e) {
        console.log(`Server error: ${e}`);
    }
}

const server = Deno.listen({ hostname, port });
console.log(`Listening on: http://${hostname}:${port}/`);
for await (const connection of server) {
    handleConnection(connection);
}
