const STORAGE_KEY = "ctd_products_v5";

const defaultCtdItems = [
  { module: "Module 1", code: "1.1", title: "목차", required: true },
  { module: "Module 1", code: "1.2", title: "신청서 및 행정정보", required: true },
  { module: "Module 1", code: "1.3", title: "품목허가사항", required: true },
  { module: "Module 1", code: "1.4", title: "품목설명자료", required: true },
  { module: "Module 1", code: "1.5", title: "제조판매·수입 관련 자료", required: true },
  { module: "Module 1", code: "1.6", title: "GMP 관련 자료", required: true },
  { module: "Module 1", code: "1.7", title: "생물학적동등성 관련 자료", required: false },
  { module: "Module 1", code: "1.8", title: "위해성 관리계획", required: false },
  { module: "Module 1", code: "1.9", title: "첨부문서", required: true },
  { module: "Module 1", code: "1.10", title: "사용상 주의사항", required: true },
  { module: "Module 1", code: "1.11", title: "기타 행정자료", required: false },

  { module: "Module 2", code: "2.3.S", title: "원료의약품 품질 요약", required: true },
  { module: "Module 2", code: "2.3.S.1", title: "원료의약품 일반정보 요약", required: true },
  { module: "Module 2", code: "2.3.S.2", title: "원료의약품 제조 요약", required: true },
  { module: "Module 2", code: "2.3.S.3", title: "원료의약품 특성 요약", required: true },
  { module: "Module 2", code: "2.3.S.4", title: "원료의약품 관리 요약", required: true },
  { module: "Module 2", code: "2.3.S.5", title: "표준품 또는 표준물질 요약", required: false },
  { module: "Module 2", code: "2.3.S.6", title: "용기 및 포장 요약", required: false },
  { module: "Module 2", code: "2.3.S.7", title: "안정성 요약", required: true },

  { module: "Module 2", code: "2.3.P", title: "완제의약품 품질 요약", required: true },
  { module: "Module 2", code: "2.3.P.1", title: "완제의약품 설명 및 조성 요약", required: true },
  { module: "Module 2", code: "2.3.P.2", title: "제제개발 요약", required: true },
  { module: "Module 2", code: "2.3.P.3", title: "완제의약품 제조 요약", required: true },
  { module: "Module 2", code: "2.3.P.4", title: "첨가제 관리 요약", required: true },
  { module: "Module 2", code: "2.3.P.5", title: "완제의약품 관리 요약", required: true },
  { module: "Module 2", code: "2.3.P.6", title: "표준품 또는 표준물질 요약", required: false },
  { module: "Module 2", code: "2.3.P.7", title: "용기 및 포장 요약", required: false },
  { module: "Module 2", code: "2.3.P.8", title: "안정성 요약", required: true },

  { module: "Module 2", code: "2.4", title: "비임상 개요", required: false },
  { module: "Module 2", code: "2.5", title: "임상 개요", required: false },
  { module: "Module 2", code: "2.6", title: "비임상 요약", required: false },
  { module: "Module 2", code: "2.7", title: "임상 요약", required: false },

  { module: "Module 3", code: "3.2.S", title: "원료의약품", required: true },
  { module: "Module 3", code: "3.2.S.1", title: "일반정보", required: true },
  { module: "Module 3", code: "3.2.S.2", title: "제조", required: true },
  { module: "Module 3", code: "3.2.S.3", title: "특성", required: true },
  { module: "Module 3", code: "3.2.S.4", title: "원료의약품의 관리", required: true },
  { module: "Module 3", code: "3.2.S.5", title: "표준품 또는 표준물질", required: false },
  { module: "Module 3", code: "3.2.S.6", title: "용기 및 포장", required: false },
  { module: "Module 3", code: "3.2.S.7", title: "안정성", required: true },

  { module: "Module 3", code: "3.2.P", title: "완제의약품", required: true },
  { module: "Module 3", code: "3.2.P.1", title: "완제의약품의 설명 및 조성", required: true },
  { module: "Module 3", code: "3.2.P.2", title: "제제개발", required: true },
  { module: "Module 3", code: "3.2.P.3", title: "제조", required: true },
  { module: "Module 3", code: "3.2.P.4", title: "첨가제의 관리", required: true },
  { module: "Module 3", code: "3.2.P.5", title: "완제의약품의 관리", required: true },
  { module: "Module 3", code: "3.2.P.6", title: "표준품 또는 표준물질", required: false },
  { module: "Module 3", code: "3.2.P.7", title: "용기 및 포장", required: false },
  { module: "Module 3", code: "3.2.P.8", title: "안정성", required: true },

  { module: "Module 4", code: "4.1", title: "비임상시험자료 목차", required: false },
  { module: "Module 4", code: "4.2", title: "비임상시험보고서", required: false },
  { module: "Module 4", code: "4.3", title: "문헌참고자료", required: false },

  { module: "Module 5", code: "5.1", title: "임상시험자료 목차", required: false },
  { module: "Module 5", code: "5.2", title: "모든 임상시험 목록", required: false },
  { module: "Module 5", code: "5.3", title: "임상시험보고서", required: false },
  { module: "Module 5", code: "5.4", title: "문헌참고자료", required: false }
];

function createCtdItems() {
  return defaultCtdItems.map(item => ({
    ...item,
    ctdVersionStatus: "구버전",
    revisionDate: "",
    available: false
  }));
}

const defaultProducts = [
  {
    productId: "PRD-001",
    productName: "아세트정 500mg",
    approvalNumber: "2024-1234",
    companyName: "대한제약",
    manufacturingType: "자사제조",
    dosageForm: "정제",
    ctdConverted: true,
    status: "허가",
    ctdItems: createCtdItems()
  }
];

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultProducts));
    return defaultProducts;
  }

  return JSON.parse(saved);
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function getRequiredItems(product) {
  return product.ctdItems.filter(item => item.required);
}

function getAvailableModuleCount(product) {
  return getRequiredItems(product).filter(item => item.available).length;
}

function getNewVersionItems(product) {
  return getRequiredItems(product).filter(item => item.ctdVersionStatus === "신버전");
}

function getNewVersionRate(product) {
  const requiredItems = getRequiredItems(product);
  if (requiredItems.length === 0) return 0;

  return Math.round((getNewVersionItems(product).length / requiredItems.length) * 100);
}

function isComplete(product) {
  const requiredItems = getRequiredItems(product);
  return requiredItems.length > 0 && requiredItems.every(item => item.available);
}

function getCompletionRate(product) {
  const requiredItems = getRequiredItems(product);
  if (requiredItems.length === 0) return 0;

  return Math.round((getAvailableModuleCount(product) / requiredItems.length) * 100);
}