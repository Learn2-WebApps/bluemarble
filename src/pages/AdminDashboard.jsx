import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import SpaceBackground from '../components/SpaceBackground';
import ConfirmModal from '../components/ConfirmModal';

export default function AdminDashboard({ onBack }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionCode, setSelectedSessionCode] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

  // 1초마다 시간 업데이트 (타이머 렌더링용)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Firestore 세션 구독
  useEffect(() => {
    const sessionsRef = collection(db, 'sessions');
    const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
      const sessionList = [];
      snapshot.forEach(docSnap => {
        sessionList.push({ code: docSnap.id, ...docSnap.data(), rooms: [] }); // rooms는 하위 컬렉션에서 별도 구독
      });
      setSessions(sessionList);
    });
    return () => unsubscribe();
  }, []);

  // 10분이 지나면 세션을 자동으로 종료 상태로 변경
  useEffect(() => {
    sessions.forEach(async (session) => {
      if (session.status === 'playing' && session.startedAt) {
        const elapsed = Math.floor((currentTime - session.startedAt) / 1000);
        if (elapsed >= 600) {
          try {
            await updateDoc(doc(db, 'sessions', session.code), {
              status: 'ended',
              isStarted: false
            });
          } catch (error) {
            console.error("Error auto-ending session:", error);
          }
        }
      }
    });
  }, [currentTime, sessions]);

  const generateSessionCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleCreateSession = async () => {
    const code = generateSessionCode();
    try {
      await setDoc(doc(db, 'sessions', code), {
        status: 'waiting',
        isStarted: false,
        startedAt: null,
        createdAt: Date.now()
      });
      setSelectedSessionCode(code);
    } catch (error) {
      console.error("Error creating session: ", error);
    }
  };

  const handleDeleteSession = (code, e) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      message: '세션을 삭제하시겠습니까?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'sessions', code));
          if (selectedSessionCode === code) {
            setSelectedSessionCode(null);
          }
        } catch (error) {
          console.error("Error deleting session: ", error);
        }
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  const selectedSession = sessions.find(s => s.code === selectedSessionCode);

  // 선택된 세션의 하위 컬렉션(rooms, 각 room의 players) 구독을 위한 내부 컴포넌트 처리 또는 별도 state
  const [activeRooms, setActiveRooms] = useState([]);
  const [playerCounts, setPlayerCounts] = useState({});

  useEffect(() => {
    if (!selectedSessionCode) {
      setActiveRooms([]);
      setPlayerCounts({});
      return;
    }
    
    const roomsRef = collection(db, 'sessions', selectedSessionCode, 'rooms');
    const unsubscribeRooms = onSnapshot(roomsRef, (snapshot) => {
      const newRooms = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      }));
      newRooms.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      setActiveRooms(newRooms);
    });
    
    return () => unsubscribeRooms();
  }, [selectedSessionCode]);

  useEffect(() => {
    if (!selectedSessionCode || activeRooms.length === 0) return;

    const unsubscribes = activeRooms.map(room => {
      const playersRef = collection(db, 'sessions', selectedSessionCode, 'rooms', room.id, 'players');
      return onSnapshot(playersRef, (snap) => {
        setPlayerCounts(prev => ({
          ...prev,
          [room.id]: snap.size
        }));
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [selectedSessionCode, activeRooms]);

  const handleAddRoom = async () => {
    if (!selectedSession) return;
    try {
      const roomId = Date.now().toString();
      await setDoc(doc(db, 'sessions', selectedSession.code, 'rooms', roomId), {
        name: `🪐 ${activeRooms.length + 1}번 행성`
      });
    } catch (error) {
      console.error("Error adding room: ", error);
    }
  };

  const handleDeleteRoom = (roomId) => {
    if (!selectedSession) return;
    setConfirmModal({
      isOpen: true,
      message: '해당 방을 삭제하시겠습니까?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'sessions', selectedSession.code, 'rooms', roomId));
        } catch (error) {
          console.error("Error deleting room: ", error);
        }
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  const handleStartAll = async () => {
    if (!selectedSession) return;
    try {
      await updateDoc(doc(db, 'sessions', selectedSession.code), {
        status: 'playing',
        isStarted: true,
        startedAt: Date.now()
      });
    } catch (error) {
      console.error("Error starting game: ", error);
    }
  };

  const handleEndGame = async () => {
    if (!selectedSession) return;
    setConfirmModal({
      isOpen: true,
      message: '게임을 강제로 종료하시겠습니까?',
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'sessions', selectedSession.code), {
            status: 'ended',
            isStarted: false
          });
        } catch (error) {
          console.error("Error ending game: ", error);
        }
        setConfirmModal({ isOpen: false, message: '', onConfirm: null });
      }
    });
  };

  // 타이머 계산
  const getRemainingTime = (startedAt) => {
    if (!startedAt) return 600;
    const elapsed = Math.floor((currentTime - startedAt) / 1000);
    return Math.max(0, 600 - elapsed);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="admin-mode" style={styles.container}>
      <SpaceBackground />
      
      <div style={styles.layout}>
        {/* 헤더 겸 뒤로가기 */}
        <div style={styles.header}>
          <button onClick={onBack} className="btn-wobbly" style={styles.backButton}>◀ 메인으로</button>
          <h1 style={styles.title}>🛠 <span style={{ color: 'var(--color-yellow)' }}>관리자</span> 모드</h1>
          <div style={{ width: '100px' }}></div>
        </div>

        <div style={styles.content}>
          {/* 좌측 패널: 세션 목록 */}
          <div className="card-wobbly" style={styles.leftPanel}>
            <button className="btn-wobbly" style={styles.createBtn} onClick={handleCreateSession}>
              + 새 세션 생성
            </button>
            
            <div style={styles.sessionList}>
              {sessions.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#555', marginTop: '20px' }}>생성된 세션이 없습니다.</p>
              ) : (
                sessions.map(session => (
                  <div 
                    key={session.code} 
                    style={{
                      ...styles.sessionItem,
                      backgroundColor: selectedSessionCode === session.code ? 'var(--color-mint)' : 'var(--color-white)',
                      transform: selectedSessionCode === session.code ? 'scale(1.02)' : 'none',
                      border: selectedSessionCode === session.code ? '4px solid var(--color-blue)' : '3px solid var(--color-black)'
                    }}
                    onClick={() => setSelectedSessionCode(session.code)}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>코드: {session.code}</h3>
                      <span style={{ fontSize: '0.9rem', color: session.status === 'playing' ? 'var(--color-red)' : '#555' }}>
                        {session.status === 'waiting' ? '대기 중' : session.status === 'playing' ? '게임 진행 중' : '종료됨'}
                      </span>
                    </div>
                    <button className="btn-wobbly" style={styles.deleteSessionBtn} onClick={(e) => handleDeleteSession(session.code, e)}>
                      X
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 우측 패널: 세션 상세 설정 */}
          <div className="card-wobbly" style={styles.rightPanel}>
            {selectedSession ? (
              <div style={styles.sessionDetail}>
                <h2 style={styles.detailTitle}>
                  현재 세션: <span style={styles.highlightCode}>{selectedSession.code}</span>
                </h2>
                
                <div style={styles.roomControl}>
                  <h3 style={{ margin: 0 }}>방 관리 (총 {activeRooms.length}개)</h3>
                </div>

                <div style={styles.roomListGrid}>
                  {activeRooms.map((room, i) => (
                    <div key={room.id} className="card-wobbly" style={styles.roomCard}>
                      <button 
                        style={styles.roomDeleteBtn} 
                        onClick={() => handleDeleteRoom(room.id)}
                        title="방 삭제"
                      >
                        X
                      </button>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>{room.name}</h4>
                      <div style={styles.participantCount}>
                        👨‍🚀 {playerCounts[room.id] || 0} / 6명
                      </div>
                    </div>
                  ))}
                  
                  {/* 방 추가 버튼 카드 */ }
                  <div 
                    className="card-wobbly wobbly-hover" 
                    style={styles.addRoomCard} 
                    onClick={handleAddRoom}
                    title="새 방 추가"
                  >
                    <div style={{ fontSize: '3rem', color: 'var(--color-blue)', lineHeight: 1 }}>+</div>
                    <div style={{ fontWeight: 'bold', marginTop: '10px' }}>방 추가</div>
                  </div>
                </div>

                <div style={styles.actionArea}>
                  {selectedSession.status === 'playing' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '15px' }}>
                      <div style={styles.playingNotice}>
                        ⏳ 게임 진행 중: {formatTime(getRemainingTime(selectedSession.startedAt))}
                      </div>
                      <button className="btn-wobbly" style={styles.endGameBtn} onClick={handleEndGame}>
                        게임 강제 종료 🛑
                      </button>
                    </div>
                  ) : selectedSession.status === 'ended' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '15px' }}>
                      <div style={{ ...styles.playingNotice, backgroundColor: '#555', color: 'white' }}>
                        종료된 게임입니다.
                      </div>
                      <button className="btn-wobbly" style={styles.startAllBtn} onClick={handleStartAll}>
                        다시 게임 시작 🚀
                      </button>
                    </div>
                  ) : (
                    <button className="btn-wobbly" style={styles.startAllBtn} onClick={handleStartAll}>
                      전체 방 게임 시작 🚀
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={styles.emptyDetail}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>👈</div>
                <h2>왼쪽에서 세션을 선택하거나<br/>새로 생성해 주세요.</h2>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 커스텀 경고/확인 모달 */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false, message: '', onConfirm: null })}
      />
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
  layout: {
    width: '100%',
    height: '100%', // 전체화면으로 꽉 키우기
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  backButton: {
    fontSize: '1rem',
    padding: '10px 20px',
    backgroundColor: 'var(--color-white)',
  },
  title: {
    fontSize: '2.5rem',
    color: 'var(--color-white)',
    margin: 0,
    textShadow: 'none', // 글씨 그림자 효과 없앰
  },
  content: {
    display: 'flex',
    gap: '20px',
    flex: 1,
    minHeight: 0,
  },
  leftPanel: {
    flex: '0 0 350px',
    backgroundColor: 'var(--color-pink)',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
  },
  createBtn: {
    backgroundColor: 'var(--color-yellow)',
    fontSize: '1.2rem',
    padding: '15px',
    width: '100%',
    marginBottom: '20px',
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    paddingRight: '5px',
  },
  sessionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    borderRadius: '15px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteSessionBtn: {
    backgroundColor: 'var(--color-red)',
    color: 'white',
    padding: '5px 12px',
    fontSize: '1rem',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    padding: '30px',
    overflowY: 'auto',
  },
  emptyDetail: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#666',
    textAlign: 'center',
  },
  sessionDetail: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  detailTitle: {
    fontSize: '2rem',
    marginBottom: '30px',
    borderBottom: '4px dashed var(--color-black)',
    paddingBottom: '20px',
  },
  highlightCode: {
    backgroundColor: 'var(--color-yellow)',
    padding: '5px 15px',
    borderRadius: '10px',
    border: '3px solid var(--color-black)',
    display: 'inline-block',
  },
  roomControl: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-mint)',
    padding: '15px 20px',
    borderRadius: '15px',
    border: '3px solid var(--color-black)',
    marginBottom: '20px',
  },
  addRoomBtn: {
    padding: '8px 15px',
    fontSize: '1rem',
    backgroundColor: 'var(--color-blue)',
    color: 'white',
  },
  addRoomCard: {
    backgroundColor: 'var(--color-mint)',
    padding: '15px',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    border: '3px dashed var(--color-black)',
  },
  roomListGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '15px',
    flex: 1,
    alignContent: 'start',
  },
  roomCard: {
    backgroundColor: 'var(--color-white)',
    padding: '15px',
    textAlign: 'center',
    position: 'relative', // x 버튼 위치를 위해
  },
  roomDeleteBtn: {
    position: 'absolute',
    top: '5px',
    right: '5px',
    backgroundColor: 'var(--color-red)',
    color: 'white',
    border: '2px solid var(--color-black)',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  participantCount: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: 'var(--color-blue)',
  },
  actionArea: {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'center',
  },
  startAllBtn: {
    backgroundColor: 'var(--color-red)',
    color: 'white',
    fontSize: '1.5rem',
    padding: '20px 40px',
    width: '100%',
    maxWidth: '500px',
  },
  endGameBtn: {
    backgroundColor: 'var(--color-red)',
    color: 'white',
    fontSize: '1.2rem',
    padding: '15px 30px',
    width: '100%',
    maxWidth: '500px',
  },
  playingNotice: {
    backgroundColor: 'var(--color-blue)',
    color: 'white',
    fontSize: '2rem',
    fontWeight: 'bold',
    padding: '20px',
    borderRadius: '15px',
    textAlign: 'center',
    width: '100%',
  }
};
