# TRAVEL ARCHIVE

SK플래닛 관광 콘텐츠 제작 과정과 결과물을 정리하는 반응형 웹 포트폴리오입니다.

## 페이지

- `index.html`: 소개와 메인 랜딩
- `report.html`: 관광자원 조사 표와 검색·필터
- `contents.html`: 카드뉴스·영상 갤러리
- `sns.html`: SNS 성과 대시보드
- `final.html`: 최종 팀 프로젝트
- `route-recipe.html`: Route Recipe 서비스 소개
- `chatbot/index.html`: 선택형 아카이브 안내 챗봇
- `chatbot/contact.html`: Supabase에 저장되는 제작 문의

## 콘텐츠 교체

이미지는 `assets/images`, 영상은 `assets/videos`, 데이터는 `assets/data` 폴더에서 관리합니다. 공통 디자인은 `css/common.css`, 모바일 대응은 `css/responsive.css`, 공통 메뉴 동작은 `js/common.js`에 있습니다.

## 로컬 실행

의존성 설치 후 `pnpm dev`를 실행하거나, 간단한 정적 서버로 `index.html`을 열어 확인할 수 있습니다.

## 안내 챗봇

주요 페이지 오른쪽 아래의 **아카이브 가이드** 버튼에서 열 수 있습니다. 질문·답변·키워드·버튼·다음 단계는 `chatbot/data/chatbot.json`으로 관리합니다. 생성형 AI API 없이 등록된 답변과 분기로만 작동합니다. 문의는 기존 Supabase `public.consultations` 테이블에 비공개 제작 문의로 저장됩니다. 자세한 파일 구성과 운영 방법은 [chatbot/README.md](chatbot/README.md)를 참고하세요.

`pnpm test`로 대화 분기와 문의 매핑을 검증할 수 있습니다.
