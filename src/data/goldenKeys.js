export const goldenKeys = [
  { id: 1, title: '부스터 풀 가동!', description: '로켓 엔진 점화!\n앞으로 3칸 강제 이동합니다.', action: 'move', value: 3 },
  { id: 2, title: '우주 미아', description: '연료가 부족합니다.\n뒤로 2칸 밀려납니다.', action: 'move', value: -2 },
  { id: 3, title: '블랙홀 주의', description: '강력한 중력장에 갇혔습니다!\n다음 턴을 1회 쉼니다.', action: 'skip_turn' },
  { id: 4, title: '초공간 도약', description: '공간을 뚫고\n출발지로 즉시 귀환합니다.', action: 'move_to', value: 0 },
  { id: 5, title: '우주 해적의 습격!', description: '무작위로 다른 플레이어의\n깃발 1개를 강탈하여\n내 것으로 만듭니다!', action: 'steal_flag' },
  { id: 6, title: '웜홀 발견', description: '시공간이 왜곡됩니다!\n주사위를 한 번 더 굴리세요!', action: 'roll_again' },
  { id: 7, title: '차원 이동기 오작동', description: '어디로 갈지 모릅니다!\n랜덤한 다른 칸으로 날아갑니다.', action: 'move_random' },
  { id: 8, title: '우주 폭풍', description: '강력한 항성풍에 휩쓸렸습니다.\n뒤로 3칸 밀려납니다.', action: 'move', value: -3 },
  { id: 9, title: '소행성 지대 통과', description: '위험 지대를 무사히 돌파했습니다!\n보너스로 앞으로 2칸 전진합니다.', action: 'move', value: 2 },
  { id: 10, title: '순항 중', description: '아무 일도 일어나지 않았습니다.\n고요한 우주를 감상하세요.', action: 'none' },
];
