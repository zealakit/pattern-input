<script lang="ts">
import type { Snippet } from "svelte";

type Props = { children?: Snippet; [key: string]: unknown };

let { children, ...rest }: Props = $props();
</script>

<!-- Visual grouping of slots; adds no accessibility semantics of its own. -->
<div {...rest}>
  {@render children?.()}
</div>
