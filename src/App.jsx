import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Toast from './components/Toast';
import LandingPage from './pages/LandingPage';
import ExplorePage from './pages/ExplorePage';
import ConsultantProfilePage from './pages/ConsultantProfilePage';
import DiscoveryPage from './pages/DiscoveryPage';
import DashboardPage from './pages/DashboardPage';
import { DEFAULT_STUDENT_PROFILE } from './mockData';

export default function App() {
  const [currentPath, setCurrentPath] = useState('landing');
  const [routeParams, setRouteParams] = useState({});
  const [selectedConsultantId, setSelectedConsultantId] = useState('taiwo');
  const [careerMatch, setCareerMatch] = useState(DEFAULT_STUDENT_PROFILE.careerMatch);
  const [studentProfile, setStudentProfile] = useState(DEFAULT_STUDENT_PROFILE);
  const [bookedSessions, setBookedSessions] = useState([
    {
      id: 999,
      consultantId: "taiwo",
      consultantName: "Taiwo Adeyemi",
      avatarInitials: "TA",
      avatarBg: "av-amber",
      role: "Senior Product Manager",
      company: "Google",
      date: "Friday, June 6",
      time: "10:00 AM WAT",
      platform: "Google Meet",
      duration: "45 mins"
    }
  ]);
  const [toasts, setToasts] = useState([]);

  // Toast utilities
  const showToast = (message, type = 'success') => {
    setToasts((prev) => [...prev, { id: Date.now() + Math.random(), message, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Route wrapper with param handling
  const handleNavigate = (path, params = {}) => {
    setCurrentPath(path);
    setRouteParams(params);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSelectConsultant = (id) => {
    setSelectedConsultantId(id);
    handleNavigate('consultant');
  };

  const handleBookSession = (session) => {
    setBookedSessions((prev) => [...prev, session]);
  };

  const handleResetDiscovery = () => {
    setCareerMatch('Not matched yet');
    setStudentProfile((prev) => ({ ...prev, careerMatch: 'Not matched yet' }));
    handleNavigate('discover');
  };

  // Keep student profile synchronised with career discovery results
  const handleSetCareerMatch = (newMatch) => {
    setCareerMatch(newMatch);
    setStudentProfile((prev) => ({
      ...prev,
      careerMatch: newMatch
    }));
  };

  // Global routing map
  const renderActivePage = () => {
    switch (currentPath) {
      case 'landing':
        return (
          <LandingPage 
            onNavigate={handleNavigate} 
            onSelectConsultant={handleSelectConsultant} 
          />
        );
      case 'explore':
        return (
          <ExplorePage 
            onSelectConsultant={handleSelectConsultant} 
            initialSector={routeParams.sector || 'all'}
            onShowToast={showToast}
          />
        );
      case 'consultant':
        return (
          <ConsultantProfilePage 
            consultantId={selectedConsultantId}
            onNavigate={handleNavigate}
            onSelectConsultant={handleSelectConsultant}
            onBookSession={handleBookSession}
            onShowToast={showToast}
          />
        );
      case 'discover':
        return (
          <DiscoveryPage 
            onSelectConsultant={handleSelectConsultant}
            onNavigate={handleNavigate}
            onSetCareerMatch={handleSetCareerMatch}
            onShowToast={showToast}
          />
        );
      case 'dashboard':
        return (
          <DashboardPage 
            studentProfile={studentProfile}
            bookedSessions={bookedSessions}
            careerMatch={careerMatch}
            onNavigate={handleNavigate}
            onSelectConsultant={handleSelectConsultant}
            onShowToast={showToast}
            onResetDiscovery={handleResetDiscovery}
          />
        );
      default:
        return (
          <LandingPage 
            onNavigate={handleNavigate} 
            onSelectConsultant={handleSelectConsultant} 
          />
        );
    }
  };

  return (
    <>
      <a href="#main" className="skip">Skip to main content</a>
      
      {/* Hide global navbar on dashboard page (as dashboard has its own sidebar layout) */}
      {currentPath !== 'dashboard' && (
        <Navbar 
          currentPath={currentPath} 
          onNavigate={handleNavigate} 
          onShowToast={showToast}
        />
      )}

      {renderActivePage()}

      {/* Hide global footer on dashboard page */}
      {currentPath !== 'dashboard' && (
        <Footer 
          onNavigate={handleNavigate} 
          onShowToast={showToast}
        />
      )}

      {/* Toast wrap container */}
      <div className="toast-wrap" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <Toast 
            key={toast.id} 
            message={toast.message} 
            type={toast.type} 
            onClose={() => removeToast(toast.id)} 
          />
        ))}
      </div>
    </>
  );
}
