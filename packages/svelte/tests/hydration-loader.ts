import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import { compile, compileModule } from "svelte/compiler";

/** Compile Svelte sources for the server render, with no DOM installed. */
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".svelte")) {
      const filename = fileURLToPath(url);
      const { js } = compile(readFileSync(filename, "utf8"), {
        generate: "server",
        filename,
      });
      return { format: "module", source: js.code, shortCircuit: true };
    }
    if (url.endsWith(".svelte.js")) {
      const filename = fileURLToPath(url);
      const { js } = compileModule(
        stripTypeScriptTypes(readFileSync(filename, "utf8")),
        {
          generate: "server",
          filename,
        },
      );
      return { format: "module", source: js.code, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
