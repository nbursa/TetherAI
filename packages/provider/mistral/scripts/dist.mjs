import fs from "node:fs/promises";
import path from "node:path";

const PKG_DIR = process.cwd();
const BUILD = path.join(PKG_DIR, "dist/build");
const OUT = path.join(PKG_DIR, "dist");

const SRC_IN = path.join(BUILD, "src");
const SRC_OUT = path.join(OUT, "src");

async function rmrf(p) { await fs.rm(p, { recursive: true, force: true }); }
async function mkdirp(p) { await fs.mkdir(p, { recursive: true }); }
async function moveDir(src, dst) {
    await mkdirp(path.dirname(dst));
    try { await fs.rename(src, dst); }
    catch {
        const entries = await fs.readdir(src, { withFileTypes: true });
        await mkdirp(dst);
        for (const e of entries) {
            const s = path.join(src, e.name), d = path.join(dst, e.name);
            if (e.isDirectory()) await moveDir(s, d); else await fs.copyFile(s, d);
        }
    }
}

async function addJsExtensions(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await addJsExtensions(fullPath);
        } else if (entry.name.endsWith('.js')) {
            const content = await fs.readFile(fullPath, 'utf8');
            const updatedContent = content.replace(
                /from\s+["'](\.\/[^"']+)["']/g,
                (match, importPath) => {
                    if (!importPath.endsWith('.js') && !importPath.endsWith('.json')) {
                        return match.replace(importPath, importPath + '.js');
                    }
                    return match;
                }
            );
            await fs.writeFile(fullPath, updatedContent);
        }
    }
}

(async function main() {
    await rmrf(SRC_OUT);
    await moveDir(SRC_IN, SRC_OUT);
    await addJsExtensions(SRC_OUT);
    await rmrf(BUILD);
    console.log("✅ Build completed successfully!");
})().catch(e => { console.error(e); process.exit(1); });