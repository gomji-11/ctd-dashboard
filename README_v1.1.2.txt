CTD Dashboard v1.1.2

변경사항
- 3단계 비밀번호 권한 적용
  1) 관리자: 비밀번호 관리 + 데이터 수정 가능
  2) 데이터 수정: 품목 추가/수정/삭제 및 상세 체크 가능
  3) 읽기 전용: 조회만 가능
- 관리자만 비밀번호 변경 버튼 표시
- 관리자 비밀번호로 관리자/데이터 수정/읽기 전용 비밀번호 변경 가능
- 비밀번호 길이 제한 없음
- Firestore settings/auth 문서에 비밀번호 저장

초기 비밀번호
- 관리자: admin1234
- 데이터 수정: edit1234
- 읽기 전용: view1234

적용 방법
1. 압축 해제
2. 기존 프로젝트에 덮어쓰기
3. GitHub Desktop에서 Commit: CTD Dashboard v1.1.2
4. Push origin
5. GitHub Pages에서 Ctrl + Shift + R
