/**
 * This method can be used in local html apps for initialization based on the params provided in the url.
 * Accepted params: db, doc
 * Each has a specific format
 * 
 * @param {*} params 
 * @returns 
 */

const initPage = async (page_name,params) => {

  const urlParams = new URLSearchParams(params || window.location.search);
  let dbParam = urlParams.get("db");
  const docParam = urlParams.get("doc");

  let parsedDocCriteria = null;
  let dbName = null;
  if (dbParam) {
    dbName = dbParam;
  } else if (docParam) {
    /**
     * the doc parameter has a fixed format db_name.identifier1.value1.identifier2.value2...
     */
    const parts = docParam.split(".");

    if (parts.length < 3 || parts.length % 2 === 0) {
      throw new Error(
        'Invalid "doc" parameter format. Expected: db_name.identifier1.value1.identifier2.value2...',
      );
    }

    dbName = parts[0];
    parsedDocCriteria = {}
    // Parse identifier-value pairs
    for (let i = 1; i < parts.length; i += 2) {
      const identifier = parts[i];
      const value = parts[i + 1];
      parsedDocCriteria[identifier] = value;
    }
  } else {
    throw new Error(
      "No identifier params provided. Either specify db (database name) or doc (dbname.id1.val1) like test1._id.12345 or test1.link.12345 ",
    );
  }

  // console.log(parsedDocCriteria)
  // console.log(dbName)

  // Now check if dbParam exists (either from URL or from doc)
  if (!dbName) {
    throw new Error("Required database name is not provided");
  }

  // 2. Get the bbdb-db-list array from localStorage
  const dbListJson = localStorage.getItem("bbdb-db-list");
  if (!dbListJson) {
    throw new Error('No databases found in localStorage "bbdb-db-list"');
  }

  const dbList = JSON.parse(dbListJson); // [{name: ""}, {}]

  // 3. Find matching db object by name
  const dbObj = dbList.find((db) => db.name === dbName);
  if (!dbObj) {
    throw new Error(`Database "${dbParam}" not found in bbdb-db-list`);
  }

  let result = { dbObj, parsedDocCriteria }
  if(page_name=="doc"){
    //for the document page, if db is provided show search bar, if doc provided do not show the search bar
    result["single_record"] = !parsedDocCriteria==null
    result["new_record"] = parsedDocCriteria==null
  }
  return  result;
};

const showMessage = (type, message) => {
  let messageEl = document.querySelector("#show-message");

  // Bootstrap 5 alert type mapping
  const alertTypes = {
    error: "alert-danger",
    success: "alert-success",
    warning: "alert-warning",
    info: "alert-info",
  };

  const alertType = alertTypes[type] || "alert-secondary";

  if (messageEl) {
    // Update existing alert
    messageEl.className = `alert ${alertType} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x`;
    messageEl.innerHTML = `<strong>${message}</strong> <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button>`;
  } else {
    // Create new Bootstrap alert
    messageEl = document.createElement("div");
    messageEl.id = "show-message";
    messageEl.className = `alert ${alertType} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x`;
    messageEl.innerHTML = `<strong>${message}</strong> <button type="button" class="btn-close" onclick="this.parentElement.remove()" aria-label="Close"></button>`;
    document.body.prepend(messageEl);
  }

  // Position and size styling
  Object.assign(messageEl.style, {
    zIndex: "9999",
    width: "90%",
    maxWidth: "500px",
    marginTop: "20px",
  });
};



const handle_bbdb_action = (action_data)=>{
  //console.log(action_data)
  let action = action_data.detail
  //console.log(action)
  if(!action.name){
    showMessage("error","No actions name provided")
  }
  const all_actions = {
    "message":()=>{
      showMessage(action.type,action.message)
    }
  }
  all_actions[action.name]()
}