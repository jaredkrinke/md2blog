deno compile --target x86_64-pc-windows-msvc -o md2blog --allow-net=localhost --allow-read --allow-write ./main.ts
powershell Compress-Archive -Path md2blog.exe -DestinationPath md2blog-x86_64-pc-windows-msvc.zip -Force

deno compile --target x86_64-unknown-linux-gnu -o md2blog --allow-net=localhost --allow-read --allow-write ./main.ts
powershell Compress-Archive -Path md2blog -DestinationPath md2blog-x86_64-unknown-linux-gnu.zip -Force

deno compile --target x86_64-apple-darwin -o md2blog --allow-net=localhost --allow-read --allow-write ./main.ts
powershell Compress-Archive -Path md2blog -DestinationPath md2blog-x86_64-apple-darwin.zip -Force

deno compile --target aarch64-apple-darwin -o md2blog --allow-net=localhost --allow-read --allow-write ./main.ts
powershell Compress-Archive -Path md2blog -DestinationPath md2blog-aarch64-apple-darwin.zip -Force
