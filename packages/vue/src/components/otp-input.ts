import { defineComponent, h, type PropType, type VNodeProps } from "vue";
import { useOtpInput } from "../composables/use-otp-input.js";

export const OtpInput = defineComponent({
  name: "PatternInputOtp",
  props: {
    length: { type: Number, required: true },
    modelValue: { type: String as PropType<string>, default: undefined },
    options: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
    groupProps: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
    slotProps: {
      type: Object as PropType<Record<string, Record<string, unknown>>>,
      default: () => ({}),
    },
  },
  emits: ["update:modelValue", "change"],
  setup(props, { emit, attrs }) {
    const field = useOtpInput(() => ({
      ...props.options,
      length: props.length,
      ...(props.modelValue !== undefined ? { value: props.modelValue } : {}),
      onValueChange: (change: { value: string }) => {
        emit("update:modelValue", change.value);
        emit("change", change);
      },
    }));

    return () =>
      h(
        "div",
        {
          ...field.getGroupProps(),
          ...props.groupProps,
          ...attrs,
          ref: field.groupRef,
        } as unknown as VNodeProps,
        [
          ...Array.from({ length: props.length }, (_, index) =>
            h("input", {
              ...field.getSlotProps(index),
              ...(props.slotProps[index] ?? {}),
              ref: field.slotRef(index),
            } as unknown as VNodeProps),
          ),
          h("input", field.getHiddenInputProps()),
        ],
      );
  },
});
