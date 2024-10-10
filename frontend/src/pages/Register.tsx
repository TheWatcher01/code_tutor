/**
 * @file Register.tsx
 * @author TheWatcher01
 * @date 08-10-2024
 * @description Registration page component for new users
 */

import React, { useState } from 'react';
import { registerUser } from '../services/usersService'; // Import the registration service

const Register: React.FC = () => {
    const [username, setUsername] = useState(''); // State for the username input
    const [email, setEmail] = useState(''); // State for the email input
    const [password, setPassword] = useState(''); // State for the password input
    const [error, setError] = useState(''); // State for handling error messages

    // Function to handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        try {
            const response = await registerUser({ username, email, password }); // Call the registration service
            console.log('Registration successful:', response); // Handle success (you can redirect or inform the user)
        } catch (err) {
            setError('Registration failed. Please try again.'); // Set error if registration fails
        }
    };

    return (
        <div>
            <h1>Register</h1>
            <form onSubmit={handleSubmit}>
                <input 
                    type="text" 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                />
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
                <button type="submit">Register</button>
                {error && <p>{error}</p>} {/* Display error message if registration fails */}
            </form>
        </div>
    );
};

export default Register;
