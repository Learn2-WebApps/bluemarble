import React from 'react';

export default function SpaceBackground({ minimal = false }) {
  if (minimal) return null;

  return (
    <>
      {/* 1. Planet */}
      <div style={{ ...styles.deco, top: '15%', left: '8%', animationDelay: '0s', transform: 'rotate(-10deg)' }} className="floating">
        <svg width="200" height="200" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
          <path d="M 10 70 A 45 15 -20 0 1 90 30" fill="none" stroke="#FFC800" strokeWidth="6" strokeLinecap="round" />
          <circle cx="50" cy="50" r="30" fill="var(--color-mint)" />
          <path d="M 90 30 A 45 15 -20 0 1 10 70" fill="none" stroke="#FF9500" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>

      {/* 2. Star */}
      <div style={{ ...styles.deco, top: '25%', right: '20%', animationDelay: '0.5s' }} className="floating">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <polygon points="50,5 61,35 95,35 68,54 78,85 50,65 22,85 32,54 5,35 39,35" fill="var(--color-yellow)" />
        </svg>
      </div>

      {/* 3. Rocket */}
      <div style={{ ...styles.deco, bottom: '15%', right: '10%', animationDelay: '1s', transform: 'rotate(45deg)' }} className="floating">
        <svg width="150" height="150" viewBox="0 0 100 100">
          <path d="M 30 80 Q 50 100 70 80 L 80 50 Q 50 10 20 50 Z" fill="var(--color-red)" />
          <circle cx="50" cy="50" r="10" fill="var(--color-blue)" />
          <path d="M 40 90 L 50 100 L 60 90 Z" fill="var(--color-yellow)" />
        </svg>
      </div>

      {/* 4. Cloud */}
      <div style={{ ...styles.deco, bottom: '30%', left: '5%', animationDelay: '0.2s' }} className="floating">
        <svg width="175" height="100" viewBox="0 0 100 60">
          <path d="M 20 50 Q 10 50 10 40 Q 10 30 25 30 Q 30 10 50 10 Q 70 10 75 30 Q 90 30 90 40 Q 90 50 80 50 Z" fill="var(--color-blue)" />
        </svg>
      </div>

      {/* 5. Moon / Crater */}
      <div style={{ ...styles.deco, bottom: '20%', left: '25%', animationDelay: '1.2s' }} className="floating">
        <svg width="125" height="125" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="#555" />
          <circle cx="35" cy="40" r="8" fill="#333" />
          <circle cx="65" cy="55" r="12" fill="#333" />
          <circle cx="45" cy="70" r="6" fill="#333" />
        </svg>
      </div>
    </>
  );
}

const styles = {
  deco: {
    position: 'absolute',
    userSelect: 'none',
    zIndex: 0,
  }
};
