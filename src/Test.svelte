<svelte:options
  customElement={{
    tag: 'test-one'
  }}
/>
<script>
  let { a = 0, b = 0 } = $props();
  let total = $derived(Number(a) + Number(b));
</script>


<p>a = {a}</p>
<p>b = {b}</p>
<p>sum = {total}</p>