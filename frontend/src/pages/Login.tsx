/**
 * @file Login.tsx
 * @author TheWatcher01
 * @date 08-10-2024
 * @description Login page component to handle user authentication
 */

import React, { useState } from 'react';
import { loginUser } from '../services/usersService'; // Import the login service

const Login: React.FC = () => {
    const [email, setEmail] = useState(''); // State for the email input
    const [password, setPassword] = useState(''); // State for the password input
    const [error, setError] = useState(''); // State for handling error messages

    // Function to handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        try {
            const response = await loginUser({ email, password }); // Call the login service
            console.log('Login successful:', response); // Handle success (you can redirect or store the token)
        } catch (err) {
            setError('Invalid credentials. Please try again.'); // Set error if login fails
        }
    };

    return (
        <div>
            <h1>Login</h1>
            <form onSubmit={handleSubmit}>
                <input 
                    type="email" 
                    placeholder="Email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                />
                <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                />
                <button type="submit">Login</button>
                {error && <p>{error}</p>} {/* Display error message if login fails */}
            </form>
        </div>
    );
};

export default Login;
