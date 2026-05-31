import React from 'react';

export default function ConsultantCard({ consultant, onSelect }) {
  const {
    id,
    name,
    role,
    company,
    sector,
    experience,
    avatarInitials,
    avatarBg,
    tags,
    availability,
    sessionsCount
  } = consultant;

  const handleCardClick = (e) => {
    // Avoid triggering card navigation if they click a button directly
    if (e.target.closest('.btn')) return;
    onSelect(id);
  };

  return (
    <article 
      className="c-card fade-up d1" 
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="c-card-header">
        <div className={`avatar ${avatarBg} av-48`} aria-hidden="true">
          {avatarInitials}
        </div>
        <div className="c-card-info">
          <div className="c-card-name">{name}</div>
          <div className="c-card-role">{role} · {company}</div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span className="pill pill-amber">{sector}</span>
        <span className="c-card-exp">{experience} years experience</span>
      </div>
      
      <div className="c-card-tags">
        {tags.map((tag, idx) => (
          <span key={idx} className="tag">{tag}</span>
        ))}
      </div>
      
      <div className="c-card-footer">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div className="avail">{availability}</div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{sessionsCount} sessions</span>
        </div>
        <button 
          className="btn btn-amber btn-full"
          onClick={() => onSelect(id)}
        >
          Book a Session
        </button>
      </div>
    </article>
  );
}
