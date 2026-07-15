import React, { useState } from 'react';
import SpaceBackground from '../components/SpaceBackground';

export default function AdminLogin({ onLogin, onBack }) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === '0067') {
      onLogin();
    } else {
      alert('비밀번호가 일치하지 않습니다.');
      setPassword('');
    }
  };

  return (
    <div className="admin-mode" style={styles.container}>
      <SpaceBackground />
      <div className="card-wobbly" style={styles.loginBox}>
        <h2 style={styles.title}>🛠 관리자 로그인</h2>
        <p style={styles.subtitle}>접근 권한이 필요합니다.</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (4자리)"
            maxLength={4}
            style={styles.input}
            autoFocus
          />
          <button type="submit" className="btn-wobbly" style={styles.loginBtn}>
            접속하기
          </button>
        </form>
        
        <button className="btn-wobbly" onClick={onBack} style={styles.backBtn}>
          ◀ 시작 화면으로
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
    position: 'relative',
    overflow: 'hidden',
  },
  loginBox: {
    backgroundColor: 'var(--color-white)',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 1,
    width: '400px',
  },
  title: {
    fontSize: '2rem',
    color: 'var(--color-black)',
    marginBottom: '10px',
    margin: 0,
  },
  subtitle: {
    color: '#666',
    marginBottom: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '20px',
  },
  input: {
    padding: '15px',
    fontSize: '1.5rem',
    textAlign: 'center',
    borderRadius: '10px',
    border: '3px solid var(--color-black)',
    outline: 'none',
    letterSpacing: '10px',
  },
  loginBtn: {
    backgroundColor: 'var(--color-yellow)',
    fontSize: '1.2rem',
    padding: '15px',
    width: '100%',
  },
  backBtn: {
    marginTop: '20px',
    backgroundColor: 'var(--color-blue)',
    border: '3px solid var(--color-black)',
    borderRadius: '10px',
    color: 'white',
    cursor: 'pointer',
    fontSize: '1.1rem',
    padding: '10px 20px',
    fontWeight: 'bold',
  }
};
