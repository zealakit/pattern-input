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
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
  NumberInput,
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

function otpSlots(root: Element): HTMLInputElement[] {
  return Array.from(
    root.querySelectorAll<HTMLInputElement>('input:not([type="hidden"])'),
  );
}

/** A 3 + 3 grouping with a separator between, like `<InputOTP.Group>` markup. */
function groupedSlots() {
  const slot = (index: number) => h(InputOTPSlot, { index, key: index });
  return () => [
    h(InputOTPGroup, { "data-group": "a" }, () => [0, 1, 2].map(slot)),
    h(InputOTPSeparator, { "data-testid": "sep" }, () => "-"),
    h(InputOTPGroup, { "data-group": "b" }, () => [3, 4, 5].map(slot)),
  ];
}

function mountOtp(props: Record<string, unknown> = {}) {
  return mount(InputOTP, {
    props: { maxLength: 6, label: "Code", ...props },
    slots: { default: groupedSlots() },
    attachTo: document.body,
  });
}

test("vue: InputOTP paste fills grouped slots and focuses the last", () => {
  const wrapper = mountOtp();
  const slots = otpSlots(wrapper.element);
  assert.equal(slots.length, 6);

  slots[0].focus();
  paste(slots[0], "123456");

  assert.equal(document.activeElement, slots[5]);
  assert.deepEqual(
    slots.map((slot) => slot.value),
    ["1", "2", "3", "4", "5", "6"],
  );
  wrapper.unmount();
});

test("vue: InputOTP exposes one accessible group and a decorative separator", () => {
  const wrapper = mountOtp({ name: "code", class: "root" });

  const root = wrapper.element as HTMLElement;
  assert.equal(root.getAttribute("role"), "group");
  assert.equal(
    root.querySelectorAll('[role="group"]').length,
    0,
    "InputOTPGroup adds no second group",
  );
  assert.equal(root.getAttribute("aria-label"), "Code");
  assert.ok(root.classList.contains("root"), "attrs fall through");

  const separator = root.querySelector('[data-testid="sep"]');
  assert.equal(separator?.getAttribute("aria-hidden"), "true");
  assert.equal(separator?.getAttribute("role"), null);
  assert.equal(
    root.querySelector<HTMLInputElement>('input[type="hidden"]')?.name,
    "code",
  );
  wrapper.unmount();
});

test("vue: InputOTP v-model approval fills, rejection never renders", async () => {
  const wrapper = mountOtp({
    modelValue: "",
    "onUpdate:modelValue": (value: string) => {
      if (value !== "999999") {
        void wrapper.setProps({ modelValue: value });
      }
    },
  });
  const slots = otpSlots(wrapper.element);
  slots[0].focus();

  paste(slots[0], "999999");
  await nextTick();
  assert.deepEqual(
    slots.map((slot) => slot.value),
    ["", "", "", "", "", ""],
  );

  paste(slots[0], "123456");
  await nextTick();
  assert.equal(slots[5].value, "6");
  assert.equal(
    (wrapper.element as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="hidden"]',
    )?.value,
    "123456",
  );
  wrapper.unmount();
});

test("vue: InputOTP tolerates a missing slot index (sparse layout)", () => {
  const wrapper = mount(InputOTP, {
    props: { maxLength: 4 },
    slots: {
      default: () =>
        [0, 1, 3].map((index) => h(InputOTPSlot, { index, key: index })),
    },
    attachTo: document.body,
  });
  const slots = otpSlots(wrapper.element);
  assert.equal(slots.length, 3);
  slots[0].focus();
  paste(slots[0], "1234");
  assert.equal(slots[2].value, "4");
  wrapper.unmount();
});

test("vue: InputOTPSlot outside InputOTP throws a helpful error", () => {
  assert.throws(
    () => mount(InputOTPSlot, { props: { index: 0 } }),
    /must be rendered inside <InputOTP>/,
  );
});

test("vue: InputOTPSlot with an out-of-range index throws", () => {
  assert.throws(
    () =>
      mount(InputOTP, {
        props: { maxLength: 2 },
        slots: { default: () => h(InputOTPSlot, { index: 2 }) },
      }),
    /slot index/,
  );
});

test("vue: InputOTP.Group, Slot and Separator are available on the root", () => {
  assert.equal(InputOTP.Group, InputOTPGroup);
  assert.equal(InputOTP.Slot, InputOTPSlot);
  assert.equal(InputOTP.Separator, InputOTPSeparator);
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
