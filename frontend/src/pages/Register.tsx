// File path: /home/thewatcher/projet/code_tutor/frontend/src/pages/Register.tsx

import React, { useState } from 'react';
import { registerUser } from '../services/usersService'; // Import the registration service
import frontendLogger from '../config/frontendLogger'; // Import the frontend logger

const Register: React.FC = () => {
    const [username, setUsername] = useState(''); // State for the username input
    const [email, setEmail] = useState(''); // State for the email input
    const [password, setPassword] = useState(''); // State for the password input
    const [error, setError] = useState(''); // State for handling error messages

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        try {
            const response = await registerUser({ username, email, password }); // Call the registration service
            frontendLogger.info('Registration successful', response); // Log the successful registration
        } catch (err) {
            setError('Registration failed. Please try again.'); // Set error if registration fails
            frontendLogger.error('Registration failed', err); // Log the error
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Register</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Register
                </button>
                {error && <p className="text-red-500">{error}</p>} {/* Display error message if registration fails */}
            </form>
        </div>
    );
};

export default Register;
