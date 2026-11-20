import { defineComponent, h, type PropType } from "vue";
import { isBrowser } from "@zealakit/pattern-input-core/dom";
import { useNumberInput } from "../composables/use-number-input.js";

export const NumberInput = defineComponent({
  name: "PatternInputNumber",
  props: {
    modelValue: { type: Number as PropType<number | null>, default: undefined },
    options: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
    inputProps: {
      type: Object as PropType<Record<string, unknown>>,
      default: () => ({}),
    },
  },
  emits: ["update:modelValue", "change"],
  setup(props, { emit, attrs }) {
    const field = useNumberInput(() => ({
      ...props.options,
      ...(props.modelValue !== undefined ? { value: props.modelValue } : {}),
      onValueChange: (change: { value: number | null }) => {
        emit("update:modelValue", change.value);
        emit("change", change);
      },
    }));

    return () => {
      const inputProps: Record<string, unknown> = field.getInputProps({
        ...attrs,
        ...props.inputProps,
        ref: field.inputRef,
      });
      // Server render shows the initial formatted text as an attribute only.
      if (!isBrowser()) {
        inputProps.value = field.formattedValue();
      }
      return h("input", inputProps);
    };
  },
});
