import { FocusCriterion, PresetMatchup } from "../types/comparison";

export const FOCUS_OPTIONS: Array<{
  id: FocusCriterion;
  label: string;
  description: string;
}> = [
  {
    id: "balanced",
    label: "종합 평가",
    description: "장단점과 완성도를 균형 있게 종합 판단",
  },
  {
    id: "value",
    label: "가성비 · 실용성",
    description: "비용 대비 효용, 관리 편의, 실생활 활용도",
  },
  {
    id: "aesthetic",
    label: "디자인 · 심미성",
    description: "시각적 조화, 색감, 구도, 분위기 중심",
  },
  {
    id: "performance",
    label: "성능 · 효율",
    description: "기능적 완성도, 생산성, 결과물 품질",
  },
  {
    id: "experience",
    label: "감성 · 경험",
    description: "만족도, 독창성, 취향과 여운 중심",
  },
];

export const PRESET_MATCHUPS: PresetMatchup[] = [
  {
    id: "preset-interior",
    category: "사진 비교 · 인테리어",
    title: "북유럽 미니멀 거실 vs 인더스트리얼 로프트",
    description: "두 인테리어 사진의 채광, 소재 조화, 거주 쾌적성을 비교합니다.",
    focusCriterion: "aesthetic",
    focusDetail: "오래 머물렀을 때의 시각적 편안함과 공간 완성도 기준",
    sideA: {
      text: "화이트 톤 린넨 커튼과 원목 테이블, 올리브 나무가 배치된 북유럽 거실",
      imagePath: "/src/assets/images/interior_nordic_living_1795397657071.jpg",
    },
    sideB: {
      text: "적벽돌과 코냑 가죽 소파, 대형 블랙 스틸 창이 돋보이는 로프트 거실",
      imagePath: "/src/assets/images/interior_loft_living_1795397657014.jpg",
    },
  },
  {
    id: "preset-food",
    category: "사진 비교 · 미식",
    title: "더블 스매시 치즈버거 vs 나폴리 화덕 피자",
    description: "비주얼, 식감 조화, 풍미 밀도 관점에서 두 메뉴를 판정합니다.",
    focusCriterion: "experience",
    focusDetail: "주말 저녁 한 끼로 가장 큰 만족감을 주는 메뉴 기준",
    sideA: {
      text: "브리오슈 번과 캐러멜라이즈드 어니언이 어우러진 수제 더블 치즈버거",
      imagePath: "/src/assets/images/food_craft_burger_1795397656685.jpg",
    },
    sideB: {
      text: "산마르자노 토마토와 생 모짜렐라, 바질을 올린 화덕 마르게리타 피자",
      imagePath: "/src/assets/images/food_woodfire_pizza_1795397656571.jpg",
    },
  },
  {
    id: "preset-work",
    category: "주제 비교 · 라이프스타일",
    title: "주 5일 완전 재택근무 vs 사무실 출근",
    description: "집중도, 통근 피로, 협업 효율, 워라밸 측면의 비율 승부입니다.",
    focusCriterion: "balanced",
    focusDetail: "IT 직군 직장인의 1년 이상 장기 근무 기준",
    sideA: {
      text: "완전 재택근무 (통근 시간 0분, 자유로운 환경 조절, 비대면 화상 협업)",
    },
    sideB: {
      text: "사무실 출근 근무 (즉각적인 대면 소통, 일과 삶의 물리적 분리, 사내 네트워킹)",
    },
  },
  {
    id: "preset-travel",
    category: "주제 비교 · 여행",
    title: "제주도 3박 4일 힐링 여행 vs 도쿄 3박 4일 시티 투어",
    description: "이동 피로도, 비용 효율, 미식·쇼핑, 휴식 만족도를 비교합니다.",
    focusCriterion: "value",
    focusDetail: "직장인 연차 2일 활용, 2인 커플 여행 기준",
    sideA: {
      text: "제주도 렌터카 3박 4일 (오션뷰 카페, 해안 드라이브, 흑돼지·해산물)",
    },
    sideB: {
      text: "도쿄 자유여행 3박 4일 (시부야·다이칸야마 산책, 미식 투어, 쇼핑·전시)",
    },
  },
];
