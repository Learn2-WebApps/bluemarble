import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { createPlayerId, saveIdentity } from '../utils/playerIdentity';
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
      // 이 화면은 "신규 입장" 전용이다. 저장된 playerId 를 재사용하면 같은 브라우저의
      // 다른 참가자와 ID 를 공유하게 되어 서로의 문서를 덮어쓴다.
      // 복귀(재입장)는 Start.jsx 의 검증 경로에서만 처리하므로 여기서는 항상 새로 발급한다.
      const playersPath = ['sessions', sessionData.code, 'rooms', sessionData.roomId, 'players'];

      let playerId = null;
      let playerRef = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidateId = createPlayerId();
        const candidateRef = doc(db, ...playersPath, candidateId);
        // 이미 쓰이는 ID 면 남의 문서를 덮어쓰게 되므로 다시 뽑는다.
        const existing = await getDoc(candidateRef);
        if (!existing.exists()) {
          playerId = candidateId;
          playerRef = candidateRef;
          break;
        }
      }

      if (!playerId) {
        throw new Error('사용 가능한 playerId 를 발급하지 못했습니다.');
      }

      // 위에서 문서가 없음을 확인했으므로 이 setDoc 은 기존 참가자를 덮어쓰지 않는다.
      await setDoc(playerRef, {
        nickname: sessionData.nickname,
        color: selectedShipId,
        joinedAt: Date.now()
      });

      // 방금 발급한 신원만 저장한다. 이후 크래시/새로고침 시 복귀에 쓰인다.
      saveIdentity(sessionData.code, {
        playerId,
        roomId: sessionData.roomId,
        nickname: sessionData.nickname
      });

      const selectedShip = ships.find(s => s.id === selectedShipId);
      onSelectCharacter(selectedShip, playerId);
    } catch (error) {
      console.error("Error setting player data: ", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="character-select-container" style={styles.container}>
      <SpaceBackground />

      <div className="card-wobbly character-select-card" style={styles.card}>
        <div style={styles.header}>
          <button onClick={onBack} className="btn-wobbly" style={styles.backButton}>◀ 뒤로</button>
          <h1 className="select-title" style={styles.title}>내 <span style={{ color: 'var(--color-yellow)' }}>행성</span> 선택</h1>
          <div style={{ width: '80px' }}></div> {/* For flex centering balance */}
        </div>
        
        <p className="select-subtitle" style={styles.subtitle}>탐험을 함께할 나만의 행성을 골라주세요!</p>

        <div className="ship-grid" style={styles.shipGrid}>
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
              <h3 className="ship-label" style={styles.shipLabel}>{ship.label}</h3>
              {ship.isLocked && <span style={styles.lockedText}>{ship.owner}</span>}
              {!ship.isLocked && selectedShipId === ship.id && <span style={styles.selectedText}>선택됨!</span>}
            </div>
          ))}
        </div>

        <button 
          className="btn-wobbly select-confirm" 
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
    // 모바일 브라우저 주소창을 뺀 실제 높이. 100vh 면 아래가 잘려 스크롤이 생긴다.
    height: '100dvh',
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
    // 기본 2열(폰에서 6개가 2x3). 넓은 화면에서는 index.css 가 3열로 넓힌다.
    gridTemplateColumns: 'repeat(2, 1fr)',
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
