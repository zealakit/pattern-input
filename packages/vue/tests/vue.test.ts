import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  defineComponent,
  effectScope,
  h,
  nextTick,
  ref,
  type VNodeProps,
} from "vue";
import { mount } from "@vue/test-utils";
import {
  GETTER_NAMES,
  INSTANCE_API,
  NumberInput,
  OtpInput,
  PatternInputError,
  useNumberInput,
} from "../dist/index.js";
import type { Vector } from "./support/vector-types.ts";
import { runVectorWithVue } from "./support/run-vector-vue.ts";

function input(): HTMLInputElement {
  const element = document.createElement("input");
  document.body.append(element);
  return element;
}

function beforeInput(
  element: HTMLElement,
  inputType: string,
  data: string,
): InputEvent {
  const event = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType,
    data,
  });
  element.dispatchEvent(event);
  return event;
}

function paste(element: HTMLElement, text: string): void {
  const event = new Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as Event & {
    clipboardData: unknown;
  };
  Object.defineProperty(event, "clipboardData", {
    value: { getData: () => text, setData: () => {} },
  });
  element.dispatchEvent(event);
}

test("AC-2: composables expose GETTER_NAMES and INSTANCE_API", () => {
  let field: Record<string, unknown> = {};
  const Comp = defineComponent({
    setup() {
      const result = useNumberInput(() => ({}));
      field = result as unknown as Record<string, unknown>;
      return () =>
        h("input", { ref: result.inputRef } as unknown as VNodeProps);
    },
  });
  mount(Comp);

  assert.equal(typeof field.getInputProps, "function");
  for (const name of GETTER_NAMES.number) {
    assert.equal(typeof field[name], "function", name);
  }
  for (const name of INSTANCE_API) {
    assert.ok(name in field, `missing ${name}`);
  }
});

test("AC-7: a rejected v-model update never renders the paste", () => {
  const wrapper = mount(NumberInput, {
    props: { modelValue: 123, options: { maximumFractionDigits: 2 } },
  });
  const element = wrapper.find("input").element as HTMLInputElement;

  element.focus();
  element.setSelectionRange(0, element.value.length);
  paste(element, "999999");

  assert.equal(element.value, "123");
  assert.equal(wrapper.emitted("update:modelValue")?.length, 1);
});

test("vue: v-model approval keeps the caret", async () => {
  const value = ref(12);
  const Parent = defineComponent({
    setup() {
      return () =>
        h(NumberInput, {
          modelValue: value.value,
          options: {},
          "onUpdate:modelValue": (next: number | null) => {
            value.value = next ?? 0;
          },
        });
    },
  });

  const wrapper = mount(Parent);
  const element = wrapper.find("input").element as HTMLInputElement;
  element.focus();
  beforeInput(element, "insertText", "3");
  await nextTick();

  assert.equal(value.value, 123);
  assert.equal(element.value, "123");
  assert.equal(element.selectionStart, 3);
});

test("vue: controlled without onValueChange throws", () => {
  assert.throws(
    () => {
      const scope = effectScope();
      scope.run(() => useNumberInput(() => ({ value: 1 })));
    },
    (error: unknown) =>
      error instanceof PatternInputError &&
      error.code === "CONTROLLED_WITHOUT_HANDLER",
  );
});

test("vue: options getter change updates resolved options", async () => {
  const maximumFractionDigits = ref(2);
  const scope = effectScope();
  let field: ReturnType<typeof useNumberInput> | null = null;
  scope.run(() => {
    field = useNumberInput(() => ({
      maximumFractionDigits: maximumFractionDigits.value,
    }));
  });

  assert.equal(
    (field as unknown as ReturnType<typeof useNumberInput>).getInputProps()
      .inputmode,
    "decimal",
  );

  maximumFractionDigits.value = 0;
  await nextTick();

  assert.equal(
    (field as unknown as ReturnType<typeof useNumberInput>).getInputProps()
      .inputmode,
    "numeric",
  );
  scope.stop();
});

test("vue: scope dispose detaches listeners", () => {
  const element = input();
  const scope = effectScope();
  let field: ReturnType<typeof useNumberInput> | null = null;
  scope.run(() => {
    field = useNumberInput(() => ({}));
  });

  (field as unknown as ReturnType<typeof useNumberInput>).inputRef(element);
  const first = beforeInput(element, "insertText", "1");
  assert.equal(first.defaultPrevented, true);
  assert.equal(
    (field as unknown as ReturnType<typeof useNumberInput>).value(),
    1,
  );

  scope.stop();
  const second = beforeInput(element, "insertText", "2");
  assert.equal(second.defaultPrevented, false);
});

test("vue: OtpInput paste focuses the last slot", () => {
  const wrapper = mount(OtpInput, {
    props: { length: 6, options: {} },
    attachTo: document.body,
  });
  const slots = Array.from(
    (wrapper.element as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input:not([type="hidden"])',
    ),
  );
  assert.equal(slots.length, 6);

  slots[0].focus();
  paste(slots[0], "123456");
  assert.equal(document.activeElement, slots[5]);
});

test("vue: SSR render has no window access and renders initial value", () => {
  const packageRoot = fileURLToPath(new URL("..", import.meta.url));
  const script = `
    const { createSSRApp, h } = await import("vue");
    const { renderToString } = await import("vue/server-renderer");
    const { NumberInput } = await import("./dist/index.js");
    const app = createSSRApp({ render: () => h(NumberInput, { modelValue: 5, options: {} }) });
    const html = await renderToString(app);
    console.log(typeof window, html.includes('value="5"'));
  `;
  const output = execFileSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    { cwd: packageRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();

  assert.equal(output, "undefined true");
});

test("vectors(vue): all vectors pass through the composables", () => {
  for (const file of ["number", "masked", "otp", "controlled"] as const) {
    const vectors = JSON.parse(
      readFileSync(
        new URL(`../../core/tests/vectors/${file}.json`, import.meta.url),
        "utf8",
      ),
    ) as Vector[];
    for (const vector of vectors) {
      runVectorWithVue(vector);
    }
  }
});
