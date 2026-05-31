import React, { useState } from 'react';
import { MOCK_CONSULTANTS } from '../mockData';

export default function LandingPage({ onNavigate, onSelectConsultant }) {
  // Chat mockup state
  const [selectedOptions, setSelectedOptions] = useState(['tech', 'building']);

  const toggleOption = (val) => {
    if (selectedOptions.includes(val)) {
      setSelectedOptions(selectedOptions.filter(o => o !== val));
    } else {
      setSelectedOptions([...selectedOptions, val]);
    }
  };

  const handleSectorClick = (sectorName, e) => {
    e.preventDefault();
    onNavigate('explore', { sector: sectorName });
  };

  // Select a few top consultants for the hero social proof
  const topConsultants = MOCK_CONSULTANTS.slice(0, 4);

  return (
    <main id="main">
      {/* Hero Section */}
      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-left">
          <div className="hero-eyebrow fade-up d0">Built for African students</div>
          <h1 id="hero-heading" className="hero-title fade-up d1">
            Find the guidance<br />you've been<br /><em>waiting for.</em>
          </h1>
          <p className="hero-sub fade-up d2">
            Connect with vetted industry professionals across Business, Finance, and Technology — or let our AI help you discover where you're meant to go.
          </p>
          <div className="hero-actions fade-up d3">
            <button 
              className="btn btn-amber btn-lg"
              onClick={() => onNavigate('explore')}
            >
              Find a Consultant
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <button 
              className="btn btn-outline btn-lg"
              onClick={() => onNavigate('discover')}
            >
              Discover Your Path
            </button>
          </div>
          <div className="hero-proof fade-up d3">
            <div className="proof-avatars" aria-hidden="true">
              <div className="avatar av-amber">E</div>
              <div className="avatar av-navy">A</div>
              <div className="avatar av-green">F</div>
              <div className="avatar av-mid">C</div>
            </div>
            <span>500+ students already on their path</span>
          </div>
        </div>

        <div className="hero-right" aria-hidden="true">
          <div className="hero-right-label">Top consultants this week</div>
          <div className="hero-cards">
            {topConsultants.map((c) => (
              <div 
                key={c.id} 
                className="hero-c-card" 
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectConsultant(c.id)}
              >
                <div className={`avatar ${c.avatarBg} av-48`}>
                  {c.avatarInitials}
                </div>
                <div className="hero-c-info">
                  <div className="hero-c-name">{c.name}</div>
                  <div className="hero-c-role">{c.role} · {c.company}</div>
                </div>
                <span className="pill pill-amber">{c.sector}</span>
              </div>
            ))}
          </div>
          <div className="hero-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8A020" strokeWidth="2" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>All consultants vetted &amp; verified by Pathora</span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section" id="how-it-works" aria-labelledby="how-heading">
        <div className="container">
          <div className="section-label" aria-hidden="true">How it works</div>
          <h2 id="how-heading" class="h2" style={{ maxWidth: '480px' }}>
            Three steps to where you need to be
          </h2>
          <div className="steps-grid">
            <div className="step-card fade-up d0">
              <div className="step-num" aria-hidden="true">1</div>
              <div className="step-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <h3>Find your consultant</h3>
              <p>Browse professionals across Business, Finance, and Technology. Filter by sector, read profiles, and choose who's right for you.</p>
            </div>
            
            <div className="step-card fade-up d1">
              <div className="step-num" aria-hidden="true">2</div>
              <div className="step-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h3>Book a free session</h3>
              <p>Book your free 45-minute 1:1 session directly. No back-and-forth emails. No hidden fees. No catch.</p>
            </div>

            <div className="step-card fade-up d2">
              <div className="step-num" aria-hidden="true">3</div>
              <div className="step-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </div>
              <h3>Build your path</h3>
              <p>Walk away with clarity, a personalised roadmap, and the confidence of someone who's been where you want to go.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sectors Section */}
      <section className="sectors-section" aria-labelledby="sectors-heading">
        <div className="container">
          <div className="section-label" style={{ color: 'rgba(232,160,32,0.8)' }} aria-hidden="true">Explore sectors</div>
          <h2 id="sectors-heading" className="h2" style={{ color: 'var(--white)', maxWidth: '440px' }}>
            Consultants across every field that matters
          </h2>
          <div className="sectors-grid">
            <a href="#" className="sector-card" onClick={(e) => handleSectorClick('business', e)}>
              <div className="sector-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              </div>
              <h3>Business</h3>
              <p>Marketing, strategy, entrepreneurship, and leadership from professionals who've built real companies.</p>
              <div className="sector-count">12 consultants available →</div>
            </a>

            <a href="#" className="sector-card" onClick={(e) => handleSectorClick('finance', e)}>
              <div className="sector-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3>Finance</h3>
              <p>Investment banking, financial modelling, Big 4 accounting, and everything the African finance sector offers.</p>
              <div className="sector-count">9 consultants available →</div>
            </a>

            <a href="#" className="sector-card" onClick={(e) => handleSectorClick('technology', e)}>
              <div className="sector-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <h3>Technology</h3>
              <p>Engineering, product management, UX design, and tech leadership at Africa's top startups and global companies.</p>
              <div className="sector-count">15 consultants available →</div>
            </a>
          </div>
        </div>
      </section>

      {/* AI Discovery Section */}
      <section className="section" aria-labelledby="features-heading">
        <div className="container">
          <div className="features-grid">
            <div>
              <div className="section-label" aria-hidden="true">AI-powered discovery</div>
              <h2 id="features-heading" className="h2" style={{ maxWidth: '380px' }}>
                Not sure where to start? Let Pathora guide you.
              </h2>
              <p style={{ color: 'var(--muted)', margin: '20px 0 32px', fontSize: '16px', lineHeight: '1.7' }}>
                Our career discovery questionnaire analyses your interests, work style, and vision — then maps you to the paths where you'll genuinely thrive.
              </p>
              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </div>
                  <div>
                    <h4>6 thoughtful questions</h4>
                    <p>Designed to understand how you think, not just what you know.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <h4>Results in under 3 minutes</h4>
                    <p>No lengthy tests. Get your personalised roadmap immediately.</p>
                  </div>
                </div>

                <div className="feature-item">
                  <div className="feature-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <div>
                    <h4>Matched to real consultants</h4>
                    <p>Your results bridge directly to professionals in your matched field.</p>
                  </div>
                </div>
              </div>

              <button 
                className="btn btn-amber btn-lg" 
                style={{ marginTop: '32px' }}
                onClick={() => onNavigate('discover')}
              >
                Discover Your Path
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            {/* Interactive Chat Mockup */}
            <div className="chat-mockup" aria-hidden="true">
              <div className="chat-header">
                <div className="chat-header-avatar">P</div>
                <div className="chat-header-text">
                  <h4>Pathora Career Discovery</h4>
                  <p>Step 2 of 6 · Interests</p>
                </div>
              </div>
              <div className="chat-body">
                <div className="chat-msg ai">What topics genuinely excite you? Pick all that apply.</div>
                <div className="chat-options">
                  <button 
                    className={`chat-opt ${selectedOptions.includes('tech') ? 'sel' : ''}`}
                    onClick={() => toggleOption('tech')}
                  >
                    Technology &amp; Systems 💻
                  </button>
                  <button 
                    className={`chat-opt ${selectedOptions.includes('numbers') ? 'sel' : ''}`}
                    onClick={() => toggleOption('numbers')}
                  >
                    Numbers &amp; Analysis 📊
                  </button>
                  <button 
                    className={`chat-opt ${selectedOptions.includes('building') ? 'sel' : ''}`}
                    onClick={() => toggleOption('building')}
                  >
                    Building &amp; Creating 🔨
                  </button>
                  <button 
                    className={`chat-opt ${selectedOptions.includes('people') ? 'sel' : ''}`}
                    onClick={() => toggleOption('people')}
                  >
                    People &amp; Communication 🤝
                  </button>
                  <button 
                    className={`chat-opt ${selectedOptions.includes('business') ? 'sel' : ''}`}
                    onClick={() => toggleOption('business')}
                  >
                    Business &amp; Strategy 📈
                  </button>
                  <button 
                    className={`chat-opt ${selectedOptions.includes('design') ? 'sel' : ''}`}
                    onClick={() => toggleOption('design')}
                  >
                    Design &amp; Aesthetics ✦
                  </button>
                </div>
                {selectedOptions.length > 0 && (
                  <div className="chat-msg user" style={{ textTransform: 'capitalize' }}>
                    {selectedOptions.map(o => o === 'tech' ? 'technology & systems' : o === 'building' ? 'building & creating' : o).join(', ')}
                  </div>
                )}
              </div>
              <div className="chat-footer">
                <div className="chat-input-mock">Select options above...</div>
                <button 
                  className="btn btn-amber btn-sm"
                  onClick={() => onNavigate('discover', { prefilledOptions: selectedOptions })}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section" style={{ background: 'var(--warm-gray)' }} aria-labelledby="testimonials-heading">
        <div className="container">
          <div className="section-label" aria-hidden="true">Student stories</div>
          <h2 id="testimonials-heading" className="h2" style={{ maxWidth: '400px' }}>
            Real students. Real progress.
          </h2>
          <div className="testimonials-grid">
            <article className="testimonial-card fade-up d0">
              <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
              <p className="testimonial-text">
                "I had no idea what I wanted to do after uni. The Pathora questionnaire pointed me to Product Management, I booked a session with Taiwo, and now I have a clear 2-year plan. It's wild how much can change in 45 minutes."
              </p>
              <div className="testimonial-author">
                <div className="avatar av-amber av-36" aria-hidden="true">AO</div>
                <div>
                  <h4>Akin Osei</h4>
                  <p>Computer Science · UNN</p>
                </div>
              </div>
            </article>

            <article className="testimonial-card fade-up d1">
              <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
              <p className="testimonial-text">
                "Nkechi helped me understand what investment banking actually looks like in Nigeria vs abroad. I went in clueless, came out with internship tips and three firms to target. Pathora is genuinely different."
              </p>
              <div className="testimonial-author">
                <div className="avatar av-navy av-36" aria-hidden="true">ZK</div>
                <div>
                  <h4>Zara Kamara</h4>
                  <p>Economics · University of Lagos</p>
                </div>
              </div>
            </article>

            <article className="testimonial-card fade-up d2">
              <div className="stars" aria-label="5 out of 5 stars">★★★★★</div>
              <p className="testimonial-text">
                "I was going to give up on the tech path because I didn't know where to start. Chidi broke it down for me — portfolio first, then internships, then full-time. Simple. I'm now 3 months into my first project."
              </p>
              <div className="testimonial-author">
                <div className="avatar av-green av-36" aria-hidden="true">BN</div>
                <div>
                  <h4>Buki Nwosu</h4>
                  <p>Engineering · OAU</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CTA Banner Section */}
      <section className="cta-banner" aria-labelledby="cta-heading">
        <div className="container" style={{ position: 'relative' }}>
          <div className="section-label" style={{ color: 'rgba(232,160,32,0.7)', justifyContent: 'center' }} aria-hidden="true">
            Get started today
          </div>
          <h2 id="cta-heading" className="h2">
            Your path is here.<br />It's time to take it.
          </h2>
          <p>Thousands of African students are making clearer decisions about their futures. Join them.</p>
          <div className="cta-btn-wrap">
            <button className="btn btn-amber btn-lg" onClick={() => onNavigate('explore')}>
              Find a Consultant
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => onNavigate('discover')}>
              Discover Your Path
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
