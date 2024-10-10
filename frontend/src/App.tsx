// File path: src/frontend/src/App.tsx

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home'; // Import Home page component
import Login from './pages/Login'; // Import Login page component
import Register from './pages/Register'; // Import Register page component

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} /> {/* Home route */}
                <Route path="/login" element={<Login />} /> {/* Login route */}
                <Route path="/register" element={<Register />} /> {/* Register route */}
            </Routes>
        </Router>
    );
};

export default App;
