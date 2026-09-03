/**
 * 지목 대상(예측 당하는 사람) 선정 규칙 검증용 시뮬레이터.
 *
 * Firestore·브라우저 없이 순수 JS 로만 통계를 뽑는다.
 * 실행: node scripts/simulateTarget.js
 *
 * 시나리오
 *   B  (현재 규칙)  src/pages/GameBoard.jsx 의 handleSpaceArrival 후보 선정 구간 복제.
 *                   예측자 자신 + 직전에 지목당한 사람 1명 + 예측자가 직전에 붙었던
 *                   상대 1명을 제외한다. 붙은 두 사람은 서로를 기억한다
 *                   (Firestore gameState.lastOpponent 를 양쪽 갱신).
 *   A  (이전 규칙)  직전에 지목당한 사람 1명만 제외. 비교 기준으로 남겨 둔다.
 *   B2 (변형)       B 와 같되 예측자 쪽만 기억한다. 3명에서 무너지는 것을 보여 준다.
 *
 * 제외를 다 적용하면 후보가 0명이 되는 경우가 핵심 관심사다. 게임 코드와 동일하게
 * "직전 지목 대상만 제외" 로 한 단계 완화하고, 그래도 비면 원래 후보를 쓴다.
 */

// ---------------------------------------------------------------------------
// 1. 지목 대상 선정 로직
// ---------------------------------------------------------------------------

/**
 * @param {{id: string}[]} players     방 안의 전체 플레이어
 * @param {string} activePlayerId      이번 차례인 사람 = 예측자
 * @param {string|null} lastTargetId   직전 턴에 지목당한 사람
 * @param {string|null} lastOpponentId 예측자가 직전에 붙었던 상대 (시나리오 A 는 항상 null)
 * @param {() => number} random        0 이상 1 미만 난수 생성기
 * @returns {{target: {id: string}|null, exhausted: boolean}}
 *          exhausted = 제외 규칙을 다 적용하면 후보가 0명이 되어 임시 fallback 을 쓴 경우
 */
function pickTarget(players, activePlayerId, lastTargetId, lastOpponentId, random) {
  // 자기 자신 제외 + 같은 id 중복 제거 (게임 코드와 동일)
  const seenIds = new Set();
  const otherPlayers = players.filter((p) => {
    if (!p || !p.id || p.id === activePlayerId) return false;
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  if (otherPlayers.length === 0) return { target: null, exhausted: false };

  let candidates = otherPlayers;
  let exhausted = false;

  if (lastTargetId || lastOpponentId) {
    const filtered = otherPlayers.filter(
      (p) => p.id !== lastTargetId && p.id !== lastOpponentId
    );

    if (filtered.length > 0) {
      candidates = filtered;
    } else {
      // 관심 지점: 제외를 다 적용하면 뽑을 사람이 없어지는 상황.
      // 게임 코드와 동일하게 "직전 지목 대상만 제외" 로 한 단계 완화한다.
      exhausted = true;
      const fallback = otherPlayers.filter((p) => p.id !== lastTargetId);
      candidates = fallback.length > 0 ? fallback : otherPlayers;
    }
  }

  return { target: candidates[Math.floor(random() * candidates.length)], exhausted };
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

const SCENARIOS = {
  A:  { useLastOpponent: false, symmetric: false },
  B:  { useLastOpponent: true,  symmetric: true  },
  B2: { useLastOpponent: true,  symmetric: false },
};

function simulate(playerCount, seed, scenarioKey, turnsPerPlayer = TURNS_PER_PLAYER) {
  const { useLastOpponent, symmetric } = SCENARIOS[scenarioKey];

  const players = [];
  for (let i = 0; i < playerCount; i++) players.push({ id: `P${i + 1}` });

  const random = mulberry32(seed);
  const totalTurns = playerCount * turnsPerPlayer;

  const counts = {};
  players.forEach((p) => { counts[p.id] = 0; });

  const lastOpponent = {}; // 플레이어별 "직전에 붙었던 상대" 1명
  let turnIndex = 0;
  let lastTargetId = null;
  let consecutive = 0;
  let exhaustedCount = 0;
  let noCandidate = 0;

  for (let t = 0; t < totalTurns; t++) {
    const activeId = players[turnIndex].id;
    const { target, exhausted } = pickTarget(
      players,
      activeId,
      lastTargetId,
      useLastOpponent ? (lastOpponent[activeId] || null) : null,
      random
    );

    if (exhausted) exhaustedCount++;

    if (!target) {
      noCandidate++; // 후보가 물리적으로 0명. 3명 이상에서는 나올 수 없다.
    } else {
      if (target.id === lastTargetId) consecutive++;
      counts[target.id]++;
      lastTargetId = target.id;
      lastOpponent[activeId] = target.id;
      if (symmetric) lastOpponent[target.id] = activeId;
    }

    // 실제 게임과 동일하게 다음 차례로 넘어간다.
    turnIndex = (turnIndex + 1) % players.length;
  }

  return { players, totalTurns, counts, consecutive, exhaustedCount, noCandidate, n: playerCount };
}

// ---------------------------------------------------------------------------
// 3. 출력
// ---------------------------------------------------------------------------

function pct(part, whole) {
  return ((part / whole) * 100).toFixed(2) + '%';
}

function cell(count, total) {
  return String(count).padStart(8) + '  ' + pct(count, total).padStart(7);
}

function pair(count, total) {
  return (String(count) + '회 ' + pct(count, total)).padEnd(20);
}

function maxSpread(r) {
  const expected = r.totalTurns / r.n;
  let worst = 0;
  r.players.forEach((p) => {
    const d = Math.abs(r.counts[p.id] - expected) / r.totalTurns * 100;
    if (d > worst) worst = d;
  });
  return '+-' + worst.toFixed(2) + '%p';
}

function comparePair(playerCount, seed) {
  const a = simulate(playerCount, seed, 'A');
  const b = simulate(playerCount, seed, 'B');
  const expected = 100 / playerCount;

  console.log(`=== ${playerCount}명  (총 ${a.totalTurns}턴, 균등 기대치 ${expected.toFixed(2)}%) ===`);
  console.log('           A: 이전(직전 대상만)   B: 현재(대상+직전 상대)');
  console.log('  플레이어      횟수     비율          횟수     비율');
  a.players.forEach((p) => {
    console.log('  ' + p.id.padEnd(10) + cell(a.counts[p.id], a.totalTurns) + '    ' + cell(b.counts[p.id], b.totalTurns));
  });
  console.log('  ' + '연속 지목'.padEnd(8) + '  ' + cell(a.consecutive, a.totalTurns) + '    ' + cell(b.consecutive, b.totalTurns));
  console.log('  ' + '후보 0명'.padEnd(8) + '  ' + cell(a.exhaustedCount, a.totalTurns) + '    ' + cell(b.exhaustedCount, b.totalTurns));
  console.log('');

  return { a, b };
}

console.log('지목 대상 선정 규칙 시뮬레이션 - 현재 규칙(B) vs 이전 규칙(A)');
console.log(`(인원수 x ${TURNS_PER_PLAYER} 턴, 시드 고정, 차례는 (turnIndex+1) % n 순환)`);
console.log('B  = 현재 규칙 (게임 코드와 동일): 직전 지목 대상 + 예측자의 직전 상대, 둘 다 제외 (서로 기억)');
console.log('A  = 이전 규칙 (비교 기준): 직전에 지목당한 사람 1명만 제외');
console.log('B2 = 변형: 위와 같되 예측자 쪽만 기억');
console.log('후보 0명 = 제외 규칙을 다 적용하면 뽑을 사람이 없어져 임시 fallback 을 쓴 횟수');
console.log('');

const summary = [];
for (let n = 3; n <= 8; n++) {
  const { a, b } = comparePair(n, 12345 + n);
  const b2 = simulate(n, 12345 + n, 'B2');
  summary.push({ n, a, b, b2 });
}

// ---------------------------------------------------------------------------
// 4. 핵심 관심사 요약
// ---------------------------------------------------------------------------

console.log('-------------------------------------------------------------------------');
console.log('[요약 1] "둘 다 제외하면 후보 0명" 발생 빈도');
console.log('');
console.log('  인원     총 턴수    A(이전)             B(현재)             B2(예측자만 기억)');
summary.forEach(({ n, a, b, b2 }) => {
  console.log(
    '  ' + (n + '명').padEnd(7) +
    String(a.totalTurns).padStart(8) + '   ' +
    pair(a.exhaustedCount, a.totalTurns) +
    pair(b.exhaustedCount, b.totalTurns) +
    pair(b2.exhaustedCount, b2.totalTurns)
  );
});
console.log('');

console.log('[요약 2] 연속 지목(직전과 동일 대상) 횟수');
console.log('');
console.log('  인원              A(이전)             B(현재)             B2(예측자만 기억)');
summary.forEach(({ n, a, b, b2 }) => {
  console.log(
    '  ' + (n + '명').padEnd(7) + '           ' +
    pair(a.consecutive, a.totalTurns) +
    pair(b.consecutive, b.totalTurns) +
    pair(b2.consecutive, b2.totalTurns)
  );
});
console.log('');

console.log('[요약 3] 지목 비율의 최대 편차 (균등 기대치 대비)');
console.log('');
console.log('  인원        A(이전)      B(현재)      B2(예측자만 기억)');
summary.forEach(({ n, a, b, b2 }) => {
  console.log('  ' + (n + '명').padEnd(7) + '     ' + maxSpread(a).padEnd(13) + maxSpread(b).padEnd(13) + maxSpread(b2));
});
console.log('');

// 3명 B 의 "후보 0명 0회" 가 이 시드에서만 나온 우연인지 확인한다.
// others 가 n-1 명이고 제외가 최대 2명이므로 4명 이상은 구조적으로 0 이 보장되지만,
// 3명은 others 가 2명이라 둘 다 걸리면 비워질 수 있어 시드를 바꿔 가며 확인해야 한다.
const SEED_SWEEP_COUNT = 200;
const SEED_SWEEP_TURNS = 2000; // 인원수 × 2000 턴 (시드를 많이 돌리므로 짧게)

function seedSweep(n, scenarioKey) {
  let seedsWithEmpty = 0;
  let worst = 0;
  for (let seed = 1; seed <= SEED_SWEEP_COUNT; seed++) {
    const r = simulate(n, seed, scenarioKey, SEED_SWEEP_TURNS);
    if (r.exhaustedCount > 0) seedsWithEmpty++;
    const p = (r.exhaustedCount / r.totalTurns) * 100;
    if (p > worst) worst = p;
  }
  return { seedsWithEmpty, worst };
}

console.log('[요약 4] 시드 민감도: "후보 0명" 이 특정 시드만의 우연인지 확인');
console.log(`(시드 ${SEED_SWEEP_COUNT}개 x 인원수 x ${SEED_SWEEP_TURNS}턴)`);
console.log('');
console.log('  인원     B(현재): 발생 시드수 / 최대 발생률     B2(예측자만): 발생 시드수 / 최대 발생률');
for (let n = 3; n <= 8; n++) {
  const b = seedSweep(n, 'B');
  const b2 = seedSweep(n, 'B2');
  console.log(
    '  ' + (n + '명').padEnd(7) + '  ' +
    (`${b.seedsWithEmpty} / ${SEED_SWEEP_COUNT}개, 최대 ${b.worst.toFixed(2)}%`).padEnd(38) +
    `${b2.seedsWithEmpty} / ${SEED_SWEEP_COUNT}개, 최대 ${b2.worst.toFixed(2)}%`
  );
}
console.log('');

// 2명은 상대가 1명뿐이라 제외 규칙이 곧바로 후보를 비운다. 참고용으로 같이 확인한다.
console.log('-------------------------------------------------------------------------');
console.log('[참고] 2명 (시뮬레이션 대상 범위 밖, fallback 동작 확인용)');
const twoA = simulate(2, 99, 'A');
const twoB = simulate(2, 99, 'B');
console.log(`  총 ${twoA.totalTurns}턴`);
console.log(`  A   후보 0명 ${twoA.exhaustedCount}회 ${pct(twoA.exhaustedCount, twoA.totalTurns)}   물리적 후보 0명 ${twoA.noCandidate}회`);
console.log(`  B   후보 0명 ${twoB.exhaustedCount}회 ${pct(twoB.exhaustedCount, twoB.totalTurns)}   물리적 후보 0명 ${twoB.noCandidate}회`);
