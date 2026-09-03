/**
 * 지목 대상(예측 당하는 사람) 선정 규칙 검증용 시뮬레이터.
 *
 * src/pages/GameBoard.jsx 의 handleSpaceArrival 안에 있는 후보 선정 구간을
 * 순수 함수로 그대로 복제해서, Firestore·브라우저 없이 통계만 뽑는다.
 * 게임 코드를 고치면 아래 pickTarget 도 같은 규칙으로 맞춰 주어야 한다.
 *
 * 실행: node scripts/simulateTarget.js
 */

// ---------------------------------------------------------------------------
// 1. 지목 대상 선정 로직 (GameBoard.jsx 복제본)
// ---------------------------------------------------------------------------

/**
 * @param {{id: string}[]} players       방 안의 전체 플레이어
 * @param {string} activePlayerId        이번 차례인 사람 = 예측자
 * @param {string|null} lastTargetId     직전에 지목당한 사람
 * @param {() => number} random          0 이상 1 미만 난수 생성기
 * @returns {{id: string}|null}          이번에 지목당할 사람
 */
function pickTarget(players, activePlayerId, lastTargetId, random) {
  // 자기 자신 제외 + 같은 id 중복 제거
  const seenIds = new Set();
  const otherPlayers = players.filter((p) => {
    if (!p || !p.id || p.id === activePlayerId) return false;
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  if (otherPlayers.length === 0) return null;

  // 직전에 지목당한 사람은 연속으로 걸리지 않게 뺀다.
  // 인원수로 막지 않고, 뺐을 때 후보가 최소 1명 남는 경우에만 적용한다.
  // (2인 플레이에서 하나뿐인 상대가 직전 대상이면 filtered 가 비므로 그대로 둔다.)
  let candidates = otherPlayers;
  if (lastTargetId) {
    const filtered = otherPlayers.filter((p) => p.id !== lastTargetId);
    if (filtered.length > 0) candidates = filtered;
  }

  return candidates[Math.floor(random() * candidates.length)];
}

// ---------------------------------------------------------------------------
// 2. 시뮬레이션
// ---------------------------------------------------------------------------

// 실행할 때마다 같은 결과가 나오도록 시드 고정 난수를 쓴다.
// (게임 본체는 Math.random 을 쓰지만, 규칙의 통계적 성질을 보는 데는 영향이 없다.)
function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TURNS_PER_PLAYER = 20000; // 인원수 × 20000 턴

function simulate(playerCount, seed) {
  const players = [];
  for (let i = 0; i < playerCount; i++) players.push({ id: `P${i + 1}` });

  const random = mulberry32(seed);
  const totalTurns = playerCount * TURNS_PER_PLAYER;

  const counts = {};
  players.forEach((p) => { counts[p.id] = 0; });

  let turnIndex = 0;
  let lastTargetId = null;
  let consecutive = 0;
  let emptyCandidate = 0;

  for (let t = 0; t < totalTurns; t++) {
    const activePlayer = players[turnIndex];
    const target = pickTarget(players, activePlayer.id, lastTargetId, random);

    if (!target) {
      // 후보가 0명이 되는 상황. 절대 나오면 안 된다.
      emptyCandidate++;
    } else {
      if (target.id === lastTargetId) consecutive++;
      counts[target.id]++;
      lastTargetId = target.id;
    }

    // 실제 게임과 동일하게 다음 차례로 넘어간다.
    turnIndex = (turnIndex + 1) % players.length;
  }

  return { players, totalTurns, counts, consecutive, emptyCandidate };
}

// ---------------------------------------------------------------------------
// 3. 출력
// ---------------------------------------------------------------------------

function pct(part, whole) {
  return ((part / whole) * 100).toFixed(2) + '%';
}

function report(playerCount, seed) {
  const { players, totalTurns, counts, consecutive, emptyCandidate } = simulate(playerCount, seed);
  const expected = 100 / playerCount;

  console.log(`=== ${playerCount}명 ===`);
  console.log(`총 턴 수: ${totalTurns}   (균등 기대치: ${expected.toFixed(2)}%)`);
  console.log('  플레이어   지목 횟수      비율      기대치 대비');
  players.forEach((p) => {
    const c = counts[p.id];
    const share = (c / totalTurns) * 100;
    const diff = share - expected;
    console.log(
      '  ' + p.id.padEnd(10) +
      String(c).padStart(9) + '   ' +
      pct(c, totalTurns).padStart(8) + '   ' +
      (diff >= 0 ? '+' : '') + diff.toFixed(2) + '%p'
    );
  });
  console.log(`  연속 지목(직전과 동일 대상): ${consecutive}회 (${pct(consecutive, totalTurns)})`);
  console.log(`  후보 0명이 된 횟수: ${emptyCandidate}회`);
  console.log('');
}

console.log('지목 대상 선정 규칙 시뮬레이션');
console.log(`(인원수 × ${TURNS_PER_PLAYER} 턴, 시드 고정)`);
console.log('');

for (let n = 3; n <= 8; n++) {
  report(n, 12345 + n);
}

// 2명일 때는 상대가 1명뿐이라 직전 대상을 빼면 후보가 사라진다.
// 그 경우에도 후보가 0명이 되지 않는지 안전장치를 따로 확인한다.
const two = simulate(2, 99);
console.log('=== 안전장치 확인: 2명 ===');
console.log(`총 턴 수: ${two.totalTurns}`);
console.log(`  후보 0명이 된 횟수: ${two.emptyCandidate}회  ${two.emptyCandidate === 0 ? '(정상)' : '(문제!)'}`);
console.log(`  연속 지목: ${two.consecutive}회  (차례가 번갈아 도니 대상도 번갈아 나온다)`);
