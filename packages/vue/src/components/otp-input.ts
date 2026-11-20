import { isBrowser } from "@zealakit/pattern-input-core/dom";
import {
  defineComponent,
  h,
  inject,
  type InjectionKey,
  type PropType,
  provide,
  type VNodeRef,
} from "vue";
import {
  type OtpInputOptions,
  useOtpInput,
} from "../composables/use-otp-input.js";

type OtpField = ReturnType<typeof useOtpInput>;

const OTP_FIELD: InjectionKey<OtpField> = Symbol("pattern-input-otp");

const InputOTPRoot = defineComponent({
  name: "InputOTP",
  // Behavior attributes (role, aria-*) must win over fallthrough attrs.
  inheritAttrs: false,
  props: {
    /** Number of slots; render one `InputOTPSlot` per index `0..maxLength-1`. */
    maxLength: { type: Number, required: true },
    modelValue: { type: String, default: undefined },
    defaultValue: { type: String, default: undefined },
    type: {
      type: String as PropType<"numeric" | "alphanumeric">,
      default: undefined,
    },
    transform: {
      type: String as PropType<"upper" | "lower">,
      default: undefined,
    },
    autocomplete: {
      type: String as PropType<"one-time-code" | "off">,
      default: undefined,
    },
    name: { type: String, default: undefined },
    label: { type: String, default: undefined },
    labelledBy: { type: String, default: undefined },
    describedBy: { type: String, default: undefined },
    slotLabel: {
      type: Function as PropType<(index: number, length: number) => string>,
      default: undefined,
    },
    validate: {
      type: Function as PropType<
        (
          raw: string,
          ctx: { readonly status: string },
        ) => boolean | string | undefined
      >,
      default: undefined,
    },
    invalid: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
  },
  emits: ["update:modelValue", "change"],
  setup(props, { emit, attrs, slots }) {
    const field = useOtpInput(
      () =>
        ({
          length: props.maxLength,
          ...(props.modelValue !== undefined
            ? { value: props.modelValue }
            : {}),
          defaultValue: props.defaultValue,
          type: props.type,
          transform: props.transform,
          autocomplete: props.autocomplete,
          name: props.name,
          label: props.label,
          labelledBy: props.labelledBy,
          describedBy: props.describedBy,
          slotLabel: props.slotLabel,
          validate: props.validate,
          invalid: props.invalid,
          disabled: props.disabled,
          required: props.required,
          onValueChange: (change: { value: string }) => {
            emit("update:modelValue", change.value);
            emit("change", change);
          },
        }) as OtpInputOptions,
    );
    provide(OTP_FIELD, field);

    return () =>
      h(
        "div",
        {
          ...attrs,
          ...field.getGroupProps(),
          ref: field.groupRef as VNodeRef,
        },
        [
          ...(slots.default?.() ?? []),
          h("input", { ...field.getHiddenInputProps() }),
        ],
      );
  },
});

/** Visual grouping of slots; adds no accessibility semantics of its own. */
const InputOTPGroup = defineComponent({
  name: "InputOTPGroup",
  setup(_, { slots }) {
    return () => h("div", slots.default?.());
  },
});

/**
 * One character slot. The field owns the behavior attributes (`type`,
 * `inputmode`, `maxlength`, `tabindex`, `autocomplete`, `aria-label`); every
 * other attribute passes through.
 */
const InputOTPSlot = defineComponent({
  name: "InputOTPSlot",
  inheritAttrs: false,
  props: {
    /** Zero-based slot index, below the root's `maxLength`. */
    index: { type: Number, required: true },
  },
  setup(props, { attrs }) {
    const field = inject(OTP_FIELD, null);
    if (field === null) {
      throw new Error("InputOTPSlot must be rendered inside <InputOTP>.");
    }

    return () => {
      const slotProps: Record<string, unknown> = {
        ...attrs,
        ...field.getSlotProps(props.index),
        ref: field.slotRef(props.index) as VNodeRef,
      };
      // Server render shows the initial character as an attribute only; in the
      // browser the DOM binding is the sole writer of the slot value.
      if (!isBrowser()) {
        slotProps.value = field.state.value.slots[props.index] ?? "";
      }
      return h("input", slotProps);
    };
  },
});

/** Decorative divider between groups; hidden from assistive technology. */
const InputOTPSeparator = defineComponent({
  name: "InputOTPSeparator",
  setup(_, { slots }) {
    return () => h("div", { "aria-hidden": "true" }, slots.default?.());
  },
});

/**
 * Compound one-time-code field. Layout is entirely yours:
 *
 * ```vue
 * <InputOTP :max-length="6" v-model="code">
 *   <InputOTP.Group>
 *     <InputOTP.Slot :index="0" /> <InputOTP.Slot :index="1" />
 *   </InputOTP.Group>
 *   <InputOTP.Separator>-</InputOTP.Separator>
 *   <InputOTP.Group>
 *     <InputOTP.Slot :index="3" />
 *   </InputOTP.Group>
 * </InputOTP>
 * ```
 *
 * `InputOTP.Group` notation needs `<script setup>`; the parts are also
 * exported by name.
 */
export const InputOTP = Object.assign(InputOTPRoot, {
  Group: InputOTPGroup,
  Slot: InputOTPSlot,
  Separator: InputOTPSeparator,
});

export { InputOTPGroup, InputOTPSeparator, InputOTPSlot };
