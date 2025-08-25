/* eslint-env node */
import fs from "node:fs/promises";
import path from "node:path";

const PKG_DIR = process.cwd();
const BUILD = path.join(PKG_DIR, "dist/build");
const OUT = path.join(PKG_DIR, "dist");

const SRC_IN = path.join(BUILD, "provider", "openai", "src");
const CORE_IN = path.join(BUILD, "core");
const SRC_OUT = path.join(OUT, "src");
const CORE_OUT = path.join(OUT, "core");

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
async function rewriteImports(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { await rewriteImports(p); continue; }
        if (!/\.(m?js|d\.ts|cjs|mjs|js\.map|d\.ts\.map)$/.test(e.name)) continue;
        let txt = await fs.readFile(p, "utf8");
        txt = txt
            .replaceAll("../../../core/", "../core/")
            .replaceAll("../../core/", "../core/")
            .replaceAll("../../../core\"", "../core\"")
            .replaceAll("../../core\"", "../core\"");
        await fs.writeFile(p, txt, "utf8");
    }
}

(async function main() {
    await rmrf(SRC_OUT); await rmrf(CORE_OUT);
    await moveDir(SRC_IN, SRC_OUT);
    await moveDir(CORE_IN, CORE_OUT);
    await rewriteImports(SRC_OUT);
    await rmrf(BUILD);
})().catch(e => { console.error(e); process.exit(1); });