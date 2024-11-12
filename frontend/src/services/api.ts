/**
 * @file api.ts
 * @author TheWatcher01
 * @date 08-10-2024
 * @description API service to make requests to the backend using Axios
 */

import axios from 'axios';

// Set the base URL for the API requests
const API_URL = 'http://localhost:5001/api';

// Create an Axios instance with the base URL
export const api = axios.create({
  baseURL: API_URL, // All API requests will use this base URL
});

export default api; // Export the instance for use in other files
