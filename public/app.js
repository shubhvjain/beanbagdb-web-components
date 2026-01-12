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
  
  // Bootstrap 5 alert type mapping
  const alertTypes = {
    'error': 'alert-danger',
    'success': 'alert-success', 
    'warning': 'alert-warning',
    'info': 'alert-info'
  };
  
  const alertType = alertTypes[type] || 'alert-secondary';
  
  if (messageEl) {
    // Update existing alert
    messageEl.className = `alert ${alertType} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x`;
    messageEl.innerHTML = `<strong>${message}</strong> <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button>`;
  } else {
    // Create new Bootstrap alert
    messageEl = document.createElement('div');
    messageEl.id = 'show-message';
    messageEl.className = `alert ${alertType} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x`;
    messageEl.innerHTML = `<strong>${message}</strong> <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button>`;
    document.body.prepend(messageEl);
  }
  
  // Position and size styling
  Object.assign(messageEl.style, {
    zIndex: '9999',
    width: '90%',
    maxWidth: '500px',
    marginTop: '20px'
  });
};
