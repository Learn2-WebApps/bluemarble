import React, { useMemo } from 'react';
import Planet from './Planet';

export default function ResultScreen({ players, landOwnership, onHome }) {
  
  const rankings = useMemo(() => {
    // 1. 플레이어별 깃발 개수 합산
    const flagCounts = {};
    players.forEach(p => {
      flagCounts[p.id] = 0;
    });

    Object.values(landOwnership).forEach(spaceMap => {
      Object.entries(spaceMap).forEach(([playerId, count]) => {
        if (flagCounts[playerId] !== undefined) {
          flagCounts[playerId] += count;
        }
      });
    });

    // 2. 플레이어 배열에 깃발 개수 매핑 후 내림차순 정렬
    const rankedPlayers = players.map(p => ({
      ...p,
      flags: flagCounts[p.id]
    })).sort((a, b) => b.flags - a.flags);

    return rankedPlayers;
  }, [players, landOwnership]);

  return (
    <div style={styles.overlay}>
      <div className="card-wobbly" style={styles.modal}>
        <h1 style={styles.title}>게임 종료! 🎉</h1>
        <p style={styles.subtitle}>우주 탐험의 최종 결과를 확인하세요</p>

        <div style={styles.rankingList}>
          {rankings.map((p, index) => {
            const isFirst = index === 0;
            return (
              <div 
                key={p.id} 
                className={isFirst ? "wobbly-hover" : ""}
                style={{ 
                  ...styles.rankItem, 
                  ...(isFirst ? styles.firstPlace : {}),
                  borderColor: p.character?.color || 'var(--color-white)'
                }}
              >
                <div style={styles.rankInfo}>
                  <div style={{ ...styles.rankBadge, backgroundColor: p.character?.color || 'var(--color-white)' }}>
                    {isFirst ? '👑 1위' : `${index + 1}위`}
                  </div>
                  <Planet 
                    color={p.character?.color || 'var(--color-white)'} 
                    width={isFirst ? 80 : 50} 
                    height={isFirst ? 80 : 50} 
                    isLocked={false} 
                  />
                  <div style={styles.playerName}>
                    {p.name}
                  </div>
                </div>
                <div style={styles.score}>
                  🚩 <strong>{p.flags}</strong>개
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn-wobbly" style={styles.homeBtn} onClick={onHome}>
          시작 화면으로 돌아가기
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '600px',
    backgroundColor: 'var(--color-blue)',
    padding: '40px 30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '3rem',
    color: 'var(--color-yellow)',
    marginBottom: '10px',
    textShadow: '3px 3px 0 var(--color-black)',
  },
  subtitle: {
    fontSize: '1.2rem',
    color: 'var(--color-white)',
    marginBottom: '40px',
  },
  rankingList: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    marginBottom: '40px',
  },
  rankItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-white)',
    padding: '15px 20px',
    borderRadius: '15px',
    border: '4px solid var(--color-black)',
    boxShadow: '4px 4px 0 var(--color-black)',
  },
  firstPlace: {
    padding: '25px 20px',
    transform: 'scale(1.05)',
    backgroundColor: 'var(--color-yellow)',
    borderWidth: '5px',
    boxShadow: '6px 6px 0 var(--color-black)',
    zIndex: 1,
  },
  rankInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  rankBadge: {
    padding: '5px 15px',
    borderRadius: '20px',
    border: '3px solid var(--color-black)',
    fontWeight: '900',
    fontSize: '1.2rem',
    color: 'var(--color-black)',
    textShadow: '1px 1px 0 rgba(255,255,255,0.5)',
  },
  playerName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: 'var(--color-black)',
  },
  score: {
    fontSize: '1.8rem',
    color: 'var(--color-black)',
  },
  homeBtn: {
    width: '100%',
    padding: '15px',
    fontSize: '1.5rem',
    backgroundColor: 'var(--color-mint)',
    color: 'var(--color-black)',
  }
};
