import React from 'react';

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div className="card-wobbly" style={styles.modal}>
        <h3 style={styles.message}>{message}</h3>
        <div style={styles.buttonContainer}>
          <button className="btn-wobbly" style={styles.confirmBtn} onClick={onConfirm}>
            확인
          </button>
          <button className="btn-wobbly" style={styles.cancelBtn} onClick={onCancel}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // 매우 높은 z-index로 항상 최상단에 표시
  },
  modal: {
    backgroundColor: 'var(--color-white)',
    padding: '30px 40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    maxWidth: '400px',
    textAlign: 'center',
    animation: 'float 2s ease-in-out infinite',
  },
  message: {
    fontSize: '1.5rem',
    color: 'var(--color-black)',
    margin: 0,
    textShadow: 'none', // 관리자 모드 등에서 그림자가 안 생기게 방지
  },
  buttonContainer: {
    display: 'flex',
    gap: '15px',
    width: '100%',
    justifyContent: 'center',
    marginTop: '10px',
  },
  confirmBtn: {
    backgroundColor: 'var(--color-blue)',
    color: 'white',
    padding: '10px 25px',
    fontSize: '1.2rem',
  },
  cancelBtn: {
    backgroundColor: 'var(--color-red)',
    color: 'white',
    padding: '10px 25px',
    fontSize: '1.2rem',
  }
};
