import type {MatchPreset} from '../types/comparison';

export const MATCH_PRESETS: MatchPreset[] = [
  {
    id: 'flagship-phones',
    category: '테크',
    labelA: '아이폰 16 프로',
    labelB: '갤럭시 S25 울트라',
    focusCriteria: '카메라 완성도, 실사용 편의성, 배터리 및 가격 대비 가치',
  },
  {
    id: 'coffee-duel',
    category: '라이프',
    labelA: '아이스 아메리카노',
    labelB: '아이스 카페라떼',
    focusCriteria: '각성 효과, 칼로리 부담, 식후 어울림, 데일리 만족도',
  },
  {
    id: 'work-style',
    category: '커리어',
    labelA: '주 5일 완전 재택근무',
    labelB: '주 3일 출근 하이브리드',
    focusCriteria: '업무 몰입도, 팀 협업 효율, 워라밸, 장기 성장성',
  },
  {
    id: 'travel-spot',
    category: '여행',
    labelA: '제주도 2박 3일',
    labelB: '후쿠오카 2박 3일',
    focusCriteria: '총 경비, 미식 경험, 이동 피로도, 휴양 만족감',
  },
];
