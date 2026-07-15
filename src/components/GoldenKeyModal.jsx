import React, { useState, useEffect } from 'react';

export default function GoldenKeyModal({ isOpen, cardData, onApply, activePlayer }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFlipped(false);
      // Automatically flip the card after a short delay
      const timer = setTimeout(() => {
        setFlipped(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen || !cardData || !activePlayer) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modalContainer}>
        {/* Card Flip Animation Wrapper */}
        <div style={{
          ...styles.cardWrapper,
          transform: flipped ? 'rotateY(0deg)' : 'rotateY(180deg)'
        }}>
          {/* Back of the card (shown initially) */}
          {!flipped && (
            <div className="card-wobbly" style={{ ...styles.card, backgroundColor: 'var(--color-black)' }}>
              <h2 style={{ color: 'var(--color-yellow)', fontSize: '3rem', margin: 0 }}>?</h2>
              <p style={{ color: 'var(--color-white)', marginTop: '20px', fontSize: '1.2rem' }}>황금열쇠 뽑는 중...</p>
            </div>
          )}

          {/* Front of the card (shown after flip) */}
          {flipped && (
            <div className="card-wobbly" style={{ ...styles.card, backgroundColor: 'var(--color-yellow)' }}>
              <div style={styles.headerBadge}>황금열쇠</div>
              <h2 style={styles.title}>{cardData.title}</h2>
              <div style={styles.iconArea}>🔑</div>
              <p style={styles.description}>{cardData.description}</p>
              
              <button className="btn-wobbly" style={styles.confirmBtn} onClick={() => onApply(cardData)}>
                확인
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    perspective: '1000px', // For 3D flip effect
  },
  cardWrapper: {
    width: '320px',
    height: '450px',
    transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
    transformStyle: 'preserve-3d',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px 20px',
    boxSizing: 'border-box',
    border: '6px solid var(--color-black)',
  },
  headerBadge: {
    backgroundColor: 'var(--color-black)',
    color: 'var(--color-yellow)',
    padding: '5px 20px',
    borderRadius: '20px',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    marginBottom: '20px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '900',
    color: 'var(--color-black)',
    textAlign: 'center',
    marginBottom: '20px',
    wordBreak: 'keep-all',
    textShadow: 'none',
  },
  iconArea: {
    fontSize: '4rem',
    marginBottom: '20px',
    animation: 'float 2s ease-in-out infinite',
  },
  description: {
    fontFamily: '"Noto Sans KR", "Apple SD Gothic Neo", sans-serif',
    fontSize: '1.2rem',
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    lineHeight: '1.5',
    marginBottom: '30px',
    wordBreak: 'keep-all',
    whiteSpace: 'pre-wrap',
  },
  confirmBtn: {
    marginTop: 'auto',
    width: '100%',
    fontSize: '1.2rem',
    padding: '15px',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-black)',
  }
};
