/**
 * @file usersService.ts
 * @author TheWatcher01
 * @date 08-10-2024
 * @description Service to handle user-related API requests (register and login)
 */

import { api } from './api'; // Import the pre-configured Axios instance
import frontendLogger from '../config/frontendLogger'; // Import the frontend logger

// Function to register a new user
export const registerUser = async (userData: any) => {
    try {
        const response = await api.post('/users/register', userData);
        frontendLogger.info('User registered successfully', response);
        return response.data;
    } catch (error) {
        frontendLogger.error('Error registering user', error);
        throw error;
    }
};

// Function to log in an existing user
export const loginUser = async (userData: any) => {
    try {
        const response = await api.post('/users/login', userData);
        frontendLogger.info('User logged in successfully', response);
        return response.data;
    } catch (error) {
        frontendLogger.error('Error logging in user', error);
        throw error;
    }
};
