<!--  -->
<script>
  import { onMount } from "svelte";
  import { JSONEditor } from "@json-editor/json-editor";
  import SchemaEditor from "./custom/Schema.svelte";
  import SystemEdgeEditor from "./custom/SystemEdge.svelte";

  let {
    schema = $bindable(),
    schema_name = $bindable(),
    data = $bindable(),
    data_valid = $bindable(),
    editor_options = {},
    mode = "new",
  } = $props();

  const default_schema = {
    schema: {
      new: true,
      edit: true,
      customEditor: true,
    },
    system_setting: {
      new: true,
      edit: true,
      property_modifications:{
        "value":{
          type:"object",
          default:{}
        }
      }
    },
    system_key: {
      new: true,
      edit: true,
    },
    system_edge_constraint: {
      new: true,
      edit: true,
      customEditor: true,
    },
    system_edge: {
      new: true,
      edit: true,
      customEditor: true,
      
    },
    system_media: {
      new: true,
      edit: true,
      
    },
    system_log: {
      new: false,
      edit: false,
    },
    system_script: {
      new: true,
      edit: true,
      customEditor: true,
      property_modifications:{
        script:{
         format: "textarea", 
        },
        usage:{
         format: "textarea", 
        }
      }
    },
    system_text: {
      new: true,
      edit: true,
      property_modifications: {
        text: {
          format: "textarea",
          default:"Text..."
        },
      },
    },
  };

  let container_element = $state(null);
  let theEditor = $state(null);
  let dataError = $state(null);

  let loaded = $state(false);
  let loading_error = $state("Loading");

  let default_options = {
    theme: "barebones",
    titleHidden: false,
    form_name_root:"",
    disable_collapse: true,
    disable_edit_json: false,
    disable_properties: true,
    use_default_values: true,
    disable_array_delete_last_row: true,
    disable_array_reorder: true,
    array_controls_top: false,
    expand_height: true,
  };

  let schema_editor = $state({
    new: true,
    edit: true,
    customEditor: false,
    property_modifications: {},
  });

  const load_editor = () => {
    theEditor = null;
    if (container_element) {
      if (!schema) {
        throw new Error("No schema provided");
      }
      if (default_schema[schema_name]) {
        console.log("should update");
        schema_editor = default_schema[schema_name];
      }

      console.log(schema_editor)

      if (!schema_editor[mode]) {
        loading_error = `Editing ${schema_name} in ${mode} mode is not supported`;
        loaded = false;
        data_valid = false;
        throw new Error("Can not be loaded");
      }

      let final_schema = {...schema}

      if(schema_editor?.property_modifications){
        Object.keys(schema_editor.property_modifications).map(itm=>{
          final_schema["properties"][itm] = {...final_schema["properties"][itm],...schema_editor.property_modifications[itm]}
        })
      }
      const editorOptions = {
        ...default_options,
        ...editor_options,
        schema: final_schema,
      };

      //console.log(editorOptions)
      theEditor = new JSONEditor(container_element, editorOptions); // Pass element directly      
      theEditor.on("ready", () => {
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
    loaded = true;    
    setTimeout(load_editor, 50);
  });
</script>
<!-- JSONEditor.svelte -->
{#if loaded}
  <div id="editor-json" bind:this={container_element}></div>
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
    <!-- Data is valid -->
  {/if}
{:else}
<p>  {loading_error}</p>

{/if}

<style>
  :global(#editor-json .row .form-control) {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  :global(#editor-json .form-control label) {
    order: -1;  /* Label first */
    margin-bottom: 0;
    font-size: 15px !important;
  }

  :global(#editor-json .form-control input,
          :global(#editor-json .form-control textarea)) {
    width: 100% !important;
    flex: 1;
    box-sizing: border-box;
    font-size: 20px !important;
  }

    /* Broader target with higher specificity */
  :global(#editor-json input),
  :global(#editor-json textarea),
  :global(#editor-json .form-control input),
  :global(#editor-json .form-control textarea) {
    width: 100% !important;
    flex: 1 !important;
    box-sizing: border-box !important;
    font-size: 20px !important;
    font-family: inherit !important;
  }

  /* Override inline styles if present */
  :global(#editor-json input) {
    min-height: 40px !important;
    padding: 8px 12px !important;
    background: transparent !important;
    background-color: transparent !important;
    border: 1px solid #cccccc4f !important;
  }

  :global(#editor-json textarea[data-schemaformat="textarea"]) {
    min-height: 300px !important;
    padding: 8px 12px !important;
    background: transparent !important;
    background-color: transparent !important;
    border: 1px solid #cccccc4f !important;
  }

    /* Single/multiple select dropdowns */
  :global(#editor-json select) {
    width: 100% !important;
    font-size: 20px !important;
    padding: 12px !important;
    background: transparent !important;
    border: 1px solid #cccccc4f !important;
    min-height: 48px !important;
  }

    /* Checkbox inputs */
  :global(#editor-json input[type="checkbox"]) {
    width: 20px !important;
    height: 20px !important;
    margin-right: 8px !important;
    accent-color: #007bff;  /* Custom check color */
    background: #fff !important;
  }

  :global(#editor-json label:has(input[type="checkbox"])) {
    font-size: 18px !important;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

    /* Multi-checkbox combo */
  :global(#editor-json .je-array-controls) {
    background: transparent;
  }

  /* Full combo integration */
  :global(#editor-json input,
          :global(#editor-json textarea)) {
    font-size: 20px !important;
    background: transparent !important;
    border: 1px solid #cccccc4f !important;
  }

  /* Generic selects inside editor */
  :global(#editor-json select) {
    width: 100% !important;
    font-size: 20px !important;
    padding: 8px 12px !important;
    background: transparent !important;
    border: 1px solid #cccccc4f !important;
    box-sizing: border-box !important;
  }

  /* Type switcher: small, unstyled, inline with label */
  :global(#editor-json select.je-switcher) {
    width: auto !important;
    font-size: inherit !important;
    padding: initial !important;
    margin-left: 0.5rem !important;
    background: initial !important;
    border: initial !important;
    box-sizing: content-box !important;
    display: inline-block !important;
    vertical-align: baseline !important;
  }

  /* Ensure the <b> label and switcher are on one line */
  :global(#editor-json [data-schemapath="root.type"] > b) {
    display: inline-block;
    margin-right: 0.25rem;
  }
</style>


