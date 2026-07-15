import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import SpaceBackground from '../components/SpaceBackground';
import Planet from '../components/Planet';

export default function WaitingRoom({ sessionData, onStartGame, onBack }) {
  const { code, nickname, character } = sessionData;
  const [participants, setParticipants] = useState([]);
  const [isGameStarted, setIsGameStarted] = useState(false);

  const handleBackClick = async () => {
    if (sessionData?.playerId && code && sessionData?.roomId) {
      try {
        const playerRef = doc(db, 'sessions', code, 'rooms', sessionData.roomId, 'players', sessionData.playerId);
        await deleteDoc(playerRef);
      } catch (e) {
        console.error("Failed to delete player doc:", e);
      }
    }
    onBack();
  };

  useEffect(() => {
    if (!code || !sessionData?.roomId) return;

    const playersRef = collection(db, 'sessions', code, 'rooms', sessionData.roomId, 'players');
    const unsubscribePlayers = onSnapshot(playersRef, (snapshot) => {
      const playerList = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        playerList.push({
          id: docSnap.id,
          name: data.nickname,
          color: data.color === 'rainbow' ? 'rainbow' : `var(--color-${data.color})`,
          label: data.color + ' 행성',
          isMe: docSnap.id === sessionData.playerId, // Use playerId to identify ME
          joinedAt: data.joinedAt
        });
      });
      playerList.sort((a, b) => a.joinedAt - b.joinedAt);
      setParticipants(playerList);
    });

    return () => unsubscribePlayers();
  }, [code, sessionData?.roomId, sessionData?.playerId]);

  useEffect(() => {
    if (!code) return;

    const sessionRef = doc(db, 'sessions', code);
    const unsubscribeSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().isStarted) {
        setIsGameStarted(true);
      } else {
        setIsGameStarted(false);
      }
    });

    return () => unsubscribeSession();
  }, [code]);

  useEffect(() => {
    if (isGameStarted) {
      onStartGame();
    }
  }, [isGameStarted, onStartGame]);

  return (
    <div style={styles.container}>
      <SpaceBackground />

      <div className="card-wobbly" style={styles.card}>
        <div style={styles.header}>
          <button onClick={handleBackClick} className="btn-wobbly" style={styles.backButton}>◀ 뒤로</button>
          <h1 style={styles.title}>탐험 <span style={{ color: 'var(--color-yellow)' }}>대기실</span></h1>
          <div style={{ width: '80px' }}></div>
        </div>
        
        <p style={styles.subtitle}>
          탐험 코드: <span style={styles.codeHighlight}>{code || '임시코드'}</span>
        </p>

        <div style={styles.contentArea}>
          {/* 왼쪽: 참가자 목록 */}
          <div style={styles.participantsSection}>
            <h2 style={styles.sectionTitle}>👨‍🚀 현재 참가자 ({participants.length}/6)</h2>
            <div style={styles.participantList}>
              {participants.map((p) => (
                <div key={p.id} style={{ 
                  ...styles.participantCard, 
                  backgroundColor: p.isMe ? 'rgba(255, 200, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                  borderColor: p.isMe ? 'var(--color-yellow)' : 'var(--color-black)',
                  borderWidth: p.isMe ? '5px' : '4px',
                }}>
                  <Planet color={p.color} isLocked={false} width={60} height={60} />
                  <div style={styles.participantInfo}>
                    <span style={styles.participantName}>
                      {p.name} {p.isMe && <span style={styles.meTag}>ME</span>}
                    </span>
                    <span style={styles.participantCharacter}>{p.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 오른쪽: 대기 상태 */}
          <div style={styles.waitingSection}>
            <div className="floating" style={styles.waitingAnimation}>
              ⏳
            </div>
            <h2 style={styles.waitingText}>강사의 시작을 기다리는 중...</h2>
            <p style={styles.waitingSubtext}>모든 대원이 모이면 탐험이 시작됩니다!</p>
          </div>
        </div>
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
    maxWidth: '900px', // Landscape friendly
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
    marginBottom: '5px',
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
  codeHighlight: {
    backgroundColor: 'var(--color-white)',
    padding: '4px 12px',
    borderRadius: '15px',
    border: '2px solid var(--color-black)',
    color: 'var(--color-red)',
    fontSize: '1.4rem',
  },
  contentArea: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    gap: '30px',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  participantsSection: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    backgroundColor: 'var(--color-blue)',
    border: '4px solid var(--color-black)',
    borderRadius: 'var(--wobbly-radius-1)',
    padding: '20px',
    boxShadow: 'inset 4px 4px 0 rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    color: 'var(--color-white)',
    margin: '0 0 15px 0',
    textShadow: '2px 2px 0 var(--color-black)',
  },
  participantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  participantCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 15px',
    borderRadius: '15px',
    gap: '15px',
    borderStyle: 'solid',
  },
  participantInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '5px',
  },
  participantName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: 'var(--color-black)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  meTag: {
    backgroundColor: 'var(--color-red)',
    color: 'var(--color-white)',
    fontSize: '0.8rem',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '2px solid var(--color-black)',
  },
  participantCharacter: {
    fontSize: '1rem',
    color: '#333',
    fontWeight: 'bold',
  },
  waitingSection: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    border: '4px dashed var(--color-black)',
    borderRadius: 'var(--wobbly-radius-2)',
    padding: '30px',
  },
  waitingAnimation: {
    fontSize: '5rem',
    marginBottom: '20px',
  },
  waitingText: {
    fontSize: '1.8rem',
    color: 'var(--color-black)',
    margin: '0 0 10px 0',
    textShadow: 'none',
  },
  waitingSubtext: {
    fontSize: '1.1rem',
    color: '#333',
    fontWeight: 'bold',
    marginBottom: '30px',
  },
  testStartBtn: {
    backgroundColor: 'var(--color-red)',
    color: 'var(--color-white)',
    fontSize: '1.1rem',
    padding: '12px 25px',
  }
};
