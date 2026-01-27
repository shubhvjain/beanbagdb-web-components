import axios from 'axios';
import Ajv from 'ajv';
import { BeanBagDB } from 'beanbagdb';
import Mustache from 'mustache';

function extractCredentials(url) {
  try {
    const parsed = new URL(url);
    const username = parsed.username;
    const password = parsed.password;
    
    if (!username || !password) {
      throw new Error('Username and password must be in URL (http://user:pass@host:port)');
    }
    
    const baseUrl = `${parsed.protocol}//${parsed.host}`;
    return { username, password, baseUrl };
  } catch (error) {
    throw new Error(`Invalid CouchDB URL format: ${error.message}. Use: http://user:pass@host:port`);
  }
}

export const DB = async (db_details) => {
  if (!db_details.url) {
    throw new Error("No DB URL provided");
  }
  if (!db_details.name) {
    throw new Error("No DB name provided");
  }
  if (!db_details.encryption_key) {
    throw new Error("No encryption key provided");
  }

  // Extract credentials FIRST - moved to top
  const { username, password, baseUrl } = extractCredentials(db_details.url);
  let server_url = baseUrl;
  let db_name = db_details.name;
  console.log(baseUrl)
  // Extract db_name from URL path if provided (existing logic preserved)
  const url_match = db_details.url.match(
    /^(https?:\/\/[^\/]+(?:\/[^\/]+)*)\/([^\/]+)$/
  );
  if (url_match) {
    server_url = url_match[1];
    db_name = db_details.name || url_match[2];
  }

  //const baseURL = `${server_url}/${db_name}`;
  //console.log(baseURL)
  // Create server client for server-level operations (KEEPS credentials context via cookie)
  // couch.defaults.headers.common['Authorization'] = 
  //'Basic ' + btoa(`${USERNAME}:${PASSWORD}`);
  const serverClient = axios.create({
    baseURL: `${baseUrl}/${db_name}`,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    auth:{
      username,
      password 
    }
  });

  // Create database client
  const apiClient = axios.create({
    baseURL:`${baseUrl}/${db_name}`,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      
    },
     auth:{
      username,
      password 
    }
  });

  // Authenticate first (cookie session) - use serverClient
  // try {
  //   const authResponse = await serverClient.post('/_session', 
  //     `name=${username}&password=${password}`,
  //     { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  //   );
    
  //   const setCookie = authResponse.headers['set-cookie']?.[0];
  //   if (setCookie) {
  //     const cookieValue = setCookie.split(';')[0];
  //     // Share cookie between both clients
  //     apiClient.defaults.headers.common['Cookie'] = cookieValue;
  //     serverClient.defaults.headers.common['Cookie'] = cookieValue;
  //   }
    
  //   // Add user to database members (now with proper auth)
  //   try {
  //     const security = await apiClient.get('_security');
  //     const updatedSecurity = {
  //       ...security.data,
  //       members: {
  //         names: [...new Set([...(security.data?.members?.names || []), username])],
  //         roles: security.data?.members?.roles || []
  //       }
  //     };
  //     await apiClient.put('_security', updatedSecurity);
  //     console.log(`${username} granted access to ${db_name}`);
  //   } catch (securityError) {
  //     if (securityError.response?.status !== 404) {
  //       console.warn('Could not update DB security:', securityError.response?.data);
  //     }
  //   }
  // } catch (authError) {
  //   throw new Error(`Authentication failed: ${authError.response?.data?.reason || authError.message}`);
  // }

  // Ensure DB exists (use serverClient for creation)
  try {
    await apiClient.get('/');
  } catch (err) {
    if (err.response?.status === 404) {
      await serverClient.put(`/${db_name}`);
      console.log(`Created database: ${db_name}`);
    } else {
      throw err;
    }
  }

  const doc_obj = {
    db_name: "couchdb-rest",
    name: db_name,
    encryption_key: db_details.encryption_key,
    api: {
      insert: async (doc) => {
        const response = await apiClient.post('/', doc);
        return response.data;
      },
      update: async (doc) => {
        if (!doc._id || !doc._rev) {
          throw new Error("Document must have _id and _rev for update");
        }
        const response = await apiClient.put(`/${doc._id}`, doc);
        return response.data;
      },
      search: async (query) => {
        const response = await apiClient.post('_find', query);
        return response.data;
      },
      get: async (id) => {
        const response = await apiClient.get(`/${id}`);
        return response.data;
      },
      createIndex: async (indexDef) => {
        const response = await apiClient.post('_index', indexDef);
        return response.data;
      },
      delete: async (doc_id) => {
        const doc = await apiClient.get(`/${doc_id}`);
        const response = await apiClient.delete(`/${doc.data._id}?rev=${doc.data._rev}`);
        return response.data;
      },
    },
    utils: {
      encrypt: async (text, encryptionKey) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const keyBytes = encoder.encode(encryptionKey);
        
        if (![16, 24, 32].includes(keyBytes.length)) {
          throw new Error("Encryption key must be 16, 24, or 32 bytes long.");
        }

        const key = await crypto.subtle.importKey(
          "raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv }, key, data
        );

        const encryptedArray = new Uint8Array(encrypted);
        const encryptedText = btoa(String.fromCharCode(...encryptedArray));
        const ivText = btoa(String.fromCharCode(...iv));
        return `${ivText}:${encryptedText}`;
      },
      decrypt: async (encryptedText, encryptionKey) => {
        const [ivText, encryptedData] = encryptedText.split(":");
        const iv = Uint8Array.from(atob(ivText), c => c.charCodeAt(0));
        const encryptedArray = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw", encoder.encode(encryptionKey), { name: "AES-GCM" }, 
          false, ["decrypt"]
        );

        const decrypted = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv }, key, encryptedArray
        );
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
      },
      ping: async () => {
        try {
          await apiClient.get('/');
          return true;
        } catch {
          return false;
        }
      },
      validate_schema: (schema_obj, data_obj) => {
        const ajv = new Ajv({
          code: { esm: true },
          strict: false,
          useDefaults: true,
        });
        const data_copy = { ...data_obj };
        const validate = ajv.compile(schema_obj);
        const valid = validate(data_copy);
        return { valid, validate, data: data_copy };
      },
      compile_template:{
        "mustache":(template,data)=>{
          return Mustache.render(template, data);
        }
      }
    },
  };

  const database = new BeanBagDB(doc_obj);
  return database;
};
