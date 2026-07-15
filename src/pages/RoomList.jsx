import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import SpaceBackground from '../components/SpaceBackground';

export default function RoomList({ sessionData, onSelectRoom, onBack }) {
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!sessionData?.code) return;

    const roomsRef = collection(db, 'sessions', sessionData.code, 'rooms');
    const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      roomData.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      setRooms(roomData);
    });

    return () => unsubscribe();
  }, [sessionData?.code]);

  const colors = ['var(--color-mint)', 'var(--color-pink)', 'var(--color-yellow)', 'var(--color-orange)', 'var(--color-purple)'];

  return (
    <div style={styles.container}>
      {/* Hand-drawn Style Decorative Space Elements */}
      <SpaceBackground />
      <div className="card-wobbly" style={styles.card}>
        <div style={styles.header}>
          <button onClick={onBack} className="btn-wobbly" style={styles.backButton}>◀ 뒤로</button>
          <h1 style={styles.title}>탐험할 <span style={{ color: 'var(--color-yellow)' }}>우주 구역</span> 선택</h1>
          <div style={{ width: '80px' }}></div> {/* For flex centering balance */}
        </div>
        
        <p style={styles.subtitle}>탐험할 행성을 선택해주세요! (세션: {sessionData?.code})</p>

        <div style={styles.roomGrid}>
          {rooms.length === 0 ? (
            <p style={{ color: 'var(--color-white)' }}>개설된 우주 구역이 없습니다.</p>
          ) : (
            rooms.map((room, idx) => (
              <div 
                key={room.id} 
                className="room-card wobbly-hover"
                style={{ ...styles.roomCard, backgroundColor: colors[idx % colors.length] }}
                onClick={() => onSelectRoom(room.id)}
              >
                <h2 style={styles.roomName}>{room.name}</h2>
                <div style={styles.roomInfo}>
                  <button className="btn-wobbly" style={styles.joinButton}>입장 🚀</button>
                </div>
              </div>
            ))
          )}
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
  deco: {
    position: 'absolute',
    userSelect: 'none',
    zIndex: 0,
  },
  card: {
    backgroundColor: 'var(--color-blue)',
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '800px', // Wider for landscape grid
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
    marginBottom: '30px',
    fontWeight: 'bold',
    color: 'var(--color-black)',
  },
  roomGrid: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    padding: '10px',
  },
  roomCard: {
    border: '4px solid var(--color-black)',
    borderRadius: 'var(--wobbly-radius-2)',
    padding: '20px',
    boxShadow: '5px 5px 0 var(--color-black)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '15px',
    transition: 'all 0.2s ease',
  },
  roomName: {
    fontSize: '1.5rem',
    color: 'var(--color-black)',
    margin: 0,
    textShadow: '1px 1px 0 rgba(255,255,255,0.5)',
  },
  roomInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  playerCount: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.4)',
    padding: '5px 15px',
    borderRadius: '20px',
    border: '2px solid var(--color-black)',
  },
  joinButton: {
    width: '100%',
    fontSize: '1.2rem',
    padding: '10px',
    fontFamily: '"Noto Sans KR", "Apple SD Gothic Neo", sans-serif',
    fontWeight: '600',
    backgroundColor: 'var(--color-white)',
    color: 'var(--color-black)',
    textShadow: 'none',
  }
};
