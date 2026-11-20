import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createOtpState,
  getOtpGroupProps,
  getOtpHiddenInputProps,
  getOtpSlotProps,
  type OtpEvent,
  type OtpOptions,
  otpReducer,
  resolveOtpOptions,
} from "../../dist/index.js";

function otp(options: OtpOptions, initial = "") {
  const resolved = resolveOtpOptions(options);
  let state = createOtpState(options, initial);
  return {
    resolved,
    get state() {
      return state;
    },
    type(text: string) {
      return this.send({ type: "insert", text });
    },
    send(event: OtpEvent) {
      state = otpReducer(state, event, resolved);
      return this;
    },
  };
}

test("AC-5: paste 6 digits fills all slots and focuses the last", () => {
  const field = otp({ length: 6 });
  field.send({ type: "paste", text: "123456" });

  assert.deepEqual([...field.state.slots], ["1", "2", "3", "4", "5", "6"]);
  assert.equal(field.state.rawValue, "123456");
  assert.equal(field.state.activeIndex, 5);
  assert.equal(field.state.status, "complete");
});

test("AC-5: backspace on the filled last slot clears it, next backspace retreats", () => {
  const field = otp({ length: 6 }, "123456");

  field.send({ type: "delete", direction: "backward", unit: "char" });
  assert.equal(field.state.slots[5], "");
  assert.equal(field.state.activeIndex, 5);
  assert.equal(field.state.rawValue, "12345");
  assert.equal(field.state.status, "incomplete");

  field.send({ type: "delete", direction: "backward", unit: "char" });
  assert.equal(field.state.slots[4], "");
  assert.equal(field.state.activeIndex, 4);
});

test("AC-5: paste produces exactly one state change", () => {
  const resolved = resolveOtpOptions({ length: 6 });
  const initial = createOtpState({ length: 6 });
  const next = otpReducer(initial, { type: "paste", text: "123456" }, resolved);
  assert.notEqual(next, initial);
  assert.equal(next.rawValue, "123456");

  const again = otpReducer(next, { type: "focusSlot", index: 5 }, resolved);
  assert.equal(again, next, "focus-only change keeps the reference");
});

test("otp: insert advances; at the last slot it stays", () => {
  const field = otp({ length: 3 });
  field.type("1");
  assert.equal(field.state.activeIndex, 1);
  field.type("2");
  assert.equal(field.state.activeIndex, 2);
  field.type("3");
  assert.equal(field.state.activeIndex, 2);
  assert.equal(field.state.rawValue, "123");
});

test("otp: non-digit rejected in numeric mode", () => {
  const field = otp({ length: 4 });
  const before = field.state;
  field.type("a");
  assert.equal(field.state, before);
});

test("otp: multi-char insert into slot 0 is treated as paste (autofill)", () => {
  const field = otp({ length: 6 });
  field.type("123456");
  assert.equal(field.state.rawValue, "123456");
  assert.equal(field.state.activeIndex, 5);
});

test("otp: focusSlot past a gap lands on the first empty", () => {
  const field = otp({ length: 6 }, "123");
  field.send({ type: "focusSlot", index: 1 });
  field.send({ type: "delete", direction: "forward", unit: "char" });
  assert.deepEqual([...field.state.slots], ["1", "", "3", "", "", ""]);

  field.send({ type: "focusSlot", index: 5 });
  assert.equal(field.state.activeIndex, 1);
});

test("otp: rawValue compacts gaps; incomplete is not invalid", () => {
  const field = otp({ length: 3 }, "123");
  field.send({ type: "focusSlot", index: 1 });
  field.send({ type: "delete", direction: "forward", unit: "char" });

  assert.equal(field.state.rawValue, "13");
  assert.equal(field.state.formattedValue, "13");
  assert.equal(field.state.status, "incomplete");
  assert.equal(
    "aria-invalid" in getOtpGroupProps(field.state, field.resolved),
    false,
  );
});

test("otp: group has role group and an accessible name; slots rove tabindex", () => {
  const field = otp({ length: 6, label: "Verification code" });
  const group = getOtpGroupProps(field.state, field.resolved);
  assert.equal(group.role, "group");
  assert.equal(group["aria-label"], "Verification code");

  const first = getOtpSlotProps(field.state, field.resolved, 0);
  const second = getOtpSlotProps(field.state, field.resolved, 1);
  assert.equal(first.tabindex, 0);
  assert.equal(second.tabindex, -1);
  assert.equal(first["aria-label"], "Character 1 of 6");
});

test("otp: only slot 0 carries autocomplete and the full maxlength", () => {
  const field = otp({ length: 6 });
  const first = getOtpSlotProps(field.state, field.resolved, 0);
  const second = getOtpSlotProps(field.state, field.resolved, 1);

  assert.equal(first.autocomplete, "one-time-code");
  assert.equal(first.maxlength, 6);
  assert.equal(second.autocomplete, "off");
  assert.equal(second.maxlength, 1);
});

test("otp: hidden input carries rawValue and name", () => {
  const field = otp({ length: 4, name: "code" }, "12");
  const hidden = getOtpHiddenInputProps(field.state, field.resolved);

  assert.equal(hidden.type, "hidden");
  assert.equal(hidden.name, "code");
  assert.equal(hidden.value, "12");
});

test("otp: focus events are idempotent and reference-stable", () => {
  const field = otp({ length: 4 });
  const before = field.state;

  field.send({ type: "focusSlot", index: 0 });
  assert.equal(field.state, before);

  field.send({ type: "focus" });
  const focused = field.state;
  assert.equal(focused.focused, true);

  field.send({ type: "focus" });
  assert.equal(field.state, focused);
});

test("otp: composition commits once, multi-char result behaves as paste", () => {
  const field = otp({ length: 6 });
  field.send({ type: "composeStart" });
  field.send({ type: "composeUpdate", text: "1234" });
  assert.equal(field.state.rawValue, "");

  field.type("9");
  assert.equal(field.state.rawValue, "");

  field.send({ type: "composeEnd", text: "1234" });
  assert.equal(field.state.rawValue, "1234");
  assert.equal(field.state.composing, null);
});

test("otp: alphanumeric type applies the upper transform", () => {
  const field = otp({ length: 4, type: "alphanumeric", transform: "upper" });
  field.type("ab");
  assert.equal(field.state.rawValue, "AB");
});

test("NFR-3: 1000 reduces on a 20-slot OTP stay under 1 ms each", () => {
  const resolved = resolveOtpOptions({ length: 20 });
  let state = createOtpState({ length: 20 });

  const start = performance.now();
  for (let index = 0; index < 1000; index += 1) {
    state = otpReducer(
      state,
      { type: "insert", text: String(index % 10) },
      resolved,
    );
  }
  const elapsed = performance.now() - start;

  assert.ok(
    elapsed / 1000 < 1,
    `average reduce took ${(elapsed / 1000).toFixed(3)} ms`,
  );
});

test("otp: composeEnd rejects a character the slot type does not accept", () => {
  const field = otp({ length: 4 });
  field.send({ type: "composeStart" });
  field.send({ type: "composeUpdate", text: "a" });
  field.send({ type: "composeEnd", text: "a" });

  assert.equal(field.state.rawValue, "");
  assert.equal(field.state.composing, null);
});

test("otp: oversized paste payloads are bounded", () => {
  const field = otp({ length: 6 });
  field.send({ type: "paste", text: `${"x".repeat(100_000)}123456` });

  assert.equal(field.state.rawValue, "");
});

test("otp: getSlotProps rejects an out-of-range slot index", () => {
  const options = { length: 4 };
  const resolved = resolveOtpOptions(options);
  const state = createOtpState(options);

  assert.throws(() => getOtpSlotProps(state, resolved, 4));
  assert.throws(() => getOtpSlotProps(state, resolved, -1));
  assert.throws(() => getOtpSlotProps(state, resolved, 1.5));
});
