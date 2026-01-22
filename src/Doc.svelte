<svelte:options
  customElement={{
    tag: "bbdb-doc",
  }}
/>

<script>
  import { onMount } from "svelte";
  import Editor from "./Editor.svelte";
  let {
    BBDB,
    new_doc = true,
    search_criteria,
    schema_name,
    edit_mode = "internal",
    setting_schemas = {},
  } = $props();

  let loading = $state("Loading...");

  const dispatch = (name, data) => {
    $host().dispatchEvent(
      new CustomEvent("action", {
        detail: { name, ...data },
        bubbles: true,
        composed: true,
      }),
    );
  };

  let new_doc_details = $state({
    selected_schema: "",
    schema : null,
    list: [],
    doc: null,
    doc_valid:false
  });

  onMount(async () => {
    try {
      if (!BBDB) {
        throw new Error("No instance of BBDB provided to the component");
      }
      if (new_doc) {
        if (schema_name) {
          // schema already provided
          new_doc_details.selected_schema = schema_name;
          new_doc_details.schema = await get_schema_details(schema_name)
        } else {
          // schema not provided, show a dropdown of schema to select from
          let all_schema = await BBDB.get({ type: "schema_list" });
          console.log(all_schema);
          new_doc_details.list = await BBDB.get({ type: "schema_list" });
        }
      } else {
        // search for doc with the given criteria
        if (!search_criteria) {
          throw new Error("Search criteria for doc not provided");
        }
      }

      loading = "";
      //dispatch("message", { type: "success", message: "Working!" });
    } catch (error) {
      console.error(error);
      loading = `Error loading. ${error.message}`;
      dispatch("message", { type: "error", message: loading });
    }
  });

  const get_schema_details = async (sname) =>{
    let sch  =await BBDB.get({type:"schema","criteria":{"name":sname}})
    return sch["data"]["schema"]
  }

  const load_schema_new = async (schema_name1) => {
    console.log(schema_name1)
    new_doc_details.selected_schema= "";
    new_doc_details.schema = null
    setTimeout(async () => {
      new_doc_details.selected_schema = schema_name1;
      if(new_doc_details.selected_schema){
        new_doc_details.schema = await get_schema_details(schema_name1)
      }
       
    }, 50);
  };

  const create_new_doc = async ()=> {
    console.log(new_doc_details.doc)
  }


  const reset_new_doc_creator = async () => {
    new_doc_details.selected_schema= "";
    new_doc_details.schema = null
    setTimeout(async () => {
      if(schema_name){
        new_doc_details.selected_schema = schema_name;
        new_doc_details.schema = await get_schema_details(schema_name)
      }
    }, 50);
  };

</script>

{#if loading}
  {loading}
{/if}

{#if new_doc}
  {#if schema_name}
    <h4> Create new {schema_name} doc </h4>
  {:else}
    <h4>Create new doc</h4>
  <select
    aria-label="select schema"
    onchange={(e) => {
      load_schema_new(e.target.value);
    }}
  >
    <option value="" selected>Select schema</option>
    {#each new_doc_details.list as sch}
      <option value={sch.name}>{sch.title}</option>
    {/each}
  </select>
  {/if}

  {#if new_doc_details.selected_schema}
    <Editor schema={new_doc_details.schema} bind:data={new_doc_details.doc} bind:data_valid={new_doc_details.doc_valid} ></Editor>

    {#if new_doc_details.doc_valid}
      <button onclick={()=>{create_new_doc()}}>+ Add new</button>
    {/if}
  {/if}

{:else}
  View doc 
{/if}