import { useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import SpaceBackground from '../components/SpaceBackground';

export default function Start({ onEnter, onAdmin }) {
  const [sessionCode, setSessionCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [errors, setErrors] = useState({ code: false, name: false });
  const [alertMsg, setAlertMsg] = useState('');

  const handleEnter = async (e) => {
    e.preventDefault();
    const hasCode = !!sessionCode.trim();
    const hasName = !!nickname.trim();
    setErrors({ code: !hasCode, name: !hasName });
    
    if (!hasCode || !hasName) {
      return;
    }
    
    try {
      const sessionRef = doc(db, 'sessions', sessionCode);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        if (sessionData.isStarted) {
          setAlertMsg("이미 게임이 시작된 탐험 코드입니다.");
        } else {
          onEnter(sessionCode, nickname);
        }
      } else {
        setAlertMsg("존재하지 않는 탐험 코드입니다.");
      }
    } catch (error) {
      console.error("Error joining session: ", error);
      setAlertMsg("세션에 접속하는 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={styles.container}>
      {/* Hand-drawn Style Decorative Space Elements */}
      <SpaceBackground />
      
      {/* Admin Mode Entry Button */}
      <button 
        className="btn-wobbly" 
        style={styles.adminButton} 
        onClick={onAdmin}
      >
        🛠 관리자 모드
      </button>

      <div className="card-wobbly" style={styles.card}>
        <h1 style={styles.title}>
          <span style={{ color: 'var(--color-yellow)', textShadow: '3px 3px 0 #111' }}>우주 탐험</span> 보드게임
        </h1>
        <p style={styles.subtitle}>🚀 미지의 행성을 정복할 탐험대원을 모집합니다!</p>

        <form onSubmit={handleEnter} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>🔑 탐험 코드</label>
            <input 
              type="text" 
              className="input-wobbly" 
              placeholder="세션 코드를 입력하세요" 
              value={sessionCode}
              onChange={(e) => {
                setSessionCode(e.target.value);
                if (errors.code) setErrors({ ...errors, code: false });
              }}
            />
            {errors.code && <span style={styles.errorText}>탐험 코드를 입력하세요.</span>}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>🧑‍🚀 탐험가 이름</label>
            <input 
              type="text" 
              className="input-wobbly" 
              placeholder="이름을 입력하세요" 
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (errors.name) setErrors({ ...errors, name: false });
              }}
              maxLength={10}
            />
            {errors.name && <span style={styles.errorText}>이름을 입력하세요.</span>}
          </div>

          <button type="submit" className="btn-wobbly" style={styles.button}>
            우주선 탑승하기 🚀
          </button>
        </form>
      </div>

      {/* 커스텀 Alert 모달 */}
      {alertMsg && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div className="card-wobbly" style={{
            padding: '2rem', textAlign: 'center', maxWidth: '400px', width: '100%',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>{alertMsg}</div>
            <button 
              className="btn-wobbly"
              onClick={() => setAlertMsg('')}
            >
              확인
            </button>
          </div>
        </div>
      )}
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
    backgroundColor: 'var(--color-pink)',
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  title: {
    fontSize: '2.5rem',
    marginBottom: '10px',
    color: 'var(--color-white)',
    textShadow: '3px 3px 0 var(--color-black)',
  },
  subtitle: {
    fontSize: '1.1rem',
    marginBottom: '30px',
    fontWeight: 'bold',
    color: 'var(--color-black)',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignItems: 'center',
  },
  inputGroup: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: 'var(--color-black)',
  },
  errorText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    marginTop: '2px',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: '2px 8px',
    borderRadius: '10px',
    border: '2px solid #D32F2F',
  },
  button: {
    marginTop: '10px',
    width: '100%',
    maxWidth: '300px',
  },
  adminButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '10px 20px',
    fontSize: '1rem',
    backgroundColor: 'var(--color-blue)',
    color: 'var(--color-white)',
    zIndex: 10,
  }
};
