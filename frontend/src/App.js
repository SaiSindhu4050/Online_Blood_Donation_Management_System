import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Landing from './pages/Landing/Landing';
import Donate from './pages/Donate/Donate';
import Request from './pages/Request/Request';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import UserDashboard from './pages/UserDashboard/UserDashboard';
import OrganizationLogin from './pages/OrganizationLogin/OrganizationLogin';
import OrganizationSignup from './pages/OrganizationSignup/OrganizationSignup';
import OrganizationDashboard from './pages/OrganizationDashboard/OrganizationDashboard';
import ShareRequest from './pages/ShareRequest/ShareRequest';
import AdminLogin from './pages/AdminLogin/AdminLogin';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/request" element={<Request />} />
            <Route path="/login" element={<Login />} />
            <Route path="/login/form" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/signup/form" element={<Signup />} />
            <Route path="/dashboard" element={<UserDashboard />} />
            <Route path="/org-login" element={<OrganizationLogin />} />
            <Route path="/org-signup" element={<OrganizationSignup />} />
            <Route path="/org-dashboard" element={<OrganizationDashboard />} />
            <Route path="/share/request/:id" element={<ShareRequest />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
