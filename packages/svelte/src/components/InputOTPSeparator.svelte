<script lang="ts">
import type { Snippet } from "svelte";

type Props = { children?: Snippet; [key: string]: unknown };

let { children, ...rest }: Props = $props();
</script>

<!-- Decorative divider between groups; hidden from assistive technology. -->
<div aria-hidden="true" {...rest}>
  {@render children?.()}
</div>
