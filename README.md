# TRAVEL ARCHIVE

SK플래닛 관광 콘텐츠 제작 과정과 결과물을 정리하는 반응형 웹 포트폴리오입니다.

## 페이지

- `index.html`: 소개와 메인 랜딩
- `report.html`: 관광자원 조사 표와 검색·필터
- `contents.html`: 카드뉴스·영상 갤러리
- `sns.html`: SNS 성과 대시보드
- `final.html`: 최종 팀 프로젝트

## 콘텐츠 교체

이미지는 `assets/images`, 영상은 `assets/videos`, 데이터는 `assets/data` 폴더에서 관리합니다. 공통 디자인은 `css/common.css`, 모바일 대응은 `css/responsive.css`, 공통 메뉴 동작은 `js/common.js`에 있습니다.

## 로컬 실행

의존성 설치 후 `pnpm dev`를 실행하거나, 간단한 정적 서버로 `index.html`을 열어 확인할 수 있습니다.

## REPORT 부산 관광안내소 API

공식 명세: https://www.data.go.kr/data/15063445/openapi.do

1. 공공데이터포털에서 **부산광역시_부산관광안내소정보 서비스** 활용신청을 완료하고 인증키를 발급받습니다.
2. 프로젝트 폴더의 대화형 터미널에서 `npm run setup:busan-key`를 실행하고 키를 붙여넣은 다음 Enter를 누릅니다. 입력은 화면에 표시되지 않으며 기존 `.env`의 다른 값은 유지됩니다. Encoding / Decoding 키 모두 지원합니다.
3. `npm run dev`를 실행하고 터미널에 표시되는 로컬 주소 뒤에 `/report.html`을 붙여 엽니다.
4. **부산 관광안내소 정보 → 정보 조회하기**를 누릅니다. 안내소명·주소의 현재 페이지 검색과 이전·다음 페이지 이동을 지원합니다.

키는 루트 `.env`의 `BUSAN_TOURISM_SERVICE_KEY`에 저장합니다. `.env*`는 Git에서 제외되며, 키에 `VITE_` 접두사를 붙이지 않습니다. API 키를 채팅이나 HTML에 넣지 마세요. 서버가 고정된 공식 API로만 요청하고 브라우저에는 정리된 안내소 데이터만 반환합니다. 키 변경 시 개발 서버를 재시작하세요.

`file://` 또는 단순 정적 파일 호스팅으로는 실시간 API를 사용할 수 없습니다. 로컬 개발/미리보기 서버에 API가 연결되어 있습니다. Vercel용 `api/busan-offices.js`도 포함되어 있으며, 향후 배포 시 해당 프로젝트 서버 환경변수에 같은 이름의 키를 등록해야 합니다. 로컬 `.env`는 업로드하지 않습니다.
