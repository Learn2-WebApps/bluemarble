export const CATEGORIES = [
  { name: '직장', color: '#FF4B3E' },       // Red
  { name: '관계', color: '#FF66A3' },       // Pink
  { name: '집', color: '#3EA1FF' },         // Blue
  { name: '여행', color: '#00C996' },       // Mint
  { name: '돈/소비', color: '#8D6E63' },    // Brown (지갑 느낌)
  { name: '건강', color: '#AED581' },       // Soft Light Green
  { name: '취미', color: '#B39DDB' },       // Soft Purple
  { name: 'SNS', color: '#4DB6AC' },        // Teal
  { name: '갈등상황', color: '#E57373' },   // Soft Red
  { name: '자기계발', color: '#64B5F6' },   // Soft Blue
  { name: '워라밸', color: '#FFB74D' }      // Soft Orange
];

// Shuffle array utility
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateBoard() {
  const TOTAL_SPACES = 24;
  const START_INDEX = 0;
  // 황금열쇠 3개 (우측, 하단, 좌측 중앙쯤)
  const GOLDEN_KEY_INDICES = [9, 15, 21]; 

  // 카테고리 풀을 2배로 불려서 22개를 만듦 (20개만 사용할 예정)
  let pool = [...CATEGORIES, ...CATEGORIES];
  pool = shuffle(pool);

  const board = [];
  let categoryIdx = 0;

  for (let i = 0; i < TOTAL_SPACES; i++) {
    if (i === START_INDEX) {
      board.push({
        id: i,
        type: 'start',
        name: 'START',
        color: '#FFFFFF'
      });
    } else if (GOLDEN_KEY_INDICES.includes(i)) {
      board.push({
        id: i,
        type: 'goldenKey',
        name: '황금열쇠',
        color: '#FFD700' // Gold
      });
    } else {
      // 인접한 칸이 같은 카테고리가 되지 않도록 보정
      let selectedCat = pool[categoryIdx];
      if (board.length > 0 && board[board.length - 1].type === 'category' && board[board.length - 1].name === selectedCat.name) {
        // 다음 카테고리와 스왑 시도
        if (categoryIdx + 1 < pool.length) {
          let temp = pool[categoryIdx];
          pool[categoryIdx] = pool[categoryIdx + 1];
          pool[categoryIdx + 1] = temp;
          selectedCat = pool[categoryIdx];
        }
      }
      
      board.push({
        id: i,
        type: 'category',
        name: selectedCat.name,
        color: selectedCat.color
      });
      categoryIdx++;
    }
  }

  return board;
}
