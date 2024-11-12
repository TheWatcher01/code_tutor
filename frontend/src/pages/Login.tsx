// File path: /home/thewatcher/projet/code_tutor/frontend/src/pages/Login.tsx

import React, { useState } from 'react';
import { loginUser } from '../services/usersService';
import frontendLogger from '../config/frontendLogger';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await loginUser({ email, password });
            localStorage.setItem('token', response.token);
            localStorage.setItem('role', response.role);
            frontendLogger.info('Login successful', response);
            navigate('/');
        } catch (err) {
            setError('Invalid credentials. Please try again.');
            frontendLogger.error('Login failed', err);
        }
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Login</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    Login
                </button>
                {error && <p className="text-red-500">{error}</p>}
            </form>
            {/* Vous pouvez ajouter d'autres options de connexion ici si nécessaire */}
        </div>
    );
};

export default Login;
