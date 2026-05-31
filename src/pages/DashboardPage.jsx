import React, { useState, useEffect } from 'react';
import { MOCK_CONSULTANTS, MOCK_OPPORTUNITIES } from '../mockData';

export default function DashboardPage({ 
  studentProfile, 
  bookedSessions, 
  careerMatch, 
  onNavigate, 
  onSelectConsultant, 
  onShowToast,
  onResetDiscovery
}) {
  const [isNudgeVisible, setIsNudgeVisible] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // mobile active tab
  const [currentDateString, setCurrentDateString] = useState('');
  const [greeting, setGreeting] = useState('');

  // Date and greeting effects
  useEffect(() => {
    const today = new Date();
    setCurrentDateString(
      today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    );

    const hour = today.getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const handleActionClick = (e, msg) => {
    e.preventDefault();
    onShowToast(msg, 'info');
  };

  // Find recommended consultants based on career match
  const recommendedConsultants = MOCK_CONSULTANTS.filter(c => {
    if (careerMatch.includes('Design') || careerMatch.includes('UX') || careerMatch.includes('Software') || careerMatch.includes('PM')) {
      return c.sector === 'Technology';
    }
    if (careerMatch.includes('Investment') || careerMatch.includes('Finance') || careerMatch.includes('Analyst')) {
      return c.sector === 'Finance';
    }
    return c.sector === 'Business';
  }).slice(0, 3);

  // Fallback if none found
  if (recommendedConsultants.length === 0) {
    recommendedConsultants.push(...MOCK_CONSULTANTS.slice(0, 3));
  }

  // Get active upcoming session (most recent booked one)
  const upcomingSession = bookedSessions[bookedSessions.length - 1];

  return (
    <div className="dashboard-wrap">
      {/* Sidebar Navigation (Desktop only) */}
      <aside className="sidebar" role="navigation" aria-label="Dashboard navigation">
        <a href="#" className="sidebar-logo" onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}>
          Path<span className="accent">ora</span>
        </a>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          <a href="#" className="sidebar-nav-item active" onClick={(e) => e.preventDefault()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Home
          </a>
          <a href="#" className="sidebar-nav-item" onClick={(e) => { e.preventDefault(); onNavigate('explore'); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Find a Consultant
          </a>
          <a href="#" className="sidebar-nav-item" onClick={(e) => { e.preventDefault(); onNavigate('discover'); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Discover My Path
          </a>

          <div className="sidebar-section-label" style={{ marginTop: '12px' }}>Activity</div>
          <a 
            href="#opportunities" 
            className="sidebar-nav-item"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('opportunities');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Opportunities
            <span className="notif-dot" aria-label="New opportunities available"></span>
          </a>
          <a href="#" className="sidebar-nav-item" onClick={(e) => handleActionClick(e, 'Sessions management dashboard coming soon!')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            My Sessions
          </a>
          <a href="#" className="sidebar-nav-item" onClick={(e) => handleActionClick(e, 'Profile customization open soon!')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </a>
        </nav>

        <div className="sidebar-signout" role="button" tabIndex={0} onClick={() => onShowToast('Signed out successfully.', 'info')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </div>
      </aside>

      {/* Main Panel */}
      <div className="dash-main">
        {/* Mobile Header */}
        <div className="dash-topbar">
          <div className="dash-topbar-logo" onClick={() => onNavigate('landing')} style={{ cursor: 'pointer' }}>
            Path<span className="accent">ora</span>
          </div>
          <div 
            className="avatar av-amber av-36" 
            aria-label="Profile" 
            style={{ cursor: 'pointer' }}
            onClick={() => onShowToast("Student Profile Panel", "info")}
          >
            EO
          </div>
        </div>

        <main id="main" className="dash-content">
          {/* Welcome Header */}
          <div className="welcome-header fade-up d0">
            <h1 className="welcome-greeting">{greeting}, {studentProfile.name.split(' ')[0]} 👋</h1>
            <p className="welcome-date">{currentDateString} · Here's what's happening in your career journey</p>
          </div>

          {/* Profile incomplete nudge */}
          {isNudgeVisible && (
            <div className="profile-nudge fade-up d1">
              <p><strong>Complete your profile</strong> — add your university and field to get better consultant recommendations.</p>
              <div className="profile-nudge-actions">
                <a href="#" className="btn btn-amber btn-sm" onClick={(e) => handleActionClick(e, 'Loading profile wizard...')}>
                  Complete Profile
                </a>
                <button className="profile-nudge-dismiss" onClick={() => setIsNudgeVisible(false)} aria-label="Dismiss this notification">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Stat Cards Grid */}
          <div className="stats-grid fade-up d1" role="list" aria-label="Your statistics">
            <div className="stat-card" role="listitem">
              <div>
                <div className="stat-num">{studentProfile.sessionsBooked + bookedSessions.length}</div>
                <div className="stat-label">Sessions Booked</div>
              </div>
              <div className="stat-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
            </div>

            <div className="stat-card" role="listitem">
              <div>
                <div className="stat-num">{studentProfile.consultantsExplored}</div>
                <div className="stat-label">Consultants Explored</div>
              </div>
              <div className="stat-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
            </div>

            <div className="stat-card" role="listitem">
              <div>
                <div className="stat-num">{studentProfile.savedOpps}</div>
                <div className="stat-label">Opportunities Saved</div>
              </div>
              <div className="stat-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
            </div>

            <div className="stat-card" role="listitem">
              <div>
                <div className="stat-num" style={{ fontSize: '20px', lineHeight: '1.2' }}>{careerMatch}</div>
                <div className="stat-label">Career Match</div>
              </div>
              <div className="stat-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Prominent Upcoming Session Card */}
          <div className="session-card fade-up d2">
            <div className="session-card-header">
              <span className="session-card-label">Upcoming Session</span>
              <span className="pill" style={{ background: 'rgba(26,107,74,0.2)', color: '#6EE7B7', fontSize: '11px', padding: '3px 10px' }}>
                Confirmed
              </span>
            </div>
            
            {upcomingSession ? (
              <div className="session-card-body">
                <div className={`avatar ${upcomingSession.avatarBg} av-80`} aria-hidden="true">
                  {upcomingSession.avatarInitials}
                </div>
                <div className="session-info">
                  <h2 className="session-name">{upcomingSession.consultantName}</h2>
                  <p className="session-role">{upcomingSession.role} · {upcomingSession.company}</p>
                  
                  <div className="session-when">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {upcomingSession.date} · {upcomingSession.time}
                  </div>
                  <div className="session-when" style={{ marginTop: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {upcomingSession.duration} · {upcomingSession.platform}
                  </div>
                  <div className="session-countdown">Starts in <strong>3 days</strong></div>
                </div>
                <div className="session-actions">
                  <button 
                    className="btn btn-amber"
                    onClick={() => onShowToast("Connecting to Google Meet...", "success")}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.893L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                    Join Session
                  </button>
                  <button 
                    className="session-reschedule"
                    onClick={() => onShowToast("Rescheduling through Calendly placeholder...", "info")}
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-session">
                <p>You have no upcoming sessions booked yet.</p>
                <h3>Connect with a mentor to build your future.</h3>
                <button className="btn btn-amber btn-sm" onClick={() => onNavigate('explore')}>
                  Find a Consultant
                </button>
              </div>
            )}
          </div>

          {/* Two Columns: Recommendations + Opportunities */}
          <div className="dash-cols fade-up d2">
            
            {/* Left: Recommended Consultants */}
            <div className="dash-col-card">
              <div className="dash-col-header">
                <h2 className="dash-col-title">Recommended for you</h2>
                <a href="#" className="dash-col-link" onClick={(e) => { e.preventDefault(); onNavigate('explore'); }}>
                  View all →
                </a>
              </div>

              {recommendedConsultants.map((c) => (
                <div 
                  key={c.id} 
                  className="mini-consultant"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectConsultant(c.id)}
                >
                  <div className={`avatar ${c.avatarBg} av-36`} aria-hidden="true">
                    {c.avatarInitials}
                  </div>
                  <div className="mini-consultant-info">
                    <div className="mini-consultant-name">{c.name}</div>
                    <div className="mini-consultant-role">{c.role} · {c.company}</div>
                  </div>
                  <span className="pill pill-amber" style={{ fontSize: '10px' }}>{c.sector}</span>
                </div>
              ))}
            </div>

            {/* Right: Latest Opportunities */}
            <div className="dash-col-card" id="opportunities">
              <div className="dash-col-header">
                <h2 className="dash-col-title">Latest Opportunities</h2>
                <a 
                  href="#" 
                  className="dash-col-link" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('all-opportunities-section').scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  View all →
                </a>
              </div>

              {MOCK_OPPORTUNITIES.slice(0, 3).map((opp) => (
                <div key={opp.id} className="opp-item">
                  <div className="opp-item-top">
                    <span 
                      className={`pill ${opp.type === 'Hackathon' ? 'pill-amber' : opp.type === 'Fellowship' ? 'pill-navy' : 'pill-green'}`} 
                      style={{ fontSize: '10px', padding: '2px 8px' }}
                    >
                      {opp.type}
                    </span>
                    <span className={`opp-deadline ${opp.isUrgent ? 'urgent' : ''}`}>
                      {opp.deadline}
                    </span>
                  </div>
                  <div className="opp-item-title">{opp.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {opp.organisation} · {opp.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Career Roadmap Progress Tracker Banner */}
          <div className="career-banner fade-up d3" style={{ marginBottom: '24px' }}>
            <div className="career-banner-left">
              <div className="career-banner-label">Your career match</div>
              <h2 className="career-banner-title">{careerMatch}</h2>
              <div style={{ marginBottom: '6px' }}>
                <div 
                  className="roadmap-progress" 
                  role="progressbar" 
                  aria-valuenow={1} 
                  aria-valuemin={1} 
                  aria-valuemax={3} 
                  aria-label="Roadmap step 1 of 3"
                >
                  <div className="roadmap-step-dot done"></div>
                  <div className="roadmap-step-line done"></div>
                  <div className="roadmap-step-dot done" style={{ background: 'var(--amber)' }}></div>
                  <div className="roadmap-step-line active"></div>
                  <div className="roadmap-step-dot"></div>
                  <div className="roadmap-step-line"></div>
                  <div className="roadmap-step-dot"></div>
                </div>
              </div>
              <div className="roadmap-label">Your roadmap: Step 1 of 3 — Building foundations</div>
            </div>
            
            <div className="career-banner-actions">
              <button className="btn btn-amber" onClick={() => onNavigate('discover')}>
                Continue Exploring
              </button>
              <div className="retake-link">
                <span onClick={onResetDiscovery}>
                  Retake assessment
                </span>
              </div>
            </div>
          </div>

          {/* Full Grid Opportunities board */}
          <div 
            id="all-opportunities-section"
            style={{ marginTop: '24px', background: 'var(--white)', borderRadius: '14px', padding: '20px' }} 
            className="fade-up d3"
          >
            <div className="dash-col-header" style={{ marginBottom: '20px' }}>
              <h2 className="dash-col-title">All Opportunities</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--amber-dark)' }}>
                <span className="notif-dot" style={{ position: 'static', margin: 0, animation: 'pulse 2s infinite' }} aria-hidden="true"></span>
                3 new this week
              </div>
            </div>

            {/* Opportunities card grid */}
            <div className="dashboard-opp-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
              {MOCK_OPPORTUNITIES.map((opp) => (
                <div 
                  key={opp.id}
                  style={{ 
                    border: '1px solid var(--border)', 
                    borderRadius: '12px', 
                    padding: '16px', 
                    borderTop: opp.type === 'Hackathon' ? '3px solid var(--amber)' : opp.type === 'Internship' ? '3px solid var(--green)' : '3px solid var(--navy)',
                    transition: 'all 200ms ease'
                  }}
                  className="opp-card-hover"
                >
                  <span 
                    className={`pill ${opp.type === 'Hackathon' ? 'pill-amber' : opp.type === 'Internship' ? 'pill-green' : 'pill-navy'}`} 
                    style={{ fontSize: '10px', marginBottom: '8px', display: 'inline-flex' }}
                  >
                    {opp.type}
                  </span>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)', marginBottom: '4px' }}>
                    {opp.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                    {opp.organisation}
                  </div>
                  <div style={{ fontSize: '12px', color: opp.isUrgent ? '#DC2626' : 'var(--muted)', fontWeight: opp.isUrgent ? 600 : 400, marginBottom: '12px' }}>
                    {opp.deadline}
                  </div>
                  <a 
                    href="#" 
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--amber-dark)', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={(e) => handleActionClick(e, `Redirecting to ${opp.organisation} application portal...`)}
                  >
                    View Opportunity 
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </a>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <nav className="bottom-tab" aria-label="Mobile navigation">
        <div className="bottom-tab-inner">
          <button 
            className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => { setActiveTab('home'); }}
            style={{ background: 'none', border: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            Home
          </button>
          
          <button 
            className="tab-item"
            onClick={() => onNavigate('explore')}
            style={{ background: 'none', border: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Find
          </button>

          <button 
            className="tab-item"
            onClick={() => onNavigate('discover')}
            style={{ background: 'none', border: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Discover
          </button>

          <button 
            className="tab-item tab-notif"
            onClick={() => {
              const el = document.getElementById('opportunities');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
              else onShowToast('Opportunities panel', 'info');
            }}
            style={{ background: 'none', border: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Opps
          </button>

          <button 
            className="tab-item"
            onClick={(e) => handleActionClick(e, 'Student profile panel')}
            style={{ background: 'none', border: 'none' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </button>
        </div>
      </nav>
    </div>
  );
}
