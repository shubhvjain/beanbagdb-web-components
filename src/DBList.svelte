<svelte:options
  customElement={{
    tag: 'db-list'
  }}
/>


<script>
  import { onMount } from 'svelte';
  import Editor from './Editor.svelte';

  let { mode = 'list' } = $props();   
  // mode is list or select

  let databases = $state([]);
  let editing = $state(false);
  let editing_data_valid = $state(true)
  
  const STORAGE_KEY = 'bbdb-db-list';
  
  const schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "title": "Databases",
  "minItems": 1,
  "items": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1
      },
      "url": {
        "type": "string",
        "format": "uri",
        "minLength": 1
      },
      "encryption_key": {
        "type": "string",
        "minLength": 1
      },
      "about": {
        "type": "string",
        "minLength": 0
      }
    },
    "required": ["name", "url", "encryption_key", "about"],
    "additionalProperties": false
  },
  "uniqueItems": true
}


  onMount(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      databases = JSON.parse(raw);
    }
  });

  const save_changes = ()=>{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(databases));
    editing = false
  }

  // $effect(() => {
  //   localStorage.setItem(STORAGE_KEY, JSON.stringify(databases));
  // });

  function copyUrl(url) {
    navigator.clipboard.writeText(url);
  }
</script>

<!-- {JSON.stringify(databases)} -->
{#if editing}
  <Editor
    schema={schema}
    bind:data={databases}
    bind:data_valid={editing_data_valid}
    editor_options={{}}
  />
  <hr>
{#if editing_data_valid}
<button onclick={()=>save_changes()}>Save changes</button>  
{/if}

{:else}
<table border="1">
  <thead>
    <tr>
      <th>Name</th>
      <th>About</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each databases as db}
      <tr>
        <td>{db.name}</td>
        <td>{db.about}</td>
        <td>
          <button onclick={() => copyUrl(db.url)}>Copy URL</button>
          <button onclick={() => copyUrl(db.encryption_key)}>Copy Key</button>
        </td>
      </tr>
    {:else}
      <tr>
        <td colspan="3">No databases yet</td>
      </tr>
    {/each}
  </tbody>
</table>

<button onclick={() => editing = !editing}>
  {editing ? 'Cancel Editor mode' : 'Edit List/ Add new'}
</button>

{/if}
