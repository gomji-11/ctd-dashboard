CTD Dashboard v1.1

적용 기능
- 관리자/조회 전용 비밀번호 로그인
- 관리자: 품목 추가, 수정, 삭제, 상세 체크 및 입력 가능
- 조회자: 조회만 가능, 상세 체크박스/입력칸 비활성화
- 관리자 전용 비밀번호 변경 기능
- 비밀번호는 Firebase Firestore settings/auth 문서에 저장
- 30분 미사용 시 자동 로그아웃
- 로그아웃 버튼 표시

초기 비밀번호
- 관리자: admin1234
- 조회자: view1234

적용 방법
1. 이 ZIP의 파일을 기존 프로젝트 폴더에 덮어쓰기
2. GitHub Desktop에서 변경사항 확인
3. Summary: CTD Dashboard v1.1
4. Commit to main
5. Push origin
6. GitHub Pages에서 Ctrl + Shift + R

비밀번호 변경 방법
- 관리자 비밀번호로 로그인
- 우측 상단 '비밀번호 변경' 클릭
- 현재 관리자 비밀번호 입력
- 새 관리자/조회자 비밀번호 입력 후 저장

주의
- settings/auth 문서가 없으면 첫 접속 시 기본 비밀번호가 자동 생성됩니다.
- GitHub Pages의 프론트엔드 방식이므로 완전한 보안이 필요한 경우 Firebase Authentication을 추가하는 것이 좋습니다.
