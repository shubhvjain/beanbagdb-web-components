import axios from 'axios';
import Ajv from 'ajv';
import { BeanBagDB } from 'beanbagdb';

export default  DB = async (db_details) => {
  if (!db_details.url) {
    throw new Error("No DB URL provided");
  }
  if (!db_details.name) {
    throw new Error("No DB name provided");
  }
  if (!db_details.encryption_key) {
    throw new Error("No encryption key provided");
  }

  // Extract server URL and db_name from provided URL (same logic as backend)
  let server_url = db_details.url;
  let db_name = db_details.name;

  const url_match = db_details.url.match(
    /^(https?:\/\/[^\/]+(?:\/[^\/]+)*)\/([^\/]+)$/
  );
  if (url_match) {
    server_url = url_match[1];
    db_name = db_details.name || url_match[2];
  }

  const baseURL = `${server_url}/${db_name}`;
  
  // Create axios instance for this database
  const apiClient = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Ensure DB exists (same logic as backend)
  try {
    await apiClient.get('/');
  } catch (err) {
    if (err.response?.status === 404) {
      await axios.put(`${server_url}/${db_name}`);
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
        // Mango query for _find endpoint
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
        // First get the document to get _rev
        const doc = await apiClient.get(`/${doc_id}`);
        const response = await apiClient.delete(`/${doc_id}?rev=${doc._rev}`);
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
    },
  };

  const database = new BeanBagDB(doc_obj);
  await database.ready(false);
  return database;
};
