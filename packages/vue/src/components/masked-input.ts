import { defineComponent, h, type PropType } from "vue";
import { isBrowser } from "@zealakit/pattern-input-core/dom";
import {
  useMaskedInput,
  type MaskedInputOptions,
} from "../composables/use-masked-input.js";

export const MaskedInput = defineComponent({
  name: "PatternInputMasked",
  props: {
    modelValue: { type: String as PropType<string>, default: undefined },
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
    const field = useMaskedInput(
      () =>
        ({
          ...(props.options as object),
          ...(props.modelValue !== undefined
            ? { value: props.modelValue }
            : {}),
          onValueChange: (change: { value: string }) => {
            emit("update:modelValue", change.value);
            emit("change", change);
          },
        }) as unknown as MaskedInputOptions,
    );

    return () => {
      const inputProps: Record<string, unknown> = field.getInputProps({
        ...attrs,
        ...props.inputProps,
        ref: field.inputRef,
      });
      if (!isBrowser()) {
        inputProps.value = field.formattedValue();
      }
      return h("input", inputProps);
    };
  },
});
