/**
 * @file usersService.ts
 * @author TheWatcher01
 * @date 08-10-2024
 * @description Service to handle user-related API requests (register and login)
 */

import { api } from './api'; // Import the pre-configured Axios instance

// Function to register a new user
export const registerUser = async (userData: any) => {
    try {
        // Send a POST request to the /register endpoint with user data
        const response = await api.post('/users/register', userData);
        return response.data; // Return the response data (e.g., user info or success message)
    } catch (error) {
        throw error; // Throw the error to be handled by the calling function
    }
};

// Function to log in an existing user
export const loginUser = async (userData: any) => {
    try {
        // Send a POST request to the /login endpoint with user credentials
        const response = await api.post('/users/login', userData);
        return response.data; // Return the response data (e.g., token or user info)
    } catch (error) {
        throw error; // Throw the error to be handled by the calling function
    }
};
