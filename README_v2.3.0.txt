CTD Dashboard v2.3.0 적용 안내

1. 압축을 풉니다.
2. detail.html, js/detail.js, js/auth.js 파일을 기존 프로젝트의 같은 위치에 덮어씁니다.
3. GitHub Desktop에서 "CTD 개정이력 v2.3.0"으로 Commit 후 Push합니다.
4. 배포 완료 후 브라우저에서 Ctrl + Shift + R로 새로고침합니다.

주요 변경사항
- 품목 상세 화면에 CTD 개정이력 관리 추가
- 개정번호, 상태, 예정일, 완료일, 개정사유, 작성자 기록
- admin/editor 등록·수정·삭제, viewer 조회 전용
- 개정이력을 PDF 보고서에 포함
- 기존 Firebase 품목 및 CTD 데이터 구조 유지
