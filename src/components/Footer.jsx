import React from 'react';

export default function Footer({ onNavigate, onShowToast }) {
  const handleNavClick = (path, e) => {
    e.preventDefault();
    onNavigate(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLinkClick = (message, e) => {
    e.preventDefault();
    onShowToast(message, 'info');
  };

  return (
    <footer>
      <div className="container">
        <div className="footer-inner">
          <div 
            className="footer-logo" 
            style={{ cursor: 'pointer' }}
            onClick={(e) => handleNavClick('landing', e)}
          >
            Path<span className="accent">ora</span>
          </div>
          
          <nav className="footer-links" aria-label="Footer navigation">
            <a href="#" onClick={(e) => handleLinkClick('About section coming soon!', e)}>About</a>
            <a href="#" onClick={(e) => handleNavClick('explore', e)}>Consultants</a>
            <a href="#" onClick={(e) => handleNavClick('discover', e)}>Career Discovery</a>
            <a href="#" onClick={(e) => handleLinkClick('Consultant applications open soon!', e)}>Join as Consultant</a>
          </nav>
          
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            Built for African students, by Africans.
          </div>
        </div>
        <div className="footer-copy">© 2026 Pathora. All rights reserved.</div>
      </div>
    </footer>
  );
}
