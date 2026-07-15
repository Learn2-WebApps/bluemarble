import React, { useState, useEffect } from 'react';
import { updateDoc } from 'firebase/firestore';

export default function MissionModal({ isOpen, missionState, players, myPlayerId, gameStateRef, onClose, onSuccess }) {
  const [localPrediction, setLocalPrediction] = useState(null);
  const [localActualAnswer, setLocalActualAnswer] = useState(null);

  // Reset local state when a new mission opens
  useEffect(() => {
    if (isOpen) {
      setLocalPrediction(null);
      setLocalActualAnswer(null);
    }
  }, [isOpen]);

  if (!isOpen || !missionState || !missionState.data) return null;

  const { activePlayerId, targetPlayerId, data, prediction, actualAnswer } = missionState;
  
  const activePlayer = players.find(p => p.id === activePlayerId);
  const targetPlayer = players.find(p => p.id === targetPlayerId);

  if (!activePlayer || !targetPlayer) return null;

  const isPredictor = myPlayerId === activePlayerId;
  const isTarget = myPlayerId === targetPlayerId;
  const isThirdParty = !isPredictor && !isTarget;

  const bothAnswered = prediction !== null && actualAnswer !== null;

  const handlePredict = async () => {
    if (!isPredictor || bothAnswered || prediction !== null || localPrediction === null) return;
    await updateDoc(gameStateRef, { 'missionState.prediction': localPrediction });
  };

  const handleActualAnswer = async () => {
    if (!isTarget || bothAnswered || actualAnswer !== null || localActualAnswer === null) return;
    await updateDoc(gameStateRef, { 'missionState.actualAnswer': localActualAnswer });
  };

  const displayQuestion = () => {
    let q = data.question;
    const tName = targetPlayer.name.endsWith('님') ? targetPlayer.name : `${targetPlayer.name}님`;
    q = q.replace(/\s*나는\?$/, '');
    q = q.replace(/\s*나의 대처는\?$/, '');
    q = q.replace(/(^|\s)내가($|\s)/g, `$1${tName}이(가)$2`);
    q = q.replace(/(^|\s)나의($|\s)/g, `$1${tName}의$2`);
    q = q.trim();
    if (!q.endsWith('?')) q += '?';
    if (q.includes(tName)) return q;
    return `${q}\n\n이때, ${tName}의 행동은?`;
  };

  return (
    <div style={styles.overlay}>
      <div className="card-wobbly" style={styles.modal}>
        <div style={{ ...styles.categoryBadge, backgroundColor: data.color }}>
          {data.category}
        </div>
        
        <p style={styles.question}>{displayQuestion()}</p>

        {!bothAnswered ? (
          <div style={styles.phaseContainer}>
            {isThirdParty && (
              <h3 style={styles.instruction}>
                {activePlayer.name}님이 {targetPlayer.name}님의 행동을 예측 중입니다...<br/>
                결과를 기다려주세요! ⏳
              </h3>
            )}
            {isPredictor && (
              <>
                <h3 style={styles.instruction}>
                  {targetPlayer.name}님의 선택을 예측해보세요!
                </h3>
                {prediction === null ? (
                  <div style={styles.optionsList}>
                    {data.options.map((opt, i) => (
                      <button 
                        key={i} 
                        className="btn-wobbly" 
                        style={{
                          ...styles.optionBtn,
                          backgroundColor: localPrediction === i ? 'var(--color-yellow)' : 'var(--color-white)',
                          border: localPrediction === i ? '4px solid var(--color-blue)' : '3px solid var(--color-black)'
                        }} 
                        onClick={() => setLocalPrediction(i)}
                      >
                        {opt}
                      </button>
                    ))}
                    <button 
                      className="btn-wobbly" 
                      style={{...styles.confirmBtn, opacity: localPrediction === null ? 0.5 : 1}}
                      disabled={localPrediction === null}
                      onClick={handlePredict}
                    >
                      확인
                    </button>
                  </div>
                ) : (
                  <h3 style={styles.instruction}>상대방의 선택을 기다리는 중입니다... ⏳</h3>
                )}
              </>
            )}
            {isTarget && (
              <>
                <h3 style={styles.instruction}>
                  실제로 어떻게 행동하실 건가요?
                </h3>
                {actualAnswer === null ? (
                  <div style={styles.optionsList}>
                    {data.options.map((opt, i) => (
                      <button 
                        key={i} 
                        className="btn-wobbly" 
                        style={{
                          ...styles.optionBtn,
                          backgroundColor: localActualAnswer === i ? 'var(--color-yellow)' : 'var(--color-white)',
                          border: localActualAnswer === i ? '4px solid var(--color-pink)' : '3px solid var(--color-black)'
                        }} 
                        onClick={() => setLocalActualAnswer(i)}
                      >
                        {opt}
                      </button>
                    ))}
                    <button 
                      className="btn-wobbly" 
                      style={{...styles.confirmBtn, opacity: localActualAnswer === null ? 0.5 : 1}}
                      disabled={localActualAnswer === null}
                      onClick={handleActualAnswer}
                    >
                      확인
                    </button>
                  </div>
                ) : (
                  <h3 style={styles.instruction}>{activePlayer.name}님의 예측을 기다리는 중입니다... ⏳</h3>
                )}
              </>
            )}
          </div>
        ) : (
          <div style={styles.phaseContainer}>
            <h3 style={styles.instruction}>
              결과 확인!<br/>
              <span style={{ fontSize: '1.1rem', color: 'gray' }}>
                {prediction === actualAnswer ? '예측 성공! 🎉' : '예측 실패! 💦'}
              </span>
            </h3>
            <div style={styles.optionsList}>
              {data.options.map((opt, i) => {
                const isTargetChoice = i === actualAnswer;
                const isPredictChoice = i === prediction;
                
                let btnStyle = { ...styles.optionBtn, pointerEvents: 'none', minHeight: '60px', position: 'relative' };
                if (isTargetChoice) {
                  btnStyle.backgroundColor = 'var(--color-mint)';
                  btnStyle.color = 'var(--color-black)';
                  btnStyle.border = '5px solid var(--color-pink)';
                } else {
                  btnStyle.backgroundColor = 'rgba(255,255,255,0.7)';
                  btnStyle.color = '#555';
                  btnStyle.boxShadow = 'none';
                  btnStyle.transform = 'none';
                }

                if (isPredictChoice) {
                  btnStyle.border = isTargetChoice ? '5px dashed var(--color-blue)' : '5px solid var(--color-blue)';
                  if (!isTargetChoice) {
                    btnStyle.backgroundColor = 'var(--color-white)';
                  }
                }

                return (
                  <div key={i} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <button className="btn-wobbly" style={btnStyle}>
                      {opt}
                    </button>
                    {isTargetChoice && (
                      <span style={{...styles.predictBadge, top: '-15px', right: '10px', backgroundColor: 'var(--color-pink)'}}>
                        정답!
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {isPredictor && (
              <button 
                className="btn-wobbly" 
                style={{ marginTop: '35px', backgroundColor: prediction === actualAnswer ? 'var(--color-mint)' : 'var(--color-white)', padding: '15px 40px', fontSize: '1.2rem' }} 
                onClick={prediction === actualAnswer ? onSuccess : onClose}
              >
                다음 턴으로
              </button>
            )}
            {!isPredictor && (
              <h3 style={{ marginTop: '30px', color: '#555' }}>{activePlayer.name}님이 턴을 넘기기를 기다리는 중...</h3>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
    display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px',
  },
  modal: {
    width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    backgroundColor: 'var(--color-yellow)', padding: '30px 20px',
  },
  categoryBadge: {
    padding: '5px 20px', borderRadius: '20px', border: '3px solid var(--color-black)',
    color: 'var(--color-black)', fontWeight: 'bold', fontSize: '1.2rem',
    marginBottom: '15px', boxShadow: '2px 2px 0 var(--color-black)',
  },
  question: {
    fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--color-black)',
    textAlign: 'center', marginBottom: '30px', wordBreak: 'keep-all', whiteSpace: 'pre-wrap',
  },
  phaseContainer: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  instruction: { fontSize: '1.4rem', color: 'var(--color-black)', textAlign: 'center', marginBottom: '20px', textShadow: 'none' },
  optionsList: { width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' },
  optionBtn: {
    width: '100%', fontFamily: '"Noto Sans KR", "Apple SD Gothic Neo", sans-serif',
    fontSize: '1.15rem', fontWeight: '600', padding: '15px',
    backgroundColor: 'var(--color-white)', whiteSpace: 'normal', wordBreak: 'keep-all',
  },
  confirmBtn: {
    marginTop: '15px', padding: '12px 30px', fontSize: '1.3rem', backgroundColor: 'var(--color-blue)', color: 'white', alignSelf: 'center'
  },
  predictBadge: {
    position: 'absolute', top: '-10px', right: '-10px', backgroundColor: 'var(--color-blue)',
    color: 'var(--color-white)', padding: '6px 15px', borderRadius: '15px',
    border: '3px solid var(--color-black)', fontWeight: 'bold', fontSize: '1rem',
    transform: 'rotate(10deg)', boxShadow: '2px 2px 0 var(--color-black)', zIndex: 5
  }
};
