// 세션 코드별로 내 신원(playerId + roomId)을 localStorage 에 보관한다.
// 튕기거나 새로고침해도 같은 폰·브라우저라면 원래 자리로 복귀할 수 있게 하기 위함.
// 시크릿 모드 등 localStorage 가 막힌 환경에서도 죽지 않도록 전부 try/catch 로 감싼다.

const keyFor = (sessionCode) => `player_${sessionCode}`;

export function createPlayerId() {
  return Math.random().toString(36).substring(2, 9);
}

export function loadIdentity(sessionCode) {
  if (!sessionCode) return null;
  try {
    const raw = localStorage.getItem(keyFor(sessionCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.playerId) return null;
    return parsed; // { playerId, roomId, nickname }
  } catch {
    return null;
  }
}

export function saveIdentity(sessionCode, identity) {
  if (!sessionCode || !identity?.playerId) return;
  try {
    localStorage.setItem(keyFor(sessionCode), JSON.stringify(identity));
  } catch {
    // 저장 실패해도 게임 진행에는 지장이 없다. (닉네임 기반 복구 경로가 남아 있음)
  }
}

export function clearIdentity(sessionCode) {
  if (!sessionCode) return;
  try {
    localStorage.removeItem(keyFor(sessionCode));
  } catch {
    // 무시
  }
}
