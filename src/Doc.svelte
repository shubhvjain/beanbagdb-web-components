<svelte:options
  customElement={{
    tag: "bbdb-doc",
  }}
/>

<script>
  import { onMount } from "svelte";
  import Editor from "./Editor.svelte";
  import TagsEditor from "./custom/TagsEditor.svelte";
  import Mustache from "mustache";

  let {
    BBDB,
    new_doc = true,
    search_criteria,
    schema_name,
    mode = "view",
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

  const default_views = {
    system_text: {
      engine: "mustache",
      format: "html",
      template: `{{doc.data.text}}`,
      description: "HTML",
    },
    system_media: {
      engine: "mustache",
      format: "html",
      template: `<img src="{{doc.data.imageBase64}}" alt="Document image" /><p>{{doc.data.caption}}</p> `,
      description: "HTML",
    },
  };

  let new_doc_details = $state({
    selected_schema: "",
    schema: null,
    list: [],
    doc: null,
    doc_valid: false,
  });

  let record = $state({
    doc: {},
    schema: {},
    data_valid: true,
  });

  let view_obj = $state("");
  let flags = $state({
    edit_title: false,
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
          new_doc_details.schema = await get_schema_details(schema_name);
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
        let modes = ["view", "edit"];
        if (!modes.includes(mode)) {
          throw new Error("Invalid mode");
        }
        await load_view_doc();
      }

      loading = "";
      //dispatch("message", { type: "success", message: "Working!" });
    } catch (error) {
      console.error(error);
      loading = `Error loading. ${error.message}`;
      dispatch("message", { type: "error", message: loading });
    }
  });

  const get_schema_details = async (sname) => {
    let sch = await BBDB.get({ type: "schema", criteria: { name: sname } });
    return sch["data"]["schema"];
  };

  const load_schema_new = async (schema_name1) => {
    console.log(schema_name1);
    new_doc_details.selected_schema = "";
    new_doc_details.schema = null;
    new_doc_details.doc = {};
    setTimeout(async () => {
      new_doc_details.selected_schema = schema_name1;
      if (new_doc_details.selected_schema) {
        new_doc_details.schema = await get_schema_details(schema_name1);
      }
    }, 50);
  };

  const create_new_doc = async () => {
    // console.log(new_doc_details.doc);
    try {
      let new_doc = await BBDB.create({
        schema: new_doc_details.selected_schema,
        data: new_doc_details.doc,
        meta: {},
      });
      // console.log(new_doc)
      dispatch("message_link", {
        type: "success",
        message: "Document added.",
        link: `${BBDB.meta.database_name}.link.${new_doc.meta.link}`,
      });
    } catch (error) {
      console.log(error);
      dispatch("message", { type: "error", message: `${error.message}` });
    }
  };

  const load_view_doc = async () => {
    try {
      let docsearch = await BBDB.read({
        ...search_criteria,
        include_schema: true,
      });
      //console.log(docsearch);
      record = docsearch;
      console.log(record);
      
      // select_edit
      render_view();
    } catch (error) {
      console.log(error);
      dispatch("message", { type: "error", message: `${error.message}` });
    }
  };

  const reset_new_doc_creator = async () => {
    new_doc_details.selected_schema = "";
    new_doc_details.schema = null;
    setTimeout(async () => {
      if (schema_name) {
        new_doc_details.selected_schema = schema_name;
        new_doc_details.schema = await get_schema_details(schema_name);
      }
    }, 50);
  };

  const render_view = () => {
    view_obj = " "
    let schema_name = record.doc.schema;
    if (default_views[schema_name]) {
      view_obj = Mustache.render(default_views[schema_name].template, record);
      console.log(view_obj);
    } else {
    }
  };

  let isUpdating = $state(false);
  const save_data = async (key) => {
    if (isUpdating) {
      throw new Error("Update already in progress");
    }
    isUpdating = true;
    try {
      // the updates are in the records
      let updates = {};
      let search_criteria = { _id: record.doc._id };
      if (key == "title") {
        updates = { meta: { title: record.doc.meta.title } };
      } else if (key == "tags") {
        updates = { meta: { tags: record.doc.meta.tags } };
      } else if (key == "data") {
        updates = { data: record.doc.data };
      }
      console.log(updates);
      let update = await BBDB.update({
        criteria: search_criteria,
        updates: updates,
      });
      console.log(update);
    } catch (error) {
      console.log(error);
    } finally {
      isUpdating = false;
    }
  };

  const save_on_enter = async (event, key, call_after) => {
    if (event.key === "Enter" && event.target.value.trim()) {
      await save_data(key);
      if (call_after) {
        call_after();
      }
    }
  };
  const on_save_tags = async () => {
    await save_data("tags");
  };

  const to_format = (value, type) => {
    if (type === "unix_date") {
      const date = new Date(Number(value) * 1000);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleString(); // "1/25/2026, 10:31:23 PM" (user's locale)
    }
    return value; // Fallback
  };

  const edit_doc = () => {
    if (mode == "edit") {
      return;
    }
    mode = "edit";
  };

  const view_mode = () => {
    if (mode == "view") {
      return;
    }
    
    render_view()
    mode = "view";
  };

  const on_save_button = async () => {
    await save_data("data");
  };
</script>

{#if loading}
  {loading}
{:else if new_doc}
  {#if schema_name}
    <h4>Create new {schema_name} doc</h4>
  {:else}
    <h4>Create new doc</h4>
    <select
      class="dd"
      aria-label="select schema"
      style="margin-bottom: 10px;"
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
    <Editor
      bind:schema={new_doc_details.schema}
      bind:schema_name={new_doc_details.selected_schema}
      bind:data={new_doc_details.doc}
      bind:data_valid={new_doc_details.doc_valid}
      mode="new"
    ></Editor>
    {#if new_doc_details.doc_valid}
      <button
        class="submit-btn"
        style="margin-top: 10px;"
        onclick={() => {
          create_new_doc();
        }}>+ Add new</button
      >
      <pre>{JSON.stringify(new_doc_details.doc, null, 2)}</pre>
    {/if}
  {/if}
{:else}
  <div style="padding: 5px;">
    {#if flags.edit_title}
      <input
        bind:value={record.doc.meta.title}
        class="title-input"
        onkeydown={(event) => {
          save_on_enter(event, "title", () => {
            flags.edit_title = !flags.edit_title;
          });
        }}
      />
      <div class="edit-buttons">
        <button
          onclick={() => {
            save_data("title");
          }}>Save</button
        >
        <button
          onclick={() => {
            flags.edit_title = !flags.edit_title;
          }}>Cancel</button
        >
      </div>
    {:else}
      <h1
        class="title"
        ondblclick={() => {
          flags.edit_title = true;
        }}
      >
        {record.doc.meta.title}
        <button
          title="Edit title"
          onclick={() => {
            flags.edit_title = !flags.edit_title;
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            fill="currentColor"
            class="bi bi-pencil"
            viewBox="0 0 16 16"
          >
            <path
              d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"
            />
          </svg>
        </button>
      </h1>
    {/if}
  </div>

  <details>
    <summary>Meta</summary>

    <table class="resp-table">
      <tbody>
        <tr>
          <td
            >Created On : {to_format(record.doc.meta.created_on, "unix_date")}
          </td>
          <td>
            Updated On: {to_format(record.doc.meta.updated_on, "unix_date")}
          </td>
        </tr>
      </tbody>
    </table>

    <TagsEditor
      bind:tags={record.doc.meta.tags}
      saveTags={() => {
        on_save_tags();
      }}
    />
  </details>
  <details>
    <summary>Actions</summary>
  </details>
  
  <details open>
    <summary
      >Doc
      {#if mode == "view"}
        <button title="Edit doc" onclick={() => edit_doc()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            fill="currentColor"
            class="bi bi-pencil"
            viewBox="0 0 16 16"
          >
            <path
              d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"
            />
          </svg></button
        >
      {:else if mode == "edit"}
        <button title="Save docs" onclick={() => on_save_button()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            fill="currentColor"
            class="bi bi-floppy2"
            viewBox="0 0 16 16"
          >
            <path
              d="M1.5 0h11.586a1.5 1.5 0 0 1 1.06.44l1.415 1.414A1.5 1.5 0 0 1 16 2.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13A1.5 1.5 0 0 1 1.5 0M1 1.5v13a.5.5 0 0 0 .5.5H2v-4.5A1.5 1.5 0 0 1 3.5 9h9a1.5 1.5 0 0 1 1.5 1.5V15h.5a.5.5 0 0 0 .5-.5V2.914a.5.5 0 0 0-.146-.353l-1.415-1.415A.5.5 0 0 0 13.086 1H13v3.5A1.5 1.5 0 0 1 11.5 6h-7A1.5 1.5 0 0 1 3 4.5V1H1.5a.5.5 0 0 0-.5.5m9.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5z"
            />
          </svg>
        </button>
        <button title="Close edit mode" onclick={() => view_mode()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            fill="currentColor"
            class="bi bi-x"
            viewBox="0 0 16 16"
          >
            <path
              d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
            />
          </svg>
        </button>
      {/if}
    </summary>
    {#if mode == "view"}
      <div>{@html view_obj}</div>
    {:else if mode == "edit"}
      <Editor
        bind:schema={record.schema}
        bind:schema_name={record.doc.schema.schema}
        bind:data={record.doc.data}
        bind:data_valid={record.doc_valid}
        mode="edit"
      />
    {/if}
  </details>
{/if}

<style>
  .submit-btn {
    padding: 7px;
    font-size: 14px;
    margin-top: 4px;
  }
  .dd {
    font-size: 14px;
    padding: 7px;
  }

  .header {
    padding-bottom: 10px;
    margin-top: 5px;
  }

  .title {
    margin: 0;
    flex: 1;
  }

  .title-input {
    flex: 1;
    margin: 0;
    font-size: 1.7em; /* Match h1 size */
    width: 90%;
  }

  .resp-table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
  }

  .resp-table th,
  .resp-table td {
    /* border: 1px solid #ddd; */
    padding: 0.75rem;
    text-align: left;
  }

  .resp-table th {
    background-color: #f8f8f8;
    font-weight: bold;
  }

  .resp-table tr:nth-child(even) {
    /* background-color: #f9f9f9; */
  }

  @media screen and (max-width: 600px) {
    .resp-table thead {
      position: absolute;
      clip: rect(0 0 0 0);
      height: 1px;
      margin: -1px;
      overflow: hidden;
      padding: 0;
      width: 1px;
    }

    .resp-table tr {
      border-bottom: 3px solid #ddd;
      display: block;
      margin-bottom: 0.625rem;
    }

    .resp-table td {
      /* border-bottom: 1px solid #ddd; */
      display: block;
      text-align: right;
    }

    .resp-table td::before {
      content: attr(data-label) ": ";
      float: left;
      font-weight: bold;
      text-transform: uppercase;
    }

    .resp-table td:last-child {
      border-bottom: 0;
    }
  }

  /* details[open] summary ~ * {
    animation: open 0.3s ease-in-out;
  } */

  /* @keyframes open {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  } */
  details summary::-webkit-details-marker {
    display: none;
  }

  details summary {
    width: 100%;
    padding: 0.5rem 0;
    border-top: 1px solid #cccccc4f;
    position: relative;
    cursor: pointer;
    font-size: 1.25rem;
    font-weight: 300;
    list-style: none;
  }

  details summary:after {
    content: "+";
    color: #cccccc4f;
    position: absolute;
    font-size: 1.75rem;
    line-height: 0;
    margin-top: 0.75rem;
    right: 0;
    font-weight: 200;
    transform-origin: center;
    transition: 200ms linear;
  }
  details[open] summary:after {
    transform: rotate(45deg);
    font-size: 2rem;
  }
  details summary {
    outline: 0;
  }
  details p {
    font-size: 0.95rem;
    margin: 0 0 1rem;
    padding-top: 1rem;
  }
</style>
