<!-- <svelte:options customElement="test-one"/> -->
<svelte:options
	customElement={{
		tag: 'test-one'
	}}
/>
<script>
  import { onMount } from "svelte";
  let {a=$bindable(0),b=$bindable(0)} = $props()
  let total = $state(0)
  onMount(()=>{
    console.log(a,b)
  })
  
  export const getSum = ()=>{
    total = a+b
  }
</script>

This is the test component 
<p>a = {a} </p>
<p>b = {b} </p>
<p>sum = {total}</p>