import { copyFile, mkdir } from "fs/promises";
import { join } from "path";

const sourceDir = join(process.cwd(), "dist");
const distDir = join(process.cwd(), "dist", "src");

async function main() {
    try {
        // Ensure dist directory exists
        await mkdir(distDir, { recursive: true });

        // Copy source files to dist
        const files = [
            "index.js",
            "mistral.js",
            "types.js",
            "middleware.js",
            "sse.js"
        ];

        for (const file of files) {
            const source = join(sourceDir, file);
            const dest = join(distDir, file);
            try {
                await copyFile(source, dest);
                console.log(`Copied ${file}`);
            } catch (error) {
                console.log(`Skipped ${file} (may not exist yet)`);
            }
        }

        console.log("Mistral provider build completed!");
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

main();
