import React from 'react';
import Planet from './Planet';

const formatSpaceName = (name) => {
  if (name === '자기계발') return '자기\n계발';
  if (name === '갈등상황') return '갈등\n상황';
  if (name === '황금열쇠') return '황금\n열쇠';
  if (name === '돈/소비') return '돈/\n소비';
  return name;
};

export default function BoardSpace({ space, players = [], owners = [] }) {
  const isStart = space.id === 0;
  const isGoldenKey = space.type === 'goldenKey';

  return (
    <div 
      className="wobbly-hover"
      style={{
        ...styles.spaceContainer,
        backgroundColor: space.color,
      }}
    >
      <div style={{
        ...styles.nameContainer,
        color: 'var(--color-black)',
      }}>
        {/* 소유자 깃발 표시 (카테고리명 바로 위, 여러 명일 경우 나란히) */}
        {owners.length > 0 && !isStart && !isGoldenKey && (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '2px' }}>
            {owners.map((owner, idx) => (
              <svg key={idx} width="20" height="30" viewBox="0 0 24 36" style={{ overflow: 'visible' }}>
                {owner.character?.color === 'rainbow' && (
                  <defs>
                    <linearGradient id={`rainbow-flag-${space.id}-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF4B3E" />
                      <stop offset="33%" stopColor="#FFC800" />
                      <stop offset="66%" stopColor="#00C996" />
                      <stop offset="100%" stopColor="#3EA1FF" />
                    </linearGradient>
                  </defs>
                )}
                <path d="M 4 0 L 4 36" stroke="var(--color-black)" strokeWidth="4" strokeLinecap="round" />
                <path 
                  d="M 4 2 L 24 10 L 4 18 Z" 
                  fill={owner.character?.color === 'rainbow' ? `url(#rainbow-flag-${space.id}-${idx})` : (owner.character?.color || 'var(--color-white)')} 
                  stroke="var(--color-black)" 
                  strokeWidth="3" 
                  strokeLinejoin="round" 
                />
              </svg>
            ))}
          </div>
        )}
        <div>{formatSpaceName(space.name)}</div>
      </div>
      
      {/* 토큰(플레이어) 렌더링 영역 - 반응형 행성 아이콘 */}
      <div style={styles.tokenArea}>
        {players.map((p, idx) => (
          <div key={idx} title={p.name} style={{ margin: '-5px', filter: 'drop-shadow(0px 0px 8px rgba(255,255,255,0.9)) drop-shadow(0px 0px 3px rgba(255,255,255,1))' }}>
            <Planet 
              color={p.character?.color || 'var(--color-white)'} 
              width="5vmin" 
              height="5vmin" 
              isLocked={false} 
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  spaceContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    border: '3px solid var(--color-black)',
    borderRadius: 'var(--wobbly-radius-2)',
    padding: '4px',
    boxShadow: 'inset 2px 2px 0 rgba(255,255,255,0.4), 2px 2px 0 var(--color-black)',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
  },
  nameContainer: {
    fontSize: 'clamp(0.9rem, 2.5vmin, 3rem)',
    fontWeight: 'bold',
    textAlign: 'center',
    wordBreak: 'keep-all',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.2',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '95%',
    textShadow: 'none',
    zIndex: 1,
  },
  tokenArea: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: '4px',
    width: '100%',
    paddingBottom: '2px',
    minHeight: '20px',
    position: 'relative',
    zIndex: 2,
  },
  token: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid var(--color-black)',
    boxShadow: '1px 1px 0 var(--color-black)',
  },
  flagContainer: {
    position: 'absolute',
    top: '2px',
    right: '2px',
    zIndex: 3,
  }
};
