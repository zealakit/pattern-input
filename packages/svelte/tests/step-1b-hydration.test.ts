import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { flushSync, hydrate, tick, unmount } from "svelte";
import Page from "./fixtures/hydration-page.svelte";

/**
 * `[NQ11]` Svelte hydration: server render, hydrate, no warnings, and the ids and
 * ARIA the client shows are the ones the server sent.
 */

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const loader = pathToFileURL(
  join(packageRoot, "tests", "hydration-loader.ts"),
).href;
const fixture = pathToFileURL(
  join(packageRoot, "tests", "fixtures", "hydration-page.svelte"),
).href;

function serverHtml(): string {
  const script = `
    const { render } = await import("svelte/server");
    const page = (await import(${JSON.stringify(fixture)})).default;
    process.stdout.write(JSON.stringify(render(page, { props: {} }).body));
  `;
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "--strip-types",
        "--import",
        loader,
        "--input-type=module",
        "--eval",
        script,
      ],
      { cwd: packageRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
}

function surface(root: ParentNode): string {
  return [...root.querySelectorAll("*")]
    .map((element) => {
      const attrs = [...element.attributes]
        .filter(
          (attribute) =>
            attribute.name === "id" ||
            attribute.name === "for" ||
            attribute.name.startsWith("aria-"),
        )
        .map((attribute) => `${attribute.name}=${attribute.value}`)
        .sort()
        .join(",");
      return `${element.tagName}:${attrs}`;
    })
    .join("|");
}

test("[NQ11] Svelte: server markup hydrates with no warnings and identical ids/aria", async () => {
  const target = document.createElement("div");
  target.innerHTML = serverHtml();
  document.body.append(target);
  const server = surface(target);
  assert.match(server, /aria-|id=/);

  const messages: string[] = [];
  const { warn, error } = console;
  console.warn = (...args: unknown[]) =>
    void messages.push(args.map(String).join(" "));
  console.error = (...args: unknown[]) =>
    void messages.push(args.map(String).join(" "));
  let app: ReturnType<typeof hydrate> | undefined;
  try {
    app = hydrate(Page, { target, props: {} });
    flushSync();
    await tick();
    flushSync();
  } finally {
    console.warn = warn;
    console.error = error;
  }

  assert.deepEqual(messages, []);
  assert.equal(surface(target), server);
  void unmount(app);
  target.remove();
});
