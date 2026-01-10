<!-- JSONEditor.svelte -->
<script>
  import { onMount } from "svelte";
  import { JSONEditor } from "@json-editor/json-editor";

  let {
    schema,
    data = $bindable(),
    data_valid = $bindable(),
    editor_options = {},
  } = $props();

  let container_element = $state(null);
  let theEditor = $state(null);
  let dataError = $state(null);

  let default_options = {
    theme: "html",
    titleHidden: true,
    disable_collapse: true,
    disable_edit_json: false,
    disable_properties: true,
    use_default_values: true,
    disable_array_delete_last_row: true,
    disable_array_reorder: true,
    array_controls_top: false,
    expand_height: true,
  };
  const load_editor = () => {
    if (container_element) {
      const editorOptions = {
        ...default_options,
        ...editor_options,
        schema: schema,
      };
      theEditor = new JSONEditor(container_element, editorOptions); // Pass element directly
      // console.log('Editor loaded:', theEditor);

      theEditor.on("ready", () => {
        // Now the api methods will be available
        //theEditor.validate();
        if (data) {
          theEditor.setValue(data);
        }
      });
      theEditor.on("change", () => {
        const errors = theEditor.validate();
        console.log(errors);
        data_valid = errors.length === 0;
        if (data_valid) {
          data = theEditor.getValue(); // Two-way binding
          dataError = null;
        } else {
          dataError = errors;
        }
      });
    } else {
      console.error("Container element still null");
    }
  };

  onMount(async () => {
    setTimeout(load_editor, 100);
  });

  // $effect(() => {
  //   if (theEditor && data !== undefined) {
  //     theEditor.setValue(data);
  //   }
  // });
</script>
<div class="editor-json" bind:this={container_element}></div>
{#if !data_valid}
  <div class="data-error">
    Errors :
    <ul>
      {#each dataError as d}
        <li>{d["path"]}:{d["property"]}:{d["message"]}</li>
      {/each}
    </ul>
  </div>
{:else}
  Data is valid
{/if}

<style>
  .data-error{
    color: coral;
  }
</style>