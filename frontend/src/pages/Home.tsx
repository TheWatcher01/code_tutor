// File path: frontend/src/pages/Home.tsx

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignUpForm } from '@/components/auth/SignUpForm';
import { ModeToggle } from '@/components/modeToggle';

const Home: React.FC = () => {
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // State to control modal visibility
    const [isLoginForm, setIsLoginForm] = useState(true); // State to control login/signup form

    const toggleAuthForm = () => {
        setIsLoginForm(!isLoginForm); // Toggle between Login and Sign Up forms
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center">
            <h1 className="text-4xl font-bold mb-4 text-foreground">Welcome to Code Tutor</h1>
            <p className="text-lg mb-8 text-foreground">
                This is a platform to learn programming with the help of interactive courses and GPT-powered assistance.
            </p>
            <ModeToggle />

            {/* Only show the buttons when the forms are not visible */}
            {!isAuthModalOpen && (
                <>
                    {/* Main Login/Register Button */}
                    <Button
                        className="font-bold"
                        onClick={() => setIsAuthModalOpen(true)} // Open the modal
                    >
                        {isLoginForm ? 'Login' : 'Register'}
                    </Button>
                </>
            )}

            {/* Conditionally render Login or SignUp form inside the modal */}
            {isAuthModalOpen && (
                <div className="mt-8">
                    {isLoginForm ? (
                        <>
                            {/* Login form */}
                            <LoginForm />
                        </>
                    ) : (
                        /* SignUp form */
                        <SignUpForm />
                    )}

                    {/* Toggle link between Login and SignUp forms */}
                    <div className="mt-4">
                        <Button variant="link" onClick={toggleAuthForm}>
                            {isLoginForm ? "Don't have an account? Sign up" : "Already have an account? Login"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;
