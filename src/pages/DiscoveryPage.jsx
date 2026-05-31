import React, { useState, useEffect } from 'react';
import { MOCK_CONSULTANTS } from '../mockData';

const STEPS = [
  {
    id: 0,
    label: 'Step 1 of 6',
    question: "Let's figure out where you're headed. How would you describe yourself right now?",
    subtext: "There's no wrong answer — this helps us understand where you're starting from.",
    multi: false,
    options: [
      { label: "I have some ideas but I'm not sure", signal: 'tech' },
      { label: "I'm completely lost and that's okay", signal: 'business' },
      { label: "I know what I want but need direction", signal: 'finance' },
      { label: "I'm curious about my options", signal: 'tech' },
    ]
  },
  {
    id: 1,
    label: 'Step 2 of 6',
    question: "What topics genuinely excite you? Pick all that apply.",
    subtext: "Select everything that resonates — there's no limit.",
    multi: true,
    twoCol: true,
    options: [
      { label: "Building & Creating", emoji: "🔨", signal: 'tech' },
      { label: "Numbers & Analysis", emoji: "📊", signal: 'finance' },
      { label: "People & Communication", emoji: "🤝", signal: 'business' },
      { label: "Technology & Systems", emoji: "💻", signal: 'tech' },
      { label: "Business & Strategy", emoji: "📈", signal: 'business' },
      { label: "Research & Learning", emoji: "🔬", signal: 'finance' },
      { label: "Design & Aesthetics", emoji: "✦", signal: 'tech' },
      { label: "Leadership & Impact", emoji: "⚡", signal: 'business' },
    ]
  },
  {
    id: 2,
    label: 'Step 3 of 6',
    question: "Which environment sounds most like you?",
    subtext: "Think about where you naturally thrive.",
    multi: false,
    options: [
      { label: "I like solving problems with logic and data", signal: 'finance' },
      { label: "I like building things people actually use", signal: 'tech' },
      { label: "I like understanding how markets and money work", signal: 'finance' },
      { label: "I like leading, communicating, and convincing people", signal: 'business' },
    ]
  },
  {
    id: 3,
    label: 'Step 4 of 6',
    question: "What do people come to you for?",
    subtext: "Your natural strengths say a lot about where you'll excel.",
    multi: false,
    options: [
      { label: "Explaining complex things simply", signal: 'business' },
      { label: "Figuring out why something isn't working", signal: 'tech' },
      { label: "Coming up with creative ideas", signal: 'tech' },
      { label: "Getting things organised and done", signal: 'finance' },
      { label: "Understanding people and situations", signal: 'business' },
    ]
  },
  {
    id: 4,
    label: 'Step 5 of 6',
    question: "In 10 years, which version of you sounds right?",
    subtext: "Don't overthink it — go with what feels true.",
    multi: false,
    options: [
      { label: "Running my own company", signal: 'business' },
      { label: "Leading a team at a major company", signal: 'business' },
      { label: "Being the expert everyone calls", signal: 'finance' },
      { label: "Creating things that exist in the world", signal: 'tech' },
      { label: "Making systems and institutions work better", signal: 'tech' },
    ]
  },
  {
    id: 5,
    label: 'Step 6 of 6',
    question: "One last thing — what are you studying or what field are you in?",
    subtext: "This helps us personalise your results. Skip if you'd prefer.",
    multi: false,
    isTextStep: true
  }
];

const CAREER_PATHS = {
  tech: {
    primary: {
      title: "Product Design & UX",
      sector: "Technology",
      badge: "Your Strongest Match",
      description: "You have a rare blend of systems thinking, creativity, and user empathy — the exact combination that makes great product designers and UX leads. You understand that technology should serve people, not the other way around, and that instinct is what separates good designers from exceptional ones.",
      skills: ["User Research", "Figma & Prototyping", "Product Thinking", "Information Architecture", "Usability Testing"],
      locations: ["Lagos", "Nairobi", "Kigali", "Cape Town", "Accra"],
      roadmap: [
        { label: "Year 1", text: "Build portfolio with 3 case studies. Learn Figma. Complete a UX bootcamp or structured self-study." },
        { label: "Year 2", text: "Land a junior design role or internship at a startup. Contribute to real products." },
        { label: "Year 3+", text: "Senior designer or product lead. Specialise in a domain — fintech, health, education." }
      ]
    },
    secondary: [
      { title: "Software Engineering", description: "Build the actual products you love using. Engineering opens every door in tech — from startups to global companies.", sector: "Technology" },
      { title: "Product Management", description: "Lead product strategy and work at the intersection of design, engineering, and business. High impact, high growth.", sector: "Technology" }
    ],
    consultants: ['taiwo', 'chidi']
  },
  finance: {
    primary: {
      title: "Investment Banking & Financial Analysis",
      sector: "Finance",
      badge: "Your Strongest Match",
      description: "You're driven by precision, patterns, and the logic of markets. You understand that financial modelling isn't just maths — it's storytelling with numbers. Your combination of analytical rigour and structured thinking makes you well-suited to Africa's growing financial services sector.",
      skills: ["Financial Modelling", "Valuation", "Excel & PowerPoint", "Market Research", "Investment Analysis"],
      locations: ["Lagos", "Johannesburg", "Nairobi", "Accra", "Kigali"],
      roadmap: [
        { label: "Year 1", text: "Master Excel and financial modelling fundamentals. Target Big 4 or graduate banking programmes." },
        { label: "Year 2", text: "Analyst role at a bank, consulting firm, or investment fund. Build your deal track record." },
        { label: "Year 3+", text: "Associate level. Specialise in sectors — energy, telecoms, agribusiness — where African deals are biggest." }
      ]
    },
    secondary: [
      { title: "Management Consulting", description: "Solve business problems for major organisations. Work across industries and build a broad foundation.", sector: "Finance" },
      { title: "Fintech & Digital Finance", description: "Combine finance knowledge with tech's pace. Africa's fintech sector is one of the world's fastest-growing.", sector: "Finance" }
    ],
    consultants: ['nkechi', 'fatima']
  },
  business: {
    primary: {
      title: "Brand Strategy & Marketing",
      sector: "Business",
      badge: "Your Strongest Match",
      description: "You have a natural gift for understanding people — what moves them, what they value, how they make decisions. Marketing and brand strategy is where that human intelligence becomes your greatest professional asset. You see the stories behind the data and the emotion behind the strategy.",
      skills: ["Brand Positioning", "Digital Marketing", "Consumer Insights", "Campaign Strategy", "Leadership"],
      locations: ["Lagos", "Abidjan", "Accra", "Nairobi", "Kigali"],
      roadmap: [
        { label: "Year 1", text: "Learn digital marketing fundamentals. Work on campaigns — agency or brand-side. Build your portfolio." },
        { label: "Year 2", text: "Marketing manager role. Own a channel or campaign type. Start developing strategic thinking." },
        { label: "Year 3+", text: "Senior marketing or brand lead. Drive strategy across an entire business unit or brand." }
      ]
    },
    secondary: [
      { title: "Entrepreneurship & Startups", description: "Build something from scratch. Your understanding of people and markets is exactly what founders need.", sector: "Business" },
      { title: "Business Development", description: "Open new markets, close partnerships, grow revenue. The most relationship-driven role in business.", sector: "Business" }
    ],
    consultants: ['amara', 'tunde']
  }
};

const LOADING_TEXTS = [
  "Analysing your answers...",
  "Finding your strongest matches...",
  "Building your roadmap...",
  "Almost ready..."
];

export const computeMatchFromAnswers = (answers) => {
  const scores = { tech: 0, finance: 0, business: 0 };
  answers.forEach((stepAnswers, stepIdx) => {
    const step = STEPS[stepIdx];
    if (step.isTextStep || !step.options) return;
    stepAnswers.forEach((optIdx) => {
      const opt = step.options[optIdx];
      if (opt && opt.signal && scores[opt.signal] !== undefined) {
        scores[opt.signal]++;
      }
    });
  });
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
};

export default function DiscoveryPage({ onSelectConsultant, onNavigate, onSetCareerMatch, onShowToast }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState(new Array(STEPS.length).fill([]));
  const [textAnswer, setTextAnswer] = useState('');
  const [status, setStatus] = useState('form'); // 'form', 'loading', 'results'
  const [loadingTextIdx, setLoadingTextIdx] = useState(0);
  const [isSlideExiting, setIsSlideExiting] = useState(false);

  // Loading text rotation
  useEffect(() => {
    let interval;
    if (status === 'loading') {
      interval = setInterval(() => {
        setLoadingTextIdx((prev) => (prev + 1) % LOADING_TEXTS.length);
      }, 600);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleOptionSelect = (optionIdx, isMulti) => {
    const currentAnswers = [...answers[currentStep]];
    if (isMulti) {
      if (currentAnswers.includes(optionIdx)) {
        setAnswers(
          answers.map((ans, idx) =>
            idx === currentStep ? currentAnswers.filter((a) => a !== optionIdx) : ans
          )
        );
      } else {
        setAnswers(
          answers.map((ans, idx) =>
            idx === currentStep ? [...currentAnswers, optionIdx] : ans
          )
        );
      }
    } else {
      setAnswers(
        answers.map((ans, idx) => (idx === currentStep ? [optionIdx] : ans))
      );
      // Auto-advance single-select options after brief delay
      setTimeout(() => handleNext(), 350);
    }
  };

  const handleNext = () => {
    setIsSlideExiting(true);
    setTimeout(() => {
      setIsSlideExiting(false);
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        triggerLoading();
      }
    }, 250);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setIsSlideExiting(true);
      setTimeout(() => {
        setIsSlideExiting(false);
        setCurrentStep(prev => prev - 1);
      }, 250);
    }
  };

  const triggerLoading = () => {
    setStatus('loading');
    setTimeout(() => {
      setStatus('results');
      const finalMatch = computeMatchFromAnswers(answers);
      const matchedTitle = CAREER_PATHS[finalMatch].primary.title;
      onSetCareerMatch(matchedTitle); // Propagate up to save in app state & user profile
    }, 2500);
  };

  const handleRetake = () => {
    setAnswers(new Array(STEPS.length).fill([]));
    setTextAnswer('');
    setCurrentStep(0);
    setStatus('form');
  };

  if (status === 'loading') {
    return (
      <div className="loading-screen visible" aria-live="polite" aria-label="Analysing your answers">
        <div className="loading-geo loading-geo-1" aria-hidden="true"></div>
        <div className="loading-geo loading-geo-2" aria-hidden="true"></div>
        <div className="loading-card">
          <div className="loading-logo">Path<span className="accent">ora</span></div>
          <div className="loading-dots" aria-hidden="true">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
          <div className="loading-text" style={{ transition: 'opacity 150ms ease-in-out' }}>
            {LOADING_TEXTS[loadingTextIdx]}
          </div>
          <div className="loading-subtext">This takes just a moment</div>
        </div>
      </div>
    );
  }

  if (status === 'results') {
    const matchType = computeMatchFromAnswers(answers);
    const path = CAREER_PATHS[matchType];
    const primary = path.primary;

    // Filter bridge consultants
    const bridgeConsultants = MOCK_CONSULTANTS.filter(
      c => path.consultants.includes(c.id)
    );

    return (
      <div className="results-page visible" id="resultsPage">
        {/* Results Header */}
        <div className="results-header">
          <div className="container">
            <div className="results-header-inner">
              <div className="section-label" aria-hidden="true">Your results</div>
              <h1>Here's what we found for you.</h1>
              <p>Based on your answers, these career paths align strongly with who you are and what you'll excel at.</p>
            </div>
          </div>
        </div>

        {/* Results Content */}
        <div className="results-content">
          <div className="container">
            {/* Primary Match */}
            <div className="primary-match">
              <div className="match-badge-row">
                <span className="pill pill-amber" style={{ fontSize: '12px', padding: '4px 12px' }}>
                  {primary.badge}
                </span>
                <span className="pill pill-amber" style={{ fontSize: '12px', padding: '4px 12px' }}>
                  {primary.sector}
                </span>
              </div>
              <h2>{primary.title}</h2>
              <p className="match-description">{primary.description}</p>
              
              <div className="match-skills">
                <div className="match-skills-label">Key skills this path uses</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '6px' }}>
                  {primary.skills.map((s, idx) => (
                    <span key={idx} className="tag" style={{ padding: '5px 11px', fontSize: '12px' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="match-skills-label" style={{ marginBottom: '8px' }}>Typical roles in Africa</div>
              <div className="match-locations">
                {primary.locations.map((loc, idx) => (
                  <span key={idx} className="location-chip">{loc}</span>
                ))}
              </div>
              
              <div className="roadmap">
                {primary.roadmap.map((step, idx) => (
                  <div key={idx} className="roadmap-step">
                    <div className="roadmap-step-label">{step.label}</div>
                    <p>{step.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Secondary Matches */}
            <div className="secondary-grid">
              {path.secondary.map((s, idx) => (
                <div 
                  key={idx} 
                  className="secondary-match"
                  onClick={() => onNavigate('explore', { sector: s.sector.toLowerCase() })}
                >
                  <div className="match-badge-row" style={{ marginBottom: '10px' }}>
                    <span className="pill pill-navy" style={{ fontSize: '11px' }}>Good Match</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.description}</p>
                  <div className="explore-link">
                    Explore this path 
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>

            {/* THE BRIDGE — MANDATORY */}
            <div className="bridge-section" id="bridgeSection">
              <div className="bridge-header">
                <div className="section-label" aria-hidden="true">Next step</div>
                <h2>Talk to someone in this field.</h2>
                <p>These consultants work in {primary.sector}. Book a free session and ask them everything.</p>
              </div>
              
              <div className="bridge-grid">
                {bridgeConsultants.map((c) => (
                  <article 
                    key={c.id} 
                    className="c-card" 
                    onClick={() => onSelectConsultant(c.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="c-card-header">
                      <div className={`avatar ${c.avatarBg} av-48`}>{c.avatarInitials}</div>
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
              
              <div className="bridge-link">
                <button 
                  className="btn btn-outline"
                  onClick={() => onNavigate('explore', { sector: primary.sector.toLowerCase() })}
                  style={{ background: 'none', border: 'none', fontWeight: 600, color: 'var(--amber-dark)' }}
                >
                  See all {primary.sector} consultants →
                </button>
              </div>
            </div>

            {/* Actions banner */}
            <div className="results-actions">
              <p>Save your results and track your progress over time.</p>
              <div className="results-actions-btns">
                <button 
                  className="btn btn-amber" 
                  onClick={() => onShowToast("Create an account to save your roadmap results!", "info")}
                >
                  Save My Results
                </button>
                <button className="btn btn-outline" onClick={handleRetake}>
                  Retake Assessment
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Active step info
  const step = STEPS[currentStep];
  const stepAnswers = answers[currentStep] || [];
  const isNextDisabled = !step.isTextStep && stepAnswers.length === 0;

  return (
    <div className="discover-page">
      {/* Progress indicators */}
      <div className="progress-bar-wrap" aria-label="Questionnaire progress">
        <div className="container">
          <div className="progress-steps" role="list">
            {STEPS.map((s, idx) => (
              <React.Fragment key={idx}>
                <div 
                  className={`progress-step-wrap ${idx === currentStep ? 'active' : ''}`} 
                  role="listitem"
                >
                  <div 
                    className={`progress-dot ${
                      idx < currentStep ? 'done' : idx === currentStep ? 'active' : 'upcoming'
                    }`}
                  >
                    {idx < currentStep ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div className="progress-dot-label">
                    {idx === 0 ? 'Start' : idx === 1 ? 'Interests' : idx === 2 ? 'Style' : idx === 3 ? 'Strengths' : idx === 4 ? 'Vision' : 'Context'}
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`progress-connector ${idx < currentStep ? 'done' : ''}`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Step Slide */}
      <div className="step-container">
        <div className={`step-slide ${isSlideExiting ? 'exiting' : ''}`} role="form" aria-label={step.label}>
          <div className="step-num-label">{step.label}</div>
          <h2 className="step-question">{step.question}</h2>
          <p className="step-subtext">{step.subtext}</p>
          
          {step.isTextStep ? (
            <textarea 
              className="text-step-input" 
              placeholder="e.g. Computer Science, Economics, Secondary school..." 
              aria-label={step.question}
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
            />
          ) : (
            <div className={step.twoCol ? 'options-grid two-col' : 'options-grid'} role="group" aria-label="Answer options">
              {step.options.map((opt, oIdx) => {
                const isSelected = stepAnswers.includes(oIdx);
                return (
                  <button 
                    key={oIdx}
                    className={`option-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(oIdx, step.multi)}
                    aria-pressed={isSelected}
                  >
                    {opt.emoji && <span className="option-emoji" aria-hidden="true">{opt.emoji}</span>}
                    <span>{opt.label}</span>
                    <span className="option-check" aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Controls */}
          <div className="step-footer">
            <button 
              className="step-back-btn" 
              onClick={handleBack} 
              style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }} 
              aria-label="Go back"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            
            <div className="step-next-group">
              {step.isTextStep && (
                <button className="step-skip-btn" onClick={() => { setTextAnswer(''); handleNext(); }}>
                  Skip
                </button>
              )}
              <button 
                className="btn btn-amber" 
                onClick={handleNext}
                disabled={isNextDisabled}
                style={{ opacity: isNextDisabled ? 0.45 : 1 }}
              >
                {currentStep === STEPS.length - 1 ? 'See My Results →' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
