import React from 'react';

export default function Planet({ color, isLocked, width = 80, height = 80, ringColor = 'rgba(255,255,255,0.9)' }) {
  const isRainbow = color === 'rainbow';
  const backRingColor = ringColor.includes('255,255,255') ? 'rgba(255,255,255,0.6)' : ringColor;
  
  return (
    <svg width={width} height={height} viewBox="0 0 100 100" style={{ overflow: 'visible', filter: isLocked ? 'grayscale(80%) opacity(0.5)' : 'none' }}>
      {isRainbow && (
        <defs>
          <linearGradient id="rainbow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4B3E" />
            <stop offset="33%" stopColor="#FFC800" />
            <stop offset="66%" stopColor="#00C996" />
            <stop offset="100%" stopColor="#3EA1FF" />
          </linearGradient>
        </defs>
      )}
      <path d="M 10 70 A 45 15 -20 0 1 90 30" fill="none" stroke={backRingColor} strokeWidth="6" strokeLinecap="round" />
      <circle cx="50" cy="50" r="30" fill={isRainbow ? 'url(#rainbow-grad)' : color} />
      <path d="M 90 30 A 45 15 -20 0 1 10 70" fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round" />
      {isLocked && (
        <text x="50" y="60" fontSize="40" textAnchor="middle" fill="#000" style={{ textShadow: '2px 2px 0 #fff' }}>🔒</text>
      )}
    </svg>
  );
}
