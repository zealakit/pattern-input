import * as adapter from "@zealakit/pattern-input-vue";
import { createApp, h } from "vue";

const exported = Object.keys(adapter);

createApp({
  render() {
    return h("main", [
      h("h1", "@zealakit/pattern-input-vue"),
      h("p", "Placeholder example. Field demos land in plan 12."),
      h(
        "p",
        exported.length === 0
          ? "Adapter entry resolved (no exports yet)."
          : `Adapter exports: ${exported.join(", ")}`,
      ),
      h("input", { type: "text", "aria-label": "Pattern input placeholder" }),
    ]);
  },
}).mount("#app");
