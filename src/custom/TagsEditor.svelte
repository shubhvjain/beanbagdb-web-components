<script>
  
  let {tags=$bindable(),saveTags} = $props()

  function trigger_update(){
    saveTags?.()
  }
  
  function addTag(event) {
    if (event.key === 'Enter' && event.target.value.trim()) {
      const newTag = event.target.value.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        tags = [...tags, newTag];
      }
      event.target.value = '';
      trigger_update()
    }
  }
  
  function removeTag(tagToRemove) {
    tags = tags.filter(tag => tag !== tagToRemove);
    trigger_update()
  }
</script>

<div class="tags-editor">
  <div class="input-container">
    <div class="tags-list"> 
      <span style="padding: 2px;">Tags:</span>
      {#each tags as tag}
        <span class="tag">{tag} <button onclick={() => removeTag(tag)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
</svg>

        </button></span>
      {/each}
    </div>
    <input onkeydown={addTag} placeholder="add tag..." />
  </div>
</div>

<style>
  .tags-editor { 
    width: 100%;
  }
  
  .input-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    padding: 0.5em;
    /* border-bottom: 1px solid #cccccc4f; */
  }
  
  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    flex: 1;
  }
  
  .tag {
    background: #007acc;
    color: white;
    padding: 0.3em 0.6em;
    /* border-radius: 3px; */
    font-size: 12px;
  }
  
  .tag button {
    margin-left: 0.3em;
    background: none;
    border: none;
    color: inherit;
    font-size: 12px;
    cursor: pointer;
    padding: 0 0.2em;
    line-height: 1;
  }
  
  .tag button:hover { opacity: 0.7; }
  
  input {
    border: 1px solid #cccccc4f;
    padding: 0.4em;
    font-size: 12px;
    min-width: 100px;
  }
  
  input:focus {
    outline: none;
    border-color: #007acc;
  }
</style>
