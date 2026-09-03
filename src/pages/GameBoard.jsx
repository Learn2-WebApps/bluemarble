import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, getDocs, updateDoc, runTransaction } from 'firebase/firestore';
import SpaceBackground from '../components/SpaceBackground';
import BoardSpace from '../components/BoardSpace';
import Dice from '../components/Dice';
import MissionModal from '../components/MissionModal';
import GoldenKeyModal from '../components/GoldenKeyModal';
import StealSelectionModal from '../components/StealSelectionModal';
import ResultScreen from '../components/ResultScreen';
import { generateBoard } from '../utils/boardData';
import { missions } from '../data/missions';
import { goldenKeys } from '../data/goldenKeys';

// 다음 차례를 계산한다. 넘어간 자리의 주인이 "한 턴 쉬기" 상태면 그 쉬기를 1회 소모하고
// 다시 다음 사람으로 넘긴다. 턴을 넘기는 지점이 여러 군데라 계산을 이 한 곳으로 모았다.
// 반환한 { turnIndex, skipTurns } 를 그대로 updateDoc 에 실어 보내면 된다.
//   currentTurnIndex : 지금 차례인 사람의 인덱스
//   roster           : joinedAt 순으로 정렬된 플레이어 배열
//   skipMap          : { playerId: 남은 쉬기 횟수 }. 없으면 {} 로 본다.
function computeNextTurn(currentTurnIndex, roster, skipMap) {
  const total = roster ? roster.length : 0;
  if (total === 0) return { turnIndex: 0, skipTurns: { ...(skipMap || {}) } };

  const remaining = { ...(skipMap || {}) };
  let next = ((currentTurnIndex || 0) + 1) % total;

  // 전원이 쉬기 상태인 극단적인 경우에도 멈추도록 최대 인원수만큼만 돈다.
  for (let i = 0; i < total; i++) {
    const candidate = roster[next];
    const left = candidate ? remaining[candidate.id] || 0 : 0;
    if (left <= 0) break;
    // 쉬기는 1회성이다. 소모하고 남은 값이 없으면 키 자체를 지운다.
    if (left <= 1) delete remaining[candidate.id];
    else remaining[candidate.id] = left - 1;
    next = (next + 1) % total;
  }

  return { turnIndex: next, skipTurns: remaining };
}

export default function GameBoard({ sessionData, onBack, onHome }) {
  const { code, roomId, playerId, nickname } = sessionData;
  const [board, setBoard] = useState([]);
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [landOwnership, setLandOwnership] = useState({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [stealState, setStealState] = useState({ isOpen: false, othersLands: [] });
  const boardRef = useRef([]);
  const lastDiceTrigger = useRef(null);
  const lastKeyTrigger = useRef(null);
  const isRollingRef = useRef(false);
  const resolvingMissionRef = useRef(null);

  const gameStateRef = doc(db, 'sessions', code, 'rooms', roomId, 'gameState', 'state');

  useEffect(() => {
    const newBoard = generateBoard();
    setBoard(newBoard);
    boardRef.current = newBoard;
  }, []);

  // Subscribe to Session Info for Timer
  useEffect(() => {
    if (!code) return;
    const unsub = onSnapshot(doc(db, 'sessions', code), (docSnap) => {
      if (docSnap.exists()) setSessionInfo(docSnap.data());
    });
    return () => unsub();
  }, [code]);

  // Timer logic & Admin End Game Check
  useEffect(() => {
    if (sessionInfo?.status === 'ended' && !isGameOver) {
      setIsGameOver(true);
      setTimeLeft(0);
      return;
    }

    if (!sessionInfo?.startedAt || isGameOver) return;
    
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionInfo.startedAt) / 1000);
      const remaining = Math.max(0, 600 - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsGameOver(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionInfo?.startedAt, sessionInfo?.status, isGameOver]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Initialize Game State and Fetch Players
  useEffect(() => {
    const initGame = async () => {
      const playersRef = collection(db, 'sessions', code, 'rooms', roomId, 'players');
      const snap = await getDocs(playersRef);
      const loadedPlayers = [];
      snap.forEach(d => {
        const data = d.data();
        loadedPlayers.push({
          id: d.id,
          name: data.nickname,
          character: { color: data.color === 'rainbow' ? 'rainbow' : `var(--color-${data.color})`, label: data.color + ' 행성' },
          position: 0,
          joinedAt: data.joinedAt || Date.now()
        });
      });
      loadedPlayers.sort((a, b) => a.joinedAt - b.joinedAt);
      setPlayers(loadedPlayers);

      const stateSnap = await getDoc(gameStateRef);
      if (!stateSnap.exists()) {
        await setDoc(gameStateRef, {
          turnIndex: 0,
          diceState: { isRolling: false, face: 1, triggeredAt: null },
          missionState: { isOpen: false, activePlayerId: null, targetPlayerId: null, data: null, spaceId: null, prediction: null, actualAnswer: null, isResolved: false },
          goldenKeyState: { isOpen: false, card: null, activePlayerId: null },
          goldenKeyMoveAnim: null,
          landOwnership: {},
          globalUsedMissions: {},
          targetUsedMissions: {},
          lastOpponent: {},
          skipTurns: {},
          playerPositions: loadedPlayers.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {})
        });
      }
    };
    if (code && roomId) {
      initGame();
    }
  }, [code, roomId]);

  // 플레이어 명단 실시간 동기화.
  // 기존에는 게임 시작 시 1회만 읽어서 클라이언트마다 후보 명단이 어긋날 수 있었다.
  // 말 위치 등 진행 중 상태는 기존 값을 그대로 유지하고 명단(입장/이탈)만 반영한다.
  useEffect(() => {
    if (!code || !roomId) return;
    const playersRef = collection(db, 'sessions', code, 'rooms', roomId, 'players');
    const unsubscribe = onSnapshot(playersRef, (snapshot) => {
      const roster = [];
      snapshot.forEach((d) => {
        const data = d.data();
        roster.push({
          id: d.id,
          name: data.nickname,
          character: {
            color: data.color === 'rainbow' ? 'rainbow' : `var(--color-${data.color})`,
            label: data.color + ' 행성'
          },
          joinedAt: data.joinedAt || Date.now()
        });
      });
      roster.sort((a, b) => a.joinedAt - b.joinedAt);

      setPlayers((prev) => roster.map((r) => {
        const existing = prev.find((p) => p.id === r.id);
        return existing
          ? { ...existing, name: r.name, character: r.character, joinedAt: r.joinedAt }
          : { ...r, position: 0 };
      }));
    });
    return () => unsubscribe();
  }, [code, roomId]);

  // Subscribe to Game State
  useEffect(() => {
    const unsubscribe = onSnapshot(gameStateRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameState(data);
        if (data.landOwnership) setLandOwnership(data.landOwnership);
        
        // Update local players positions ONLY if not currently animating
        if (data.playerPositions && !isRollingRef.current) {
          setPlayers(prev => prev.map(p => ({
            ...p,
            position: data.playerPositions[p.id] !== undefined ? data.playerPositions[p.id] : p.position
          })));
        }

        // Trigger local dice animation if new roll detected
        if (data.diceState && data.diceState.triggeredAt !== lastDiceTrigger.current) {
          lastDiceTrigger.current = data.diceState.triggeredAt;
          isRollingRef.current = true; // Lock position sync from DB
          playLocalDiceAnimation(data.diceState.face, data.turnIndex, data);
        }

        // Trigger local golden key animation if new movement detected
        if (data.goldenKeyMoveAnim && data.goldenKeyMoveAnim.triggeredAt !== lastKeyTrigger.current) {
          lastKeyTrigger.current = data.goldenKeyMoveAnim.triggeredAt;
          isRollingRef.current = true; // Lock position sync from DB
          playLocalKeyAnimation(data.goldenKeyMoveAnim, data);
        }
      }
    });
    return () => unsubscribe();
  }, [roomId]);

  // 예측과 실제 답이 "일치하는 순간" 예측자에게 깃발 +1.
  // 버튼 클릭과 무관하므로 새로고침/이탈/타이머 만료에도 반영이 보장된다.
  // missionState.isResolved 를 트랜잭션 안에서 검사·기록하여 중복 지급을 막는다.
  useEffect(() => {
    const ms = gameState?.missionState;
    if (!ms || !ms.data) return;
    if (ms.prediction === null || ms.actualAnswer === null) return;
    if (ms.prediction !== ms.actualAnswer) return;
    if (ms.isResolved) return;

    // 재렌더링으로 같은 미션에 대해 트랜잭션이 여러 번 시작되는 것을 막는다.
    const missionKey = `${ms.activePlayerId}-${ms.spaceId}-${ms.prediction}-${ms.actualAnswer}`;
    if (resolvingMissionRef.current === missionKey) return;
    resolvingMissionRef.current = missionKey;

    runTransaction(db, async (tx) => {
      const snap = await tx.get(gameStateRef);
      if (!snap.exists()) return;
      const cur = snap.data();
      const curMs = cur.missionState;

      // 여러 브라우저가 동시에 시도해도 최초 1회만 통과하도록 서버 값으로 재검증한다.
      if (!curMs || curMs.isResolved) return;
      if (curMs.prediction === null || curMs.actualAnswer === null) return;
      if (curMs.prediction !== curMs.actualAnswer) return;
      if (curMs.spaceId !== ms.spaceId || curMs.activePlayerId !== ms.activePlayerId) return;

      // 깊은 복사: 칸별 소유 맵까지 새 객체로 만들어 state 직접 변경을 피한다.
      const prevOwnership = cur.landOwnership || {};
      const newOwnership = {};
      Object.keys(prevOwnership).forEach((k) => {
        newOwnership[k] = { ...prevOwnership[k] };
      });

      const sid = curMs.spaceId;
      const winnerId = curMs.activePlayerId; // 예측한 사람에게 지급
      if (!newOwnership[sid]) newOwnership[sid] = {};
      newOwnership[sid][winnerId] = (newOwnership[sid][winnerId] || 0) + 1;

      tx.update(gameStateRef, {
        landOwnership: newOwnership,
        'missionState.isResolved': true
      });
    }).catch((err) => {
      console.error('미션 깃발 반영 실패:', err);
      resolvingMissionRef.current = null; // 실패 시 재시도 허용
    });
  }, [gameState]);

  const playLocalDiceAnimation = (face, turnIndex, snapData) => {
    // Visual movement logic
    setTimeout(() => {
      let stepsTaken = 0;
      const moveInterval = setInterval(() => {
        stepsTaken++;
        setPlayers(prev => {
          const newPlayers = [...prev];
          const cp = { ...newPlayers[turnIndex] };
          if (cp) {
            cp.position = (cp.position + 1) % 24;
            newPlayers[turnIndex] = cp;
          }
          return newPlayers;
        });

        if (stepsTaken >= face) {
          clearInterval(moveInterval);
          isRollingRef.current = false; // Release lock
          
          // Only turn owner computes logic and updates DB
          setPlayers(latestPlayers => {
            const activePlayer = latestPlayers[turnIndex];
            if (activePlayer && activePlayer.id === playerId) {
              setTimeout(() => {
                handleArrival(activePlayer, face, snapData, latestPlayers);
              }, 400);
            }
            return latestPlayers;
          });
        }
      }, 500);
    }, 1800); // Wait for dice rolling animation (1.5s + buffer)
  };

  const playLocalKeyAnimation = (animData, snapData) => {
    const { action, value, playerId: animPlayerId } = animData;
    
    let currentPos = snapData.playerPositions[animPlayerId] || 0;
    let targetPos;

    if (action === 'move') {
      targetPos = (currentPos + value) % 24;
      if (targetPos < 0) targetPos += 24;
    } else if (action === 'move_to') {
      targetPos = value;
    } else if (action === 'move_random') {
      targetPos = value; // we pass the pre-computed random target pos in `value`
    }

    let steps = 0;
    let stepDirection = 1;
    
    if (action === 'move') {
       steps = Math.abs(value);
       stepDirection = value < 0 ? -1 : 1;
    } else {
       steps = (targetPos - currentPos + 24) % 24;
       stepDirection = 1;
    }

    if (steps === 0) {
      isRollingRef.current = false;
      if (playerId === animPlayerId) {
        setPlayers(latestPlayers => {
          const pIndex = latestPlayers.findIndex(p => p.id === animPlayerId);
          if (pIndex !== -1) {
            handleSpaceArrival(latestPlayers[pIndex], currentPos, snapData, latestPlayers, {});
          }
          return latestPlayers;
        });
      }
      return;
    }

    let stepsTaken = 0;
    const moveInterval = setInterval(() => {
      stepsTaken++;
      
      setPlayers(prev => {
        const newPlayers = [...prev];
        const pIndex = newPlayers.findIndex(p => p.id === animPlayerId);
        if (pIndex !== -1) {
          const cp = { ...newPlayers[pIndex] };
          cp.position = (cp.position + stepDirection + 24) % 24;
          newPlayers[pIndex] = cp;
        }
        return newPlayers;
      });

      if (stepsTaken >= steps) {
        clearInterval(moveInterval);
        isRollingRef.current = false; // Release lock
        
        if (playerId === animPlayerId) {
          setTimeout(() => {
            setPlayers(latestPlayers => {
              const pIndex = latestPlayers.findIndex(p => p.id === animPlayerId);
              if (pIndex !== -1) {
                handleSpaceArrival(latestPlayers[pIndex], targetPos, snapData, latestPlayers, {});
              }
              return latestPlayers;
            });
          }, 400);
        }
      }
    }, 400);
  };

  const handleRollClick = async () => {
    if (!gameState || players.length === 0 || gameState.diceState.isRolling) return;
    const activePlayer = players[gameState.turnIndex];
    if (activePlayer.id !== playerId) return; // Only turn owner can roll

    const face = Math.floor(Math.random() * 6) + 1;
    await updateDoc(gameStateRef, {
      'diceState.isRolling': true,
      'diceState.face': face,
      'diceState.triggeredAt': Date.now()
    });
  };

  const handleSpaceArrival = async (activePlayer, finalPos, snapData, currentPlayers, baseUpdates = {}) => {
    if (!snapData) return;
    
    const space = boardRef.current.find(s => s.id === finalPos);

    let nextStateUpdates = {
      ...baseUpdates,
      [`playerPositions.${activePlayer.id}`]: finalPos,
    };

    if (space && space.type === 'category') {
      const catMissions = missions[space.name];
      if (catMissions && catMissions.length > 0) {
        // 자기 자신 제외 + 같은 playerId 중복 제거(안전장치)
        const seenIds = new Set();
        const otherPlayers = currentPlayers.filter(p => {
          if (!p || !p.id || p.id === activePlayer.id) return false;
          if (seenIds.has(p.id)) return false;
          seenIds.add(p.id);
          return true;
        });

        if (otherPlayers.length > 0) {
          // 후보에서 두 사람을 뺀다.
          //  - 직전 턴에 지목당한 사람: 같은 사람이 연달아 걸리지 않게
          //  - 예측자가 직전에 붙었던 상대: 같은 두 사람이 반복해서 붙지 않게
          // 인원수로 막지 않고, 뺐을 때 후보가 최소 1명 남는 경우에만 적용한다.
          // 둘 다 빼서 비면 "직전 지목 대상만 제외" 로 한 단계 완화하고,
          // 그래도 비면 제외 없이 원래 후보를 쓴다. 후보가 0명이 되는 일은 없다.
          // (2인 방처럼 상대가 원래 1명뿐이면 그 1명이 그대로 남는다.)
          const lastTargetId = snapData.missionState?.targetPlayerId;
          const lastOpponentMap = snapData.lastOpponent || {};
          const lastOpponentId = lastOpponentMap[activePlayer.id] || null;

          let candidates = otherPlayers;
          if (lastTargetId || lastOpponentId) {
            const strict = otherPlayers.filter(p => p.id !== lastTargetId && p.id !== lastOpponentId);
            if (strict.length > 0) {
              candidates = strict;
            } else {
              const relaxed = otherPlayers.filter(p => p.id !== lastTargetId);
              if (relaxed.length > 0) candidates = relaxed;
            }
          }

          const chosenTarget = candidates[Math.floor(Math.random() * candidates.length)];
          
          const category = space.name;
          const targetUsedObj = snapData.targetUsedMissions || {};
          const globalUsedObj = snapData.globalUsedMissions || {};
        
          const targetUsedAllCats = targetUsedObj[chosenTarget.id] || {};
          let targetUsed = targetUsedAllCats[category] || [];
          let globalUsed = globalUsedObj[category] || [];
        
          let availableIndices = catMissions.map((_, i) => i).filter(i => !globalUsed.includes(i) && !targetUsed.includes(i));
        
          if (availableIndices.length === 0) {
            globalUsed = [];
            availableIndices = catMissions.map((_, i) => i).filter(i => !targetUsed.includes(i));
            
            if (availableIndices.length === 0) {
              targetUsed = [];
              availableIndices = catMissions.map((_, i) => i);
            }
          }
        
          const chosenMissionIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
          const randomMission = catMissions[chosenMissionIndex];
        
          nextStateUpdates['targetUsedMissions'] = {
            ...targetUsedObj,
            [chosenTarget.id]: {
              ...targetUsedAllCats,
              [category]: [...targetUsed, chosenMissionIndex]
            }
          };
        
          nextStateUpdates['globalUsedMissions'] = {
            ...globalUsedObj,
            [category]: [...globalUsed, chosenMissionIndex]
          };

          // 붙은 두 사람이 서로를 기억한다. 지목이 확정되는 이 지점에서만 갱신한다.
          nextStateUpdates['lastOpponent'] = {
            ...lastOpponentMap,
            [activePlayer.id]: chosenTarget.id,
            [chosenTarget.id]: activePlayer.id
          };

          nextStateUpdates['missionState'] = {
            isOpen: true,
            activePlayerId: activePlayer.id,
            targetPlayerId: chosenTarget.id,
            data: { ...randomMission, category: space.name, color: space.color },
            spaceId: finalPos,
            prediction: null,
            actualAnswer: null,
            isResolved: false
          };
          
          await updateDoc(gameStateRef, nextStateUpdates);
          return; // Wait for mission resolution
        }
      }
    } else if (space && space.type === 'goldenKey') {
      const randomCard = goldenKeys[Math.floor(Math.random() * goldenKeys.length)];
      nextStateUpdates['goldenKeyState'] = {
        isOpen: true,
        card: randomCard,
        activePlayerId: activePlayer.id
      };
      await updateDoc(gameStateRef, nextStateUpdates);
      return;
    } else if (space && space.type === 'start') {
      // START 칸 도착 시 알림 없이 바로 턴만 넘어감
    }
    
    // If not a mission space, just advance turn
    const nextTurn = computeNextTurn(snapData.turnIndex, currentPlayers, snapData.skipTurns);
    nextStateUpdates['turnIndex'] = nextTurn.turnIndex;
    nextStateUpdates['skipTurns'] = nextTurn.skipTurns;
    nextStateUpdates['diceState.isRolling'] = false;
    await updateDoc(gameStateRef, nextStateUpdates);
  };

  const handleArrival = (activePlayer, rolledFace, snapData, currentPlayers) => {
    let currentPos = 0;
    if (snapData.playerPositions && typeof snapData.playerPositions[activePlayer.id] === 'number') {
      currentPos = snapData.playerPositions[activePlayer.id];
    }
    const finalPos = (currentPos + rolledFace) % 24;
    handleSpaceArrival(activePlayer, finalPos, snapData, currentPlayers, {});
  };

  const handleGoldenKeyApply = async (card) => {
    if (!gameState || gameState.goldenKeyState?.activePlayerId !== playerId) return;
    
    let baseUpdates = {
      'goldenKeyState.isOpen': false,
    };

    if (card.action === 'move' || card.action === 'move_to' || card.action === 'move_random') {
      let animValue = card.value;
      if (card.action === 'move_random') {
        animValue = Math.floor(Math.random() * 24);
      }
      
      await updateDoc(gameStateRef, {
        ...baseUpdates,
        goldenKeyMoveAnim: {
          triggeredAt: Date.now(),
          action: card.action,
          value: animValue,
          playerId: playerId
        }
      });
      return;
    } else if (card.action === 'steal_flag') {
      const othersLands = [];
      Object.keys(landOwnership).forEach(sid => {
        Object.keys(landOwnership[sid]).forEach(oid => {
          if (oid !== playerId) othersLands.push({ spaceId: parseInt(sid), ownerId: oid });
        });
      });
      if (othersLands.length > 0) {
        setStealState({ isOpen: true, othersLands });
        await updateDoc(gameStateRef, baseUpdates);
        return; 
      }
    } else if (card.action === 'roll_again') {
      baseUpdates['turnIndex'] = gameState.turnIndex; 
      baseUpdates['diceState.isRolling'] = false;
      await updateDoc(gameStateRef, baseUpdates);
      return;
    }
    
    // For 'skip_turn', 'none', or 'steal_flag' with no lands to steal:
    const skipMap = { ...(gameState.skipTurns || {}) };
    if (card.action === 'skip_turn') {
      // 블랙홀: 이 사람의 "다음 자기 차례" 한 번을 건너뛰게 예약한다.
      // 차례가 실제로 돌아왔을 때 computeNextTurn 이 이 값을 1 소모하고 지나간다.
      skipMap[playerId] = (skipMap[playerId] || 0) + 1;
    }
    const nextTurn = computeNextTurn(gameState.turnIndex, players, skipMap);
    baseUpdates['turnIndex'] = nextTurn.turnIndex;
    baseUpdates['skipTurns'] = nextTurn.skipTurns;
    baseUpdates['diceState.isRolling'] = false;
    await updateDoc(gameStateRef, baseUpdates);
  };

  const handleStealFlag = async (land) => {
    if (!land) {
      const cancelTurn = computeNextTurn(gameState.turnIndex, players, gameState.skipTurns);
      await updateDoc(gameStateRef, {
        turnIndex: cancelTurn.turnIndex,
        skipTurns: cancelTurn.skipTurns,
        'diceState.isRolling': false
      });
      setStealState({ isOpen: false });
      return;
    }
    const { spaceId, ownerId } = land;
    const newOwnership = { ...landOwnership };
    if (newOwnership[spaceId] && newOwnership[spaceId][ownerId]) {
      newOwnership[spaceId][ownerId] -= 1;
      if (newOwnership[spaceId][ownerId] <= 0) delete newOwnership[spaceId][ownerId];
    }
    if (!newOwnership[spaceId]) newOwnership[spaceId] = {};
    newOwnership[spaceId][playerId] = (newOwnership[spaceId][playerId] || 0) + 1;

    const nextTurn = computeNextTurn(gameState.turnIndex, players, gameState.skipTurns);
    await updateDoc(gameStateRef, {
      landOwnership: newOwnership,
      turnIndex: nextTurn.turnIndex,
      skipTurns: nextTurn.skipTurns,
      'diceState.isRolling': false
    });
    setStealState({ isOpen: false });
  };

  // 깃발 +1 은 예측과 실제 답이 일치하는 순간(위쪽 useEffect)에서만 처리한다.
  // 여기서는 턴만 넘긴다. (버튼 클릭으로 중복 지급되는 것을 막기 위함)
  const handleMissionSuccess = () => handleMissionFailOrClose();

  const handleMissionFailOrClose = async () => {
    if (!gameState || gameState.missionState.activePlayerId !== playerId) return;
    const nextTurn = computeNextTurn(gameState.turnIndex, players, gameState.skipTurns);
    await updateDoc(gameStateRef, {
      'missionState.isOpen': false,
      turnIndex: nextTurn.turnIndex,
      skipTurns: nextTurn.skipTurns,
      'diceState.isRolling': false
    });
  };

  // === TEST MODE START ===
  // 임시 테스트 패널. 황금열쇠를 "실제 뽑기와 동일한 경로"로 발동시키기 위한 껍데기다.
  // 실제 뽑기(handleSpaceArrival 의 goldenKey 분기)가 하는 일과 똑같이 goldenKeyState 만
  // 써 넣는다. 그러면 GoldenKeyModal 이 평소처럼 열리고, 확인을 누르면 실제
  // handleGoldenKeyApply 가 그대로 돈다. 효과를 흉내내는 코드는 여기에 하나도 없다.
  // 카드는 현재 차례인 사람(주사위를 굴릴 수 있는 사람) 앞으로 발동된다.
  const [testPanelOpen, setTestPanelOpen] = useState(false);

  const triggerTestGoldenKey = async (card) => {
    if (!gameState || players.length === 0) return;
    const turnOwner = players[(gameState.turnIndex || 0) % players.length];
    if (!turnOwner) return;
    await updateDoc(gameStateRef, {
      goldenKeyState: {
        isOpen: true,
        card: card,
        activePlayerId: turnOwner.id
      }
    });
  };
  // === TEST MODE END ===

  if (!gameState || players.length === 0) return null;

  const safeTurnIndex = (gameState.turnIndex || 0) % players.length;
  const currentPlayer = players[safeTurnIndex];
  const isMyTurn = currentPlayer?.id === playerId;
  const isDiceRolling = gameState.diceState.triggeredAt === lastDiceTrigger.current && (Date.now() - gameState.diceState.triggeredAt < 1500);

  return (
    <div style={styles.container}>
      <SpaceBackground minimal={true} />
      
      <div style={styles.boardWrapper}>
        <div style={styles.gridContainer}>
          {board.map((space, i) => {
            let row, col;
            if (i >= 0 && i <= 6) { row = 1; col = i + 1; }
            else if (i >= 7 && i <= 11) { row = i - 5; col = 7; }
            else if (i >= 12 && i <= 18) { row = 7; col = 19 - i; }
            else if (i >= 19 && i <= 23) { row = 25 - i; col = 1; }

            const spacePlayers = players.filter(p => p.position === i);
            const ownersMap = landOwnership[i];
            const owners = ownersMap ? Object.keys(ownersMap).map(id => players.find(p => p.id === id)).filter(Boolean) : [];

            return (
              <div key={space.id} style={{ gridRow: row, gridColumn: col }}>
                <BoardSpace space={space} players={spacePlayers} owners={owners} />
              </div>
            );
          })}

          <div style={styles.centerArea}>
            <div className="center-timer" style={styles.timerDisplay}>
              ⏳ 남은 시간: {formatTime(timeLeft)}
            </div>
            <div className="center-turn-indicator" style={{...styles.turnIndicator, whiteSpace: 'nowrap', textAlign: 'center'}}>
              지금은 <span style={{ color: currentPlayer?.character?.color }}>{currentPlayer?.name}</span>님 차례!
            </div>
            <div onClick={handleRollClick} style={{ pointerEvents: isMyTurn ? 'auto' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Dice 
                face={gameState.diceState.face} 
                rolling={isDiceRolling} 
                disabled={!isMyTurn} 
              />
              {isMyTurn ? (
                <span className="center-dice-message" style={{ marginTop: '10px', fontSize: '1.2rem', color: 'var(--color-yellow)', fontWeight: 'bold', animation: 'pulse 1.5s infinite', whiteSpace: 'nowrap' }}>주사위를 클릭하세요!</span>
              ) : null}
            </div>
            {!isMyTurn && (
              <p className="center-wait-message" style={{ color: 'white', fontWeight: 'bold', marginTop: '20px', fontSize: '1.2rem', textAlign: 'center', whiteSpace: 'nowrap' }}>{currentPlayer?.name}님이 주사위를 던지기를 기다리는 중...</p>
            )}
          </div>
        </div>
      </div>
      
      <MissionModal 
        isOpen={gameState.missionState.isOpen}
        missionState={gameState.missionState}
        players={players}
        myPlayerId={playerId}
        gameStateRef={gameStateRef}
        onClose={handleMissionFailOrClose}
        onSuccess={handleMissionSuccess}
      />
      
      <GoldenKeyModal
        isOpen={gameState.goldenKeyState?.isOpen}
        cardData={gameState.goldenKeyState?.card}
        activePlayer={players.find(p => p.id === gameState.goldenKeyState?.activePlayerId)}
        onApply={handleGoldenKeyApply}
      />

      <StealSelectionModal
        isOpen={stealState.isOpen}
        othersLands={stealState.othersLands}
        players={players}
        board={board}
        onSelect={handleStealFlag}
      />
      
      {isGameOver && (
        <ResultScreen 
          players={players} 
          landOwnership={landOwnership} 
          onHome={onHome} 
        />
      )}

      {/* === TEST MODE START === */}
      <div style={styles.testPanel}>
        <button style={styles.testPanelToggle} onClick={() => setTestPanelOpen((v) => !v)}>
          {testPanelOpen ? '⚠️ TEST MODE ▼' : '⚠️ TEST MODE ▲'}
        </button>
        {testPanelOpen && (
          <div style={styles.testPanelBody}>
            <div style={styles.testPanelNote}>
              황금열쇠 강제 발동 · 현재 차례: {currentPlayer?.name || '-'}
            </div>
            {goldenKeys.map((card) => (
              <button
                key={card.id}
                style={styles.testPanelButton}
                onClick={() => triggerTestGoldenKey(card)}
              >
                {card.id}. {card.title}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* === TEST MODE END === */}
    </div>
  );
}

const styles = {
  // === TEST MODE START ===
  testPanel: {
    position: 'fixed',
    left: '6px',
    bottom: '6px',
    zIndex: 3000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px',
  },
  testPanelToggle: {
    fontFamily: 'monospace',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#c62828',
    border: '2px solid #fff',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  testPanelBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    border: '2px dashed #ff5252',
    borderRadius: '6px',
    maxHeight: '60dvh',
    overflowY: 'auto',
  },
  testPanelNote: {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#ff8a80',
    marginBottom: '2px',
    whiteSpace: 'nowrap',
  },
  testPanelButton: {
    fontFamily: 'monospace',
    fontSize: '11px',
    textAlign: 'left',
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid #ff5252',
    borderRadius: '4px',
    padding: '4px 6px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  // === TEST MODE END ===
  container: {
    width: '100vw',
    height: '100dvh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  boardWrapper: {
    width: '100%',
    height: '100%',
    maxWidth: '100vw',
    maxHeight: '100dvh',
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2px',
    boxSizing: 'border-box',
  },
  gridContainer: {
    width: '100%',
    height: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridTemplateRows: 'repeat(7, 1fr)',
    gap: '3px',
  },
  centerArea: {
    gridArea: '2 / 2 / 7 / 7',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 'var(--wobbly-radius-2)',
    border: '4px dashed var(--color-mint)',
    gap: '20px',
    margin: '10px',
  },
  timerDisplay: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: 'var(--color-white)',
    textShadow: '2px 2px 0 var(--color-black)',
    marginBottom: '10px'
  },
  turnIndicator: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: '15px 40px',
    borderRadius: '30px',
    border: '4px solid var(--color-black)',
    boxShadow: '4px 4px 0 var(--color-black)',
    marginBottom: '30px',
    color: 'var(--color-black)',
    textShadow: 'none',
  }
};
