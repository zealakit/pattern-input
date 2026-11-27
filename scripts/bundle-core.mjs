/**
 * Vendor the internal core build into a packed adapter tarball.
 *
 * Core is never published to npm. In the repository adapters depend on it via
 * `workspace:^`; at release time this step rewrites a `pnpm pack` tarball so it
 * is self-contained:
 *
 *   - copies `packages/core/dist` to `dist/vendor/core/` inside the adapter,
 *   - rewrites every `@zealakit/pattern-input-core` and
 *     `@zealakit/pattern-input-core/dom` specifier in `dist` (.js, .d.ts) to a
 *     relative path into that folder,
 *   - drops core from `dependencies` and adds core's own runtime dependencies
 *     instead,
 *   - repacks with `npm pack --ignore-scripts`, replacing the original tarball.
 *
 * Page-global core state must live on `globalThis` (see the agents guide), so
 * several adapters bundling their own copy still share it.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const CORE_NAME = "@zealakit/pattern-input-core";
export const VENDOR_DIR = "dist/vendor/core";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CORE_DIR = join(ROOT, "packages", "core");
const SPECIFIER_RE = /(["'])@zealakit\/pattern-input-core(\/dom)?\1/g;
const REWRITE_EXTENSIONS = [".js", ".d.ts"];

function run(command, args, cwd, env = process.env) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status}): ${(
        result.stderr ||
        result.stdout ||
        ""
      ).trim()}`,
    );
  }
  return result.stdout.trim();
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function toPosix(path) {
  return path.split(sep).join(posix.sep);
}

function relativeSpecifier(fromFile, target) {
  let specifier = toPosix(relative(dirname(fromFile), target));
  if (!specifier.startsWith(".")) {
    specifier = `./${specifier}`;
  }
  return specifier;
}

function rewriteSpecifiers(packageRoot) {
  const distDir = join(packageRoot, "dist");
  const vendorDir = join(packageRoot, VENDOR_DIR);
  let rewritten = 0;

  for (const file of walk(distDir)) {
    if (file.startsWith(vendorDir + sep)) {
      continue;
    }
    if (!REWRITE_EXTENSIONS.some((ext) => file.endsWith(ext))) {
      continue;
    }
    const source = readFileSync(file, "utf8");
    if (!source.includes(CORE_NAME)) {
      continue;
    }
    const next = source.replace(SPECIFIER_RE, (_match, quote, subpath) => {
      const target = subpath
        ? join(vendorDir, "dom", "index.js")
        : join(vendorDir, "index.js");
      return `${quote}${relativeSpecifier(file, target)}${quote}`;
    });
    if (next.includes(CORE_NAME)) {
      throw new Error(
        `${relative(packageRoot, file)} references ${CORE_NAME} in a form this step cannot rewrite (subpath or non-literal import).`,
      );
    }
    writeFileSync(file, next);
    rewritten += 1;
  }
  return rewritten;
}

function rewriteManifest(packageRoot, coreManifest) {
  const manifestPath = join(packageRoot, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const dependencies = { ...(manifest.dependencies ?? {}) };
  delete dependencies[CORE_NAME];

  for (const [name, range] of Object.entries(coreManifest.dependencies ?? {})) {
    if (dependencies[name] && dependencies[name] !== range) {
      throw new Error(
        `${manifest.name} depends on ${name}@${dependencies[name]} but core needs ${range}; align the ranges.`,
      );
    }
    dependencies[name] = range;
  }

  manifest.dependencies = dependencies;
  // A published tarball must not carry workspace-only dev links (the engine link,
  // the private core); consumers never install devDependencies.
  delete manifest.devDependencies;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

/**
 * Replace `tarball` (an adapter tarball produced by `pnpm pack`) with a copy
 * that bundles core. Returns the path of the rewritten tarball (same path).
 */
export function bundleCoreIntoTarball(tarball) {
  const coreDist = join(CORE_DIR, "dist");
  if (!existsSync(join(coreDist, "index.js"))) {
    throw new Error("Core is not built; run `pnpm build` first.");
  }
  const coreManifest = JSON.parse(
    readFileSync(join(CORE_DIR, "package.json"), "utf8"),
  );

  const outDir = dirname(tarball);
  const staging = mkdtempSync(join(outDir, ".bundle-core-"));
  try {
    run("tar", ["-xzf", tarball, "-C", staging], ROOT);
    const packageRoot = join(staging, "package");

    const vendorDir = join(packageRoot, VENDOR_DIR);
    if (existsSync(vendorDir)) {
      throw new Error(`${basename(tarball)} already contains ${VENDOR_DIR}.`);
    }
    cpSync(coreDist, vendorDir, { recursive: true });

    // Adapters that ship no behavior yet import nothing; vendoring still keeps
    // the tarball shape identical from plan 00 onward.
    const rewritten = rewriteSpecifiers(packageRoot);
    rewriteManifest(packageRoot, coreManifest);
    if (rewritten === 0) {
      console.log(
        `${basename(tarball)} has no ${CORE_NAME} imports yet; core vendored without specifier rewrites.`,
      );
    }

    rmSync(tarball);
    // Keep npm's cache inside the artifact folder: a machine-global cache can
    // be unwritable (root-owned) and must not make packing fail.
    const npmCache = join(outDir, ".npm-cache");
    const packedName = run(
      "npm",
      ["pack", packageRoot, "--ignore-scripts", "--pack-destination", outDir],
      ROOT,
      {
        ...process.env,
        npm_config_cache: npmCache,
        npm_config_update_notifier: "false",
      },
    )
      .split("\n")
      .pop();
    rmSync(npmCache, { recursive: true, force: true });
    if (packedName !== basename(tarball)) {
      throw new Error(
        `Repacked tarball name changed: expected ${basename(tarball)}, got ${packedName}.`,
      );
    }
    return tarball;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
