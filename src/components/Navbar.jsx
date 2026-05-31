import React, { useState, useEffect } from 'react';

export default function Navbar({ currentPath, onNavigate, onShowToast }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (path, e) => {
    e.preventDefault();
    onNavigate(path);
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  };

  const toggleMobileMenu = () => {
    const nextState = !isMobileMenuOpen;
    setIsMobileMenuOpen(nextState);
    document.body.style.overflow = nextState ? 'hidden' : '';
  };

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`} role="navigation" aria-label="Main navigation">
        <div className="container">
          <div className="nav-inner">
            <a 
              href="#" 
              className="nav-logo" 
              aria-label="Pathora home" 
              onClick={(e) => handleNavClick('landing', e)}
            >
              Path<span className="accent">ora</span>
            </a>
            
            <ul className="nav-links" role="list">
              <li>
                <a 
                  href="#" 
                  className={currentPath === 'explore' ? 'active' : ''} 
                  onClick={(e) => handleNavClick('explore', e)}
                >
                  Find a Consultant
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  className={currentPath === 'discover' ? 'active' : ''} 
                  onClick={(e) => handleNavClick('discover', e)}
                >
                  Discover Your Path
                </a>
              </li>
              <li>
                <a 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('dashboard');
                    setTimeout(() => {
                      const el = document.getElementById('opportunities');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  Opportunities
                </a>
              </li>
            </ul>

            <div className="nav-actions">
              <a 
                href="#" 
                className="btn btn-outline btn-sm" 
                onClick={(e) => handleNavClick('dashboard', e)}
              >
                Sign In
              </a>
              <a 
                href="#" 
                className="btn btn-navy btn-sm" 
                onClick={(e) => handleNavClick('discover', e)}
              >
                Get Started
              </a>
            </div>

            <button 
              className="hamburger" 
              aria-label="Open menu" 
              aria-expanded={isMobileMenuOpen}
              onClick={toggleMobileMenu}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`} 
        role="dialog" 
        aria-label="Navigation menu" 
        aria-modal="true"
      >
        <div className="mob-header">
          <a href="#" className="nav-logo" onClick={(e) => handleNavClick('landing', e)}>
            Path<span className="accent">ora</span>
          </a>
          <button 
            className="mob-close" 
            aria-label="Close menu"
            onClick={toggleMobileMenu}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <nav className="mob-links" aria-label="Mobile navigation">
          <a href="#" onClick={(e) => handleNavClick('explore', e)}>
            Find a Consultant 
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
          <a href="#" onClick={(e) => handleNavClick('discover', e)}>
            Discover Your Path 
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              onNavigate('dashboard');
              setIsMobileMenuOpen(false);
              document.body.style.overflow = '';
              setTimeout(() => {
                const el = document.getElementById('opportunities');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 200);
            }}
          >
            Opportunities 
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </a>
        </nav>
        <div className="mob-footer">
          <a 
            href="#" 
            className="btn btn-outline btn-full" 
            onClick={(e) => handleNavClick('dashboard', e)}
          >
            Sign In
          </a>
          <a 
            href="#" 
            className="btn btn-amber btn-full" 
            onClick={(e) => handleNavClick('discover', e)}
          >
            Get Started
          </a>
        </div>
      </div>
    </>
  );
}
