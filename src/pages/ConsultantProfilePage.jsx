import React, { useState, useEffect } from 'react';
import { MOCK_CONSULTANTS } from '../mockData';

export default function ConsultantProfilePage({ consultantId, onNavigate, onBookSession, onShowToast }) {
  const consultant = MOCK_CONSULTANTS.find(c => c.id === consultantId) || MOCK_CONSULTANTS[0];
  const [selectedDay, setSelectedDay] = useState(29);
  
  // Rerender body padding to accommodate mobile sticky booking bar
  useEffect(() => {
    document.body.classList.add('has-mobile-bar');
    return () => document.body.classList.remove('has-mobile-bar');
  }, []);

  const handleBook = () => {
    const sessionDetails = {
      id: Date.now(),
      consultantId: consultant.id,
      consultantName: consultant.name,
      avatarInitials: consultant.avatarInitials,
      avatarBg: consultant.avatarBg,
      role: consultant.role,
      company: consultant.company,
      date: `Friday, June ${selectedDay}`,
      time: "10:00 AM WAT",
      platform: "Google Meet",
      duration: "45 mins"
    };

    onBookSession(sessionDetails);
    onShowToast(`Session booked with ${consultant.name} for June ${selectedDay}!`, 'success');
    onNavigate('dashboard');
  };

  // Find 3 related consultants in the same sector
  const relatedConsultants = MOCK_CONSULTANTS
    .filter(c => c.sector === consultant.sector && c.id !== consultant.id)
    .slice(0, 3);

  // If there are less than 3, pad with others
  if (relatedConsultants.length < 3) {
    const others = MOCK_CONSULTANTS.filter(c => c.id !== consultant.id && !relatedConsultants.includes(c));
    while (relatedConsultants.length < 3 && others.length > 0) {
      relatedConsultants.push(others.shift());
    }
  }

  return (
    <main id="main">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <div className="container">
          <div className="breadcrumb-inner">
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); onNavigate('explore'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to Consultants
            </a>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span>{consultant.name}</span>
          </div>
        </div>
      </div>

      {/* Main Profile Grid */}
      <section className="profile-section">
        <div className="container">
          <div className="profile-grid">
            
            {/* Left: Biography and Details */}
            <div className="profile-left">
              {/* Hero header */}
              <div className="profile-hero fade-up d0">
                <div className={`avatar ${consultant.avatarBg} av-80`} aria-hidden="true">
                  {consultant.avatarInitials}
                </div>
                <div className="profile-hero-info">
                  <h1 className="profile-name">{consultant.name}</h1>
                  <p className="profile-role">{consultant.role} · {consultant.company}</p>
                  <div className="profile-badges">
                    <span className="pill pill-amber">{consultant.sector}</span>
                    <div className="vetted-badge">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      Vetted &amp; Approved by Pathora
                    </div>
                    <div className="avail">{consultant.availability}</div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="profile-stats fade-up d1" role="list" aria-label="Profile statistics">
                <div className="stat-item" role="listitem">
                  <div className="stat-item-num">{consultant.sessionsCount}</div>
                  <div className="stat-item-label">Sessions completed</div>
                </div>
                <div className="stat-item" role="listitem">
                  <div className="stat-item-num">{consultant.rating}</div>
                  <div className="stat-item-label">Average rating</div>
                </div>
                <div className="stat-item" role="listitem">
                  <div className="stat-item-num">{consultant.responseTime}</div>
                  <div className="stat-item-label">Response time</div>
                </div>
                <div className="stat-item" role="listitem">
                  <div className="stat-item-num">{consultant.experience} yrs</div>
                  <div className="stat-item-label">Industry experience</div>
                </div>
              </div>

              {/* About section */}
              <div className="profile-block fade-up d2">
                <h2 className="profile-section-title">About {consultant.name.split(' ')[0]}</h2>
                <p>{consultant.bio}</p>
                {consultant.extendedBio && <p style={{ marginTop: '12px' }}>{consultant.extendedBio}</p>}
              </div>

              {/* Expertise tags */}
              <div className="profile-block fade-up d2">
                <h2 className="profile-section-title">Areas of expertise</h2>
                <div className="tags-row">
                  {consultant.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="tag" 
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      {tag}
                    </span>
                  ))}
                  <span className="tag" style={{ padding: '6px 12px', fontSize: '13px' }}>Career Advice</span>
                  <span className="tag" style={{ padding: '6px 12px', fontSize: '13px' }}>CV Review</span>
                </div>
              </div>

              {/* What I can help with */}
              <div className="profile-block fade-up d2">
                <h2 className="profile-section-title">What I can help with</h2>
                <div className="help-list" role="list">
                  {consultant.helpItems.map((item, idx) => (
                    <div key={idx} className="help-item" role="listitem">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience timeline */}
              <div className="profile-block fade-up d3">
                <h2 className="profile-section-title">Experience</h2>
                <div className="timeline">
                  {consultant.timeline.map((t, idx) => (
                    <div key={idx} className="timeline-item">
                      <div className={`timeline-dot ${t.current ? 'current' : ''}`}>
                        {t.initial}
                      </div>
                      <div className="timeline-info">
                        <h4>{t.role}</h4>
                        <p>{t.company} · {t.location}</p>
                        <div className="timeline-date">{t.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Booking widget */}
            <div>
              <aside className="booking-widget fade-up d1" aria-label="Book a session">
                <div className="booking-widget-header">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                    <div className="session-type">Free 1:1 Session</div>
                    <span className="session-free-badge">FREE</span>
                  </div>
                  <div className="session-meta">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    45 minutes · One-on-one
                  </div>
                </div>

                {/* Calendar Widget */}
                <div className="calendar-placeholder" aria-label="Select a date">
                  <div className="cal-header">
                    <span>June 2026</span>
                    <div className="cal-nav">
                      <button aria-label="Previous month" onClick={() => onShowToast('Only June 2026 is available in this demo.', 'info')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="15 18 9 12 15 6"/>
                        </svg>
                      </button>
                      <button aria-label="Next month" onClick={() => onShowToast('Only June 2026 is available in this demo.', 'info')}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="cal-days">
                    <div className="cal-day-label">Su</div>
                    <div className="cal-day-label">Mo</div>
                    <div className="cal-day-label">Tu</div>
                    <div className="cal-day-label">We</div>
                    <div className="cal-day-label">Th</div>
                    <div className="cal-day-label">Fr</div>
                    <div className="cal-day-label">Sa</div>
                    
                    <div className="cal-day empty"></div>
                    <div className="cal-day past">1</div>
                    <div className="cal-day past">2</div>
                    <div className="cal-day past">3</div>
                    <div className="cal-day past">4</div>
                    <div className="cal-day past">5</div>
                    <div className="cal-day past">6</div>
                    
                    <div className="cal-day past">7</div>
                    <div className="cal-day past">8</div>
                    <div className="cal-day past">9</div>
                    <div className="cal-day past">10</div>
                    <div className="cal-day past">11</div>
                    <div className="cal-day past">12</div>
                    <div className="cal-day past">13</div>
                    
                    <div className="cal-day past">14</div>
                    <div className="cal-day past">15</div>
                    <div className="cal-day past">16</div>
                    <div className="cal-day past">17</div>
                    <div className="cal-day past">18</div>
                    <div className="cal-day past">19</div>
                    <div className="cal-day past">20</div>
                    
                    <div className="cal-day past">21</div>
                    <div className="cal-day past">22</div>
                    <div className="cal-day past">23</div>
                    <div className="cal-day past">24</div>
                    <div className="cal-day past">25</div>
                    <div className="cal-day past">26</div>
                    
                    <div 
                      className={`cal-day available ${selectedDay === 27 ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(27)}
                    >
                      27
                    </div>
                    <div 
                      className={`cal-day available ${selectedDay === 28 ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(28)}
                    >
                      28
                    </div>
                    <div 
                      className={`cal-day available ${selectedDay === 29 ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(29)}
                    >
                      29
                    </div>
                    <div 
                      className={`cal-day available ${selectedDay === 30 ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(30)}
                    >
                      30
                    </div>
                  </div>
                </div>

                <div className="booking-footer">
                  <button 
                    className="btn btn-amber btn-full btn-lg" 
                    onClick={handleBook}
                    style={{ fontSize: '15px' }}
                  >
                    Book Session — June {selectedDay}
                  </button>
                  
                  <div className="booking-info">
                    <div className="booking-info-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.893L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                      Sessions held via Google Meet or Zoom
                    </div>
                    <div className="booking-info-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      Secure booking powered by Calendly
                    </div>
                    <div className="booking-info-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      No credit card required — completely free
                    </div>
                  </div>
                </div>
              </aside>
            </div>

          </div>
        </div>
      </section>

      {/* Related Consultants Section */}
      <section className="related-section" aria-labelledby="related-heading">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '8px' }}>
            <div>
              <div className="section-label" aria-hidden="true">{consultant.sector} sector</div>
              <h2 id="related-heading" className="h3" style={{ color: 'var(--navy)', marginTop: '4px' }}>
                More consultants in {consultant.sector}
              </h2>
            </div>
            <button 
              className="btn btn-outline btn-sm"
              onClick={() => onNavigate('explore', { sector: consultant.sector.toLowerCase() })}
            >
              See all {consultant.sector} →
            </button>
          </div>
          
          <div className="related-grid">
            {relatedConsultants.map((c) => (
              <article key={c.id} className="c-card" onClick={() => onSelectConsultant(c.id)} style={{ cursor: 'pointer' }}>
                <div className="c-card-header">
                  <div className={`avatar ${c.avatarBg} av-48`} aria-hidden="true">{c.avatarInitials}</div>
                  <div className="c-card-info">
                    <div className="c-card-name">{c.name}</div>
                    <div className="c-card-role">{c.role} · {c.company}</div>
                  </div>
                </div>
                <span className="pill pill-amber">{c.sector}</span>
                <div className="c-card-tags">
                  {c.tags.slice(0, 3).map((t, i) => (
                    <span key={i} className="tag">{t}</span>
                  ))}
                </div>
                <div className="c-card-footer">
                  <div className="avail">Available this week</div>
                  <button className="btn btn-amber btn-full">Book a Session</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile Sticky Booking Bar */}
      <div className="mobile-book-bar" aria-label="Quick booking" role="complementary">
        <div className="mobile-book-bar-info">
          <strong>{consultant.name}</strong>
          <span>Free 45-min session</span>
        </div>
        <button className="btn btn-amber" onClick={handleBook}>Book a Session</button>
      </div>
    </main>
  );
}
