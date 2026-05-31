import React, { useState, useEffect, useRef } from 'react';
import { MOCK_CONSULTANTS } from '../mockData';
import ConsultantCard from '../components/ConsultantCard';

export default function ExplorePage({ onSelectConsultant, initialSector = 'all', onShowToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSector, setActiveSector] = useState(initialSector);
  const [sortBy, setSortBy] = useState('booked');
  const [isStickyShadow, setIsStickyShadow] = useState(false);
  const [consultants, setConsultants] = useState(MOCK_CONSULTANTS);
  const stickyRef = useRef(null);

  // Handle URL or incoming initial sector change
  useEffect(() => {
    setActiveSector(initialSector);
  }, [initialSector]);

  // Scroll handler for sticky shadow
  useEffect(() => {
    const handleScroll = () => {
      if (stickyRef.current) {
        setIsStickyShadow(window.scrollY > 150);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter and sort logic
  const filteredConsultants = consultants
    .filter((c) => {
      const matchesSector = activeSector === 'all' || c.sector.toLowerCase() === activeSector.toLowerCase();
      const cleanSearch = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !cleanSearch ||
        c.name.toLowerCase().includes(cleanSearch) ||
        c.role.toLowerCase().includes(cleanSearch) ||
        c.company.toLowerCase().includes(cleanSearch) ||
        c.tags.some((t) => t.toLowerCase().includes(cleanSearch));
      return matchesSector && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'booked') return b.sessionsCount - a.sessionsCount;
      if (sortBy === 'experience') return b.experience - a.experience;
      if (sortBy === 'newest') return a.id.localeCompare(b.id); // Simple alphabetic simulation
      return 0;
    });

  const resetFilters = () => {
    setSearchTerm('');
    setActiveSector('all');
    setSortBy('booked');
  };

  const handleLoadMore = () => {
    onShowToast("More consultants are joining Pathora soon!", "info");
  };

  return (
    <main id="main">
      {/* Page Header */}
      <header className="page-header">
        <div className="container">
          <div className="page-header-inner">
            <div className="section-label" aria-hidden="true">Browse consultants</div>
            <h1 className="h2">Find your consultant.</h1>
            <p>Vetted professionals who've built real careers across Africa's most exciting industries — ready to talk to you for free.</p>
            
            <div className="page-header-meta">
              <div className="meta-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Join 500+ students already learning
              </div>
              <div className="meta-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                All consultants vetted by Pathora
              </div>
              <div className="meta-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Free 45-min sessions
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Filters bar */}
      <div 
        ref={stickyRef}
        className={`sticky-filters ${isStickyShadow ? 'shadowed' : ''}`} 
        id="stickyFilters" 
        role="search"
      >
        <div className="container">
          <div className="filters-inner">
            <div className="filters-search input-wrap">
              <span className="input-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input 
                type="search" 
                className="input input-padded" 
                placeholder="Search consultants..." 
                aria-label="Search consultants"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="filters-pills filter-bar" role="group" aria-label="Filter by sector">
              {['all', 'business', 'finance', 'technology'].map((sec) => (
                <button 
                  key={sec}
                  className={`filter-pill ${activeSector === sec ? 'active' : ''}`}
                  onClick={() => setActiveSector(sec)}
                  aria-pressed={activeSector === sec}
                >
                  {sec.charAt(0).toUpperCase() + sec.slice(1)}
                </button>
              ))}
            </div>

            <div className="filters-right">
              <select 
                className="select" 
                aria-label="Sort consultants" 
                style={{ height: '40px', fontSize: '13px' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="booked">Most Booked</option>
                <option value="experience">Most Experienced</option>
                <option value="newest">Newest</option>
              </select>
              <span className="results-count" aria-live="polite">
                Showing {filteredConsultants.length} consultant{filteredConsultants.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Consultants Grid Section */}
      <section className="consultants-section">
        <div className="container">
          {filteredConsultants.length > 0 ? (
            <>
              <div className="consultants-grid" id="consultantsGrid" aria-label="Consultant listings">
                {filteredConsultants.map((c) => (
                  <ConsultantCard 
                    key={c.id} 
                    consultant={c} 
                    onSelect={onSelectConsultant}
                  />
                ))}
              </div>
              <div className="load-more-wrap">
                <button 
                  className="btn btn-outline-amber" 
                  style={{ padding: '13px 32px', fontSize: '14px' }}
                  onClick={handleLoadMore}
                >
                  Load more consultants
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state" aria-live="polite">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h3>No consultants found</h3>
              <p>No consultants match your current criteria — try a different search query or sector filter.</p>
              <button className="btn btn-amber" onClick={resetFilters}>
                Show all consultants
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <div className="consultant-cta">
        <div className="container">
          <div className="consultant-cta-inner">
            <div>
              <h2>Are you a professional?</h2>
              <p>Join Pathora as a consultant and guide the next generation of African talent.</p>
            </div>
            <button 
              className="btn btn-ghost btn-lg"
              onClick={() => onShowToast("Consultant applications open soon!", "info")}
            >
              Join as a Consultant
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
