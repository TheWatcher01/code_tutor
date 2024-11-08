// File path: frontend/src/components/auth/Register.tsx

import React, { useState } from 'react';
import { registerUser } from "@/services/usersService";
import frontendLogger from "@/config/frontendLogger";
import { Button } from "@/components/ui/button";

const Register: React.FC = () => {
  // State variables to manage username, email, password, and error messages
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Function to handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Attempt to register the user with the provided data
      const response = await registerUser({ username, email, password });

      // Log successful registration
      frontendLogger.info('Registration successful', response);
    } catch (err) {
      // Set error message if registration fails
      setError('Registration failed. Please try again.');

      // Log the error
      frontendLogger.error('Registration failed', err);
    }
  };

  return (
    <div className="p-6 bg-card text-card-foreground rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4 text-foreground">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
        />
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
          Register
        </Button>
        {error && <p className="text-destructive">{error}</p>}
      </form>
    </div>
  );
};

export default Register;
