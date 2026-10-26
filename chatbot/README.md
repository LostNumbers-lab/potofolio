# 선택형 아카이브 가이드

포트폴리오의 `js/common.js`가 `chatbot/widget.js`를 로드해 모든 주요 페이지 오른쪽 아래에 챗봇을 표시합니다. 독립 페이지는 `chatbot/index.html`, 문의 페이지는 `chatbot/contact.html`입니다. 외부 챗봇 사이트나 생성형 AI API를 호출하지 않습니다.

## 관리자 페이지

`chatbot/admin/`에서 로그인한 관리자가 질문·답변·키워드·버튼을 편집하고 초안 저장 → 미리보기 → 최종 게시 순서로 공개할 수 있습니다. 게시 이력·이전 버전 복원·제작 문의함·비밀번호 변경을 제공합니다. 서버 인증 및 운영 방법은 [관리자 안내](admin/README.md)를 참고하세요.

## 데이터 관리

- 운영본: Supabase에 저장된 초안·게시 JSON. 관리자 최종 게시 후 실제 웹에 반영됩니다.
- `data/chatbot.json`: 초기 기본본/서버 연결 장애 시 백업 데이터. 예상 질문(question), 고정 답변(answer), 키워드(keywords), 버튼(buttons), 다음 단계(next)를 관리합니다.
- 버튼은 next, url, action 중 하나만 사용합니다. action은 home/back/inquiry입니다.
- `data/inquiry-config.json`: Supabase 프로젝트의 공개 publishable 키, 기존 테이블·필드 매핑, 문의 안내.
- 관리자에서 게시 후 챗봇을 새로고침하거나 홈페이지 위젯을 다시 열면 적용됩니다. `node --test tests/*.test.mjs`로 분기와 설정을 검증합니다(저장소 루트에서 실행).

## 문의 저장

챗봇 팝업과 독립 문의 페이지가 모두 기존 `public.consultations` 테이블에 저장합니다. 이름→author_name, 이메일→contact, 제목→title, 내용→content로 매핑하며 category=`제작 문의`, status=`pending`, is_private=true로 저장합니다.

프로젝트 `mdcouftltagqmqhvckiv`에는 `제작 문의` 항목의 일반 방문자 조회·수정·삭제를 막는 restrictive RLS 정책을 적용했습니다. `docs/chatbot-inquiry-access.sql`은 이미 적용한 정책 기록이며 다시 실행할 설치 스크립트가 아닙니다. 기존 공개 게시판의 다른 category는 기존 동작을 유지합니다. 관리자는 Supabase 대시보드에서 문의를 처리합니다. 기존 공개 게시판 정책 등 프로젝트 전체의 보안 정비를 포함하지 않습니다.

공개 publishable 키는 브라우저용이며, secret/service_role 키는 저장소에 넣지 않습니다. 이메일 자동 발송이나 자동 삭제는 없습니다. 안내 문구는 실제 운영자의 보관·삭제 방침에 맞춰 관리하세요.

## 실행 및 배포

GitHub Pages의 기존 저장소 루트 배포에서는 빌드 없이 동작합니다. 로컬에서는 저장소 루트에서 `pnpm dev`를 실행하거나 정적 HTTP 서버를 사용합니다. `file://` 더블클릭 실행은 JSON/모듈 로딩 제한이 있어 지원하지 않습니다. 기존 Vite 빌드에도 챗봇 폴더를 포함합니다.

원본 별도 문의 HTML은 제공되지 않아 수정하지 않았습니다. 이번 `contact.html`과 챗봇만 동일 모듈을 사용합니다. 로컬 검증 화면 캡처와 운영 테스트 데이터는 이 저장소에 포함하지 않았습니다.
