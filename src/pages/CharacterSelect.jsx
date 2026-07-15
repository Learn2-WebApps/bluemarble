import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import SpaceBackground from '../components/SpaceBackground';
import Planet from '../components/Planet';

export default function CharacterSelect({ sessionData, onSelectCharacter, onBack }) {
  const [selectedShipId, setSelectedShipId] = useState(null);
  const [takenShips, setTakenShips] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionData?.code || !sessionData?.roomId) return;

    const playersRef = collection(db, 'sessions', sessionData.code, 'rooms', sessionData.roomId, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const taken = {};
      snapshot.forEach(docSnap => {
        // 내 playerId가 없는 상태이므로 그냥 모든 player 색상을 잠금 처리함
        // App.jsx에 playerId가 없지만, 일단 닉네임으로 본인인지 확인하는 것도 가능. 일단 모두 타인 점유로 침
        taken[docSnap.data().color] = docSnap.data().nickname;
      });
      setTakenShips(taken);
      
      if (selectedShipId && taken[selectedShipId]) {
        setSelectedShipId(null);
      }
    });

    return () => unsubscribe();
  }, [sessionData?.code, sessionData?.roomId, selectedShipId]);

  const baseShips = [
    { id: 'red', color: 'var(--color-red)', label: '레드 행성' },
    { id: 'blue', color: 'var(--color-blue)', label: '블루 행성' },
    { id: 'mint', color: 'var(--color-mint)', label: '민트 행성' },
    { id: 'yellow', color: 'var(--color-yellow)', label: '옐로우 행성' },
    { id: 'pink', color: 'var(--color-pink)', label: '핑크 행성' },
    { id: 'rainbow', color: 'rainbow', label: '무지개 행성' }
  ];

  const ships = baseShips.map(ship => ({
    ...ship,
    isLocked: !!takenShips[ship.id],
    owner: takenShips[ship.id] || null
  }));

  const handleConfirm = async () => {
    if (!selectedShipId || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const playerId = Math.random().toString(36).substring(2, 9);
      const playerRef = doc(db, 'sessions', sessionData.code, 'rooms', sessionData.roomId, 'players', playerId);
      await setDoc(playerRef, {
        nickname: sessionData.nickname,
        color: selectedShipId,
        joinedAt: Date.now()
      });
      
      const selectedShip = ships.find(s => s.id === selectedShipId);
      onSelectCharacter(selectedShip, playerId);
    } catch (error) {
      console.error("Error setting player data: ", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <SpaceBackground />

      <div className="card-wobbly" style={styles.card}>
        <div style={styles.header}>
          <button onClick={onBack} className="btn-wobbly" style={styles.backButton}>◀ 뒤로</button>
          <h1 style={styles.title}>내 <span style={{ color: 'var(--color-yellow)' }}>행성</span> 선택</h1>
          <div style={{ width: '80px' }}></div> {/* For flex centering balance */}
        </div>
        
        <p style={styles.subtitle}>탐험을 함께할 나만의 행성을 골라주세요!</p>

        <div style={styles.shipGrid}>
          {ships.map((ship) => (
            <div 
              key={ship.id} 
              className={`ship-card ${!ship.isLocked ? 'wobbly-hover' : ''}`}
              style={{ 
                ...styles.shipCard, 
                backgroundColor: selectedShipId === ship.id ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                borderColor: selectedShipId === ship.id ? 'var(--color-black)' : 'var(--color-black)',
                transform: selectedShipId === ship.id ? 'scale(1.05)' : 'none',
                boxShadow: selectedShipId === ship.id ? '8px 8px 0 var(--color-black)' : '4px 4px 0 var(--color-black)',
                cursor: ship.isLocked ? 'not-allowed' : 'pointer',
              }}
              onClick={() => {
                if (!ship.isLocked) setSelectedShipId(ship.id);
              }}
            >
              <Planet color={ship.color} isLocked={ship.isLocked} />
              <h3 style={styles.shipLabel}>{ship.label}</h3>
              {ship.isLocked && <span style={styles.lockedText}>{ship.owner}</span>}
              {!ship.isLocked && selectedShipId === ship.id && <span style={styles.selectedText}>선택됨!</span>}
            </div>
          ))}
        </div>

        <button 
          className="btn-wobbly" 
          style={{ ...styles.confirmButton, opacity: selectedShipId ? 1 : 0.5 }}
          onClick={handleConfirm}
        >
          준비 완료 🚀
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  card: {
    backgroundColor: 'var(--color-mint)',
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '800px', // Landscape friendly
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    overflowY: 'auto',
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  backButton: {
    fontSize: '1rem',
    padding: '8px 15px',
    backgroundColor: 'var(--color-white)',
  },
  title: {
    fontSize: '2.5rem',
    color: 'var(--color-white)',
    textShadow: '3px 3px 0 var(--color-black)',
    margin: 0,
  },
  subtitle: {
    fontSize: '1.2rem',
    marginBottom: '20px',
    fontWeight: 'bold',
    color: 'var(--color-black)',
  },
  shipGrid: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '20px',
    padding: '10px',
    marginBottom: '20px',
  },
  shipCard: {
    border: '4px solid var(--color-black)',
    borderRadius: 'var(--wobbly-radius-2)',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  shipLabel: {
    fontSize: '1.2rem',
    color: 'var(--color-black)',
    margin: 0,
    textShadow: 'none',
  },
  lockedText: {
    fontSize: '0.9rem',
    color: '#D32F2F',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '2px solid #D32F2F',
  },
  selectedText: {
    fontSize: '0.9rem',
    color: '#388E3C',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '2px solid #388E3C',
    position: 'absolute',
    top: '-10px',
    right: '-10px',
    transform: 'rotate(10deg)',
  },
  confirmButton: {
    fontSize: '1.3rem',
    padding: '15px 40px',
    width: '100%',
    maxWidth: '300px',
  }
};
