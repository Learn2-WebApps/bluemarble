import React from 'react';

export default function StealSelectionModal({ isOpen, othersLands, players, board, onSelect }) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div className="card-wobbly" style={styles.modal}>
        <h2 style={styles.title}>우주 해적의 습격! 🏴‍☠️</h2>
        <p style={styles.description}>어느 구역의 깃발을 강탈하시겠습니까?</p>
        
        {othersLands.length === 0 ? (
          <div style={styles.emptyMsg}>
            <p>앗, 뺏을 수 있는 남의 깃발이 하나도 없습니다!</p>
            <button className="btn-wobbly" style={styles.btn} onClick={() => onSelect(null)}>아쉽지만 돌아가기</button>
          </div>
        ) : (
          <div style={styles.list}>
            {othersLands.map((land, idx) => {
              const owner = players.find(p => p.id === land.ownerId);
              const space = board.find(s => s.id === land.spaceId);
              return (
                <button 
                  key={idx} 
                  className="btn-wobbly" 
                  style={{ ...styles.btn, backgroundColor: space.color }}
                  onClick={() => onSelect(land)}
                >
                  <span style={styles.ownerBadge}>{owner.name}</span> 의 
                  <strong> {space.name}</strong> 깃발 뺏기
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1100,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: 'var(--color-black)',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  title: {
    fontSize: '2rem',
    color: 'var(--color-yellow)',
    marginBottom: '10px',
    textShadow: 'none',
  },
  description: {
    color: 'var(--color-white)',
    fontSize: '1.2rem',
    marginBottom: '20px',
    textAlign: 'center',
    wordBreak: 'keep-all',
  },
  emptyMsg: {
    color: 'var(--color-white)',
    textAlign: 'center',
    fontSize: '1.2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%',
    maxHeight: '60vh',
    overflowY: 'auto',
    padding: '10px',
  },
  btn: {
    width: '100%',
    padding: '15px',
    fontSize: '1.2rem',
    color: 'var(--color-black)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    border: '4px solid var(--color-black)',
  },
  ownerBadge: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontWeight: 'bold',
  }
};
