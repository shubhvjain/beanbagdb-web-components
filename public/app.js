const initPage = async (params) => {
  // 1. Check if "db" param exists, throw error if missing
  const urlParams = new URLSearchParams(params || window.location.search);
  const dbParam = urlParams.get('db');
  
  if (!dbParam) {
    throw new Error('Required "db" parameter is missing from URL');
  }

  // 2. Get the bbdb-db-list array from localStorage
  const dbListJson = localStorage.getItem('bbdb-db-list');
  if (!dbListJson) {
    throw new Error('No databases found in localStorage "bbdb-db-list"');
  }

  const dbList = JSON.parse(dbListJson); // [{name: ""}, {}]

  // 3. Find matching db object by name
  const dbObj = dbList.find(db => db.name === dbParam);
  
  if (!dbObj) {
    throw new Error(`Database "${dbParam}" not found in bbdb-db-list`);
  }

  return dbObj;
};

const showMessage = (type, message) => {
  let messageEl = document.querySelector('#show-message');
  
  // Color mapping based on type
  const colors = {
    'error': '#dc3545',
    'success': '#28a745', 
    'warning': '#ffc107',
    'info': '#17a2b8'
  };
  
  const color = colors[type] || '#6c757d';
  
  if (messageEl) {
    // Replace existing content
    messageEl.innerHTML = `${message} <button onclick="this.parentElement.remove()">X</button>`;
  } else {
    // Create new div on top of body
    messageEl = document.createElement('div');
    messageEl.id = 'show-message';
    messageEl.innerHTML = `${message} <button onclick="this.parentElement.remove()">X</button>`;
    document.body.prepend(messageEl); // Adds dynamically on top of body
  }
  
  // Apply styling
  Object.assign(messageEl.style, {
    color: color,
    padding: '15px',
    margin: '1',
    boxShadow: `2px 10px 9px -5px rgba(0,0,0,0.2)`,
    background: '#f8f9fa',
    borderBottom: `4px solid ${color}`,
    //boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'relative'
  });
  
  // Style the close button
  const closeBtn = messageEl.querySelector('button');
  Object.assign(closeBtn.style, {
    float: 'right',
    border: 'none',
    background: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    fontWeight: 'bold'
  });
};
