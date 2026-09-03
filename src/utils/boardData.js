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

export const TOTAL_SPACES = 24;
export const START_INDEX = 0;
// 황금열쇠 3개 (우측, 하단, 좌측 중앙쯤)
export const GOLDEN_KEY_INDICES = [9, 15, 21];

// 보드 배치는 고정이다.
// 예전에는 호출할 때마다 카테고리 풀을 섞어서 만들었는데, 그러면 기기마다·새로고침마다
// 다른 배치가 나와 같은 방의 PC 와 폰이 서로 다른 보드를 보게 된다. 배치를 아래 한 벌로
// 못 박아 두면 모든 기기가 같은 코드를 읽으므로 별도 공유 장치 없이 자동으로 일치한다.
//
// 지켜야 할 제약 (배치를 바꿀 때도 유지할 것):
//   - 0번은 START, 9·15·21번은 황금열쇠
//   - 나머지 20칸은 CATEGORIES 11종이 모두 등장 (9종은 2회, 2종은 1회)
//   - 인접한 두 칸은 서로 다른 카테고리
// color 값은 위 CATEGORIES 의 색과 같다. 색을 바꾸려면 양쪽을 함께 고쳐야 한다.
const FIXED_BOARD = [
  { id: 0, type: 'start', name: 'START', color: '#FFFFFF' },
  { id: 1, type: 'category', name: '돈/소비', color: '#8D6E63' },
  { id: 2, type: 'category', name: '관계', color: '#FF66A3' },
  { id: 3, type: 'category', name: '자기계발', color: '#64B5F6' },
  { id: 4, type: 'category', name: '건강', color: '#AED581' },
  { id: 5, type: 'category', name: '워라밸', color: '#FFB74D' },
  { id: 6, type: 'category', name: 'SNS', color: '#4DB6AC' },
  { id: 7, type: 'category', name: '여행', color: '#00C996' },
  { id: 8, type: 'category', name: '집', color: '#3EA1FF' },
  { id: 9, type: 'goldenKey', name: '황금열쇠', color: '#FFD700' },
  { id: 10, type: 'category', name: '갈등상황', color: '#E57373' },
  { id: 11, type: 'category', name: '여행', color: '#00C996' },
  { id: 12, type: 'category', name: '갈등상황', color: '#E57373' },
  { id: 13, type: 'category', name: '워라밸', color: '#FFB74D' },
  { id: 14, type: 'category', name: '집', color: '#3EA1FF' },
  { id: 15, type: 'goldenKey', name: '황금열쇠', color: '#FFD700' },
  { id: 16, type: 'category', name: 'SNS', color: '#4DB6AC' },
  { id: 17, type: 'category', name: '취미', color: '#B39DDB' },
  { id: 18, type: 'category', name: '직장', color: '#FF4B3E' },
  { id: 19, type: 'category', name: '돈/소비', color: '#8D6E63' },
  { id: 20, type: 'category', name: '취미', color: '#B39DDB' },
  { id: 21, type: 'goldenKey', name: '황금열쇠', color: '#FFD700' },
  { id: 22, type: 'category', name: '관계', color: '#FF66A3' },
  { id: 23, type: 'category', name: '자기계발', color: '#64B5F6' }
];

export function generateBoard() {
  // 호출부가 배열이나 칸 객체를 손대더라도 원본 상수가 오염되지 않도록 매번 새로 복사해 돌려준다.
  return FIXED_BOARD.map((space) => ({ ...space }));
}
