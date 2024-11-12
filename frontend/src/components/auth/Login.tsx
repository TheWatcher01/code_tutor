// File path: frontend/src/components/auth/Login.tsx

import React, { useState } from 'react';
import { loginUser } from "@/services/usersService";
import frontendLogger from "@/config/frontendLogger";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const Login: React.FC = () => {
  // State variables to manage email, password, and error messages
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Hook to navigate programmatically
  const navigate = useNavigate();

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Attempt to log in the user with provided email and password
      const response = await loginUser({ email, password });

      // Store the received token and role in local storage
      localStorage.setItem('token', response.token);
      localStorage.setItem('role', response.role);

      // Log successful login
      frontendLogger.info('Login successful', response);

      // Navigate to the home page
      navigate('/');
    } catch (err) {
      // Set error message if login fails
      setError('Invalid credentials. Please try again.');

      // Log the error
      frontendLogger.error('Login failed', err);
    }
  };

  return (
    <div className="p-6 bg-card rounded-lg shadow-md text-foreground">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
        />
        <Button
          type="submit"
          className="w-full"
          variant="default"
        >
          Login
        </Button>
        {error && <p className="text-destructive">{error}</p>}
      </form>
    </div>
  );
};

export default Login;
