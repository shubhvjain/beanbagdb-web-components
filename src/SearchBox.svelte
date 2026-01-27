<script>
  let { BBDB , selected=$bindable(null) } = $props(); // Your PouchDB/RxDB collection with .find({selector})

  let query = $state('');
  let results = $state([]);
  //let selected = $state(null); // Full selected doc
  let loading = $state(false);



  // Text to Mango query parser
// Updated textToMangoQuery function only
function textToMangoQuery(text) {
  if (!text.trim()) return null;

  const terms = text.trim().split(/\s+/);
  const selectorParts = [];

  const mappings = {
    title: 'meta.title',
    tag: 'meta.tags',
    link: 'meta.link',
    id: '_id'
  };

  for (const term of terms) {
    const colonIdx = term.indexOf('.');
    if (colonIdx === -1) continue;

    const key = term.slice(0, colonIdx).trim().toLowerCase();
    const value = term.slice(colonIdx + 1).trim();

    if (!value) continue;

    let mangoPart;
    if (key === 'tag') {
      mangoPart = { [mappings.tag]: { $in: [value] } }; // $in works everywhere
    } else if (key === 'id') {
      mangoPart = { [mappings.id]: { $eq: value } };
    } else {
      const path = mappings[key] || `data.${key}`;
      // Erlang-compatible case-insensitive regex: (?i) prefix [web:50]
      const regexPattern = `(?i)^.*${escapeRegex(value)}.*$`;
      mangoPart = { [path]: { $regex: regexPattern } };
    }
    selectorParts.push(mangoPart);
  }

  return selectorParts.length > 0 ? { $and: selectorParts } : null;
}

// Updated escapeRegex (Erlang-safe)
function escapeRegex(str) {
  return str.replace(/[.*+?()^{}$|[\]\\]/g, '\\$&'); // No ^$ escape needed for pattern
}



  // Debounced search
  function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  const performSearch = debounce(async (searchQuery) => {
    loading = true;
    try {
      const selector = textToMangoQuery(searchQuery);
      if (!selector) {
        results = [];
        return;
      }
      const res = await BBDB.search({ selector, fields:["meta","_id"] }); // Adjust params as per BBDB API
      console.log(res)
      results = res.docs; // Assume returns array directly; adjust if {docs: [...]}
    } catch (err) {
      console.error('Search error:', err);
      results = [];
    } finally {
      loading = false;
    }
  }, 300);


  $effect(() => {
    performSearch(query);
  });

  function selectItem(item) {
    selected = item._id;
    console.log(selected)
  }




</script>

<!-- Single Rectangle: Input on Top, Results Below -->
<div class="search-box">
  <!-- Input -->
  <input 
    type="text" 
    bind:value={query}
    placeholder="e.g. title.foo tag.bar"
    class="search-input"
  />
  
  {#if loading}
    <div class="loading">Searching...</div>
  {/if}

  <!-- Results Below Input -->
  <div class="results-container">
    {#if results.length === 0 && !loading && query.trim()}
      <div class="no-results">No results</div>
    {:else}
      {#each results.slice(0, 8) as item (item._id)}
        <div 
          class="result-item"
          class:selected={selected === item._id}
          on:click={() => selectItem(item)}
        >
          <div class="item-title">{item.meta?.title || 'No title'}</div>
          <div class="item-id">{item._id}</div>
        </div>
      {/each}
    {/if}
  </div>
</div>



<style>
  .search-box {
    /* border: 1px solid #ccc; */
    /* border-radius: 4px; */
    width: inherit;
    max-height: 300px;
    overflow: hidden;
  }

  .search-input {
    width: 100%;
    padding: 5px;
    border: none;
    /* border-bottom: 1px solid #eee; */
    font-size: 14px;
    box-sizing: border-box;
  }

  .search-input:focus {
    outline: none;
  }

  .results-container {
    max-height: 220px;
    overflow-y: auto;
  }

  .result-item {
    padding: 12px;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
  }

  .result-item:hover {
    background: #f9f9f9;
  }

  .result-item.selected {
    background: #f0f0f0;
  }

  .item-title {
    font-size: 14px;
    margin-bottom: 4px;
  }

  .item-id {
    font-size: 12px;
    color: #666;
    font-family: monospace;
  }

  .loading,
  .no-results {
    padding: 20px 12px;
    text-align: center;
    color: #999;
    font-style: italic;
  }

  .selected {
    margin-top: 12px;
    padding: 8px;
    border: 1px solid #ddd;
    /* border-radius: 4px; */
    font-family: monospace;
  }
</style>