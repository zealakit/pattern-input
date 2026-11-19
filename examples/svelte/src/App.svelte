<script lang="ts">
import { exported } from "./adapter-info";
</script>

<main>
  <h1>@zealakit/pattern-input-svelte</h1>
  <p>Placeholder example. Field demos land in plan 12.</p>
  <p>
    {exported.length === 0
      ? "Adapter entry resolved (no exports yet)."
      : `Adapter exports: ${exported.join(", ")}`}
  </p>
  <input type="text" aria-label="Pattern input placeholder" />
</main>
