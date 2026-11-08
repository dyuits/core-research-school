# 연구학교 자료 관리 구현·운영 안내

## 기존 프로젝트 분석

- 기준: `main`의 `e18a1060e8966d0b6da04097cf39ae354faa9ef2`, 작업 브랜치 `feat/lesson-resource-management`.
- React 19, TypeScript, Vite 7, Tailwind 4, Radix Dialog. 루트의 Home 단일 화면과 `#top`, `#lessons`, `#record-guide` 앵커, 창체/교과 카드 및 CORE·기록 작성 팝업 구성.
- 콘텐츠: `client/src/data/corePrograms.ts`의 프로그램 10개, lessonGuides, socialEmotional, recordExamples. 별도의 DB, 관리자 계정, 파일 업로드 저장소 없음.
- 기존 `server/index.ts`는 정적 파일 제공 전용. `.github/workflows/deploy-pages.yml`가 main 변경 시 GitHub Pages에 정적 산출물을 배포.
- 저장소에서 연구보고서 PDF/HWP/HWPX를 찾지 못함. 기존 명칭은 CORE이며 B.A.L.A.N.C.E.로 임의 교체하지 않음. 개별 차시 내용·운영 실적을 생성하지 않음.

## 통합 방식과 구현 기능

기존 홈·데이터 파일·팝업을 유지하고 상단 자료 메뉴와 프로그램 팝업의 차시 자료 링크를 추가했다. 새 화면은 GitHub Pages 새로고침에도 경로가 유지되는 `#catalog/{종류}/{ID}` 해시 경로를 사용한다. 기존 앵커는 유지한다. 기존 프로그램 10개는 서버 최초 실행 때만 출처·원래 차시 표기를 포함해 가져온다. 이미 가져온 항목을 재시작 때 덮어쓰거나 삭제한 항목을 다시 생성하지 않는다. 각 차시로 임의 분할하지 않는다. 관리 화면에서 수정한 데이터는 자료 관리 화면에 반영되며, 보존한 기존 정적 홈의 설명문을 자동 수정하지 않는다.

관리 화면은 연구학교 소개, 프로그램, 차시, 평가·성장 자료, 생활기록부 기재 예시, 연구자료실을 제공한다. 공개/비공개/임시저장, 검색, 분류 필터, 목록 50개 단위 더 보기, 차시 순서 숫자 변경, 이전/다음 차시, 프로그램·차시 연결, 복수 첨부파일과 원본 다운로드를 지원한다.

교수·학습 개체는 `shared/catalog.ts`에 정의되며 프로그램→차시, 평가/기재 예시→프로그램·차시, 첨부→자료의 관계를 서버가 검사한다. SQLite의 entries 테이블은 종류별 구조를 가진 JSON과 식별자를 저장하고 attachments 테이블은 자료 FK와 파일 메타데이터를 저장한다. 관계가 남아 있는 프로그램·차시를 삭제하거나 연계 자료가 있는 차시를 다른 프로그램으로 옮기는 요청은 차단한다. 기존 자료를 삭제하는 마이그레이션은 없다.

## 실제 파일과 접근 제어

- Node 24 + Express API, 내장 SQLite, `DATA_DIR/files`의 원본 파일. DB는 `DATA_DIR/catalog.sqlite`.
- 모든 수정·삭제·업로드 API에 서버 관리자 세션 검사와 사용자 지정 요청 헤더 검사 적용. HttpOnly·SameSite=Strict 쿠키, 운영 시 Secure, 8시간 만료. 암호는 scrypt 해시만 서버 환경변수에 저장. 로그인 실패 15분간 8회 제한.
- 일반 방문자는 공개 자료만 조회 가능. 프로그램/차시 등 상위 항목이 비공개이면 하위 자료·파일 다운로드도 차단한다. 파일 디렉터리를 정적 공개하지 않는다.
- 평가/기재 예시 공개 시 비식별화 확인이 필요하며, 이미 공개된 해당 자료에 파일 추가 시에도 서버가 별도 확인을 요구한다. 기재 예시는 실제 학생 기록과 구별하는 안내를 표시한다. 자동 개인정보 검출 기능은 없으므로 파일 안의 이름·사진·학번은 교사가 직접 검토해야 한다.
- 파일당 25MB. 한 번에 여러 파일을 선택하면 각 파일을 순서대로 검증·저장한다. 한 파일 실패 전 성공한 업로드는 유지되므로 오류 후 상세 화면을 다시 열어 중복 업로드를 피한다.
- HWP 5 복합문서의 FileHeader, HWPX ZIP의 mimetype/content.hpf, OOXML 구조, PDF/이미지 매직 바이트를 검사한다. 구형 HWP 3은 지원하지 않는다. ZIP의 개수·내부 크기·경로를 제한하며 웹에서 압축을 풀거나 문서를 실행하지 않는다.
- 실제 저장명은 UUID이며 원본 파일명은 메타데이터와 Content-Disposition에만 사용한다. 이름 충돌·파일명 경로 조작을 방지한다. 저장된 바이트의 SHA-256을 기록하고 다운로드는 변환 없이 스트리밍한다.
- 각 파일 객체는 첨부 하나에만 소유되므로 다른 자료와 물리 파일을 공유하지 않는다. 교체는 새 파일 업로드→다운로드 확인→기존 파일 삭제 순서다. 삭제된 파일의 복구 UI는 없으며 백업에서 복구한다. 파일 삭제 실패 시 접근 불가능한 고아 파일이 남을 수 있으므로 운영자가 확인한다.

## 실행·배포 설정

GitHub Pages에서는 서버 측 인증/업로드가 실행되지 않는다. 원래 Pages 배포는 유지되지만 자료 관리 서버 미연결 안내가 표시된다. API를 가진 동일 출처 Node 서버에 전체 사이트를 배포해야 새 기능을 운영할 수 있다. 현재 버전은 별도 출처 API 연결이나 CORS를 제공하지 않는다.

필수 설정:

| 항목 | 설정 위치 | 값 |
|---|---|---|
| Node | 호스팅 런타임 | 24 이상 (검증 버전 24.15.0) |
| DATA_DIR | 호스팅 환경변수 / 로컬 .env | 영구 디스크의 절대 경로, 예: /data |
| ADMIN_PASSWORD_HASH | 호스팅 Secret / 로컬 .env | 아래 스크립트로 생성한 salt:hash |
| PORT | 호스팅 환경변수 | 기본 3001 |
| NODE_ENV | 호스팅 환경변수 | production |
| VITE_DEPLOY_BASE | 빌드 환경 | Node 서버 배포에서는 /; 기존 Pages에서는 /core-research-school/ |

1. `pnpm install --frozen-lockfile` (pnpm 11.25.0; 빌드 허용 목록은 pnpm-workspace.yaml).
2. `.env.example`을 `.env`로 복사하고 실제 값을 설정한다. `.env`는 Git에서 제외된다. 이 파일은 관리자 외 읽을 수 없도록 운영체제 권한을 제한한다.
3. zsh에서 `read -rs 'school_password?관리자 암호: '; printf '%s' "$school_password" | node scripts/hash-password.mjs; unset school_password`로 해시를 만든다. 화면에 나온 해시를 ADMIN_PASSWORD_HASH에 넣는다. 실제 암호는 소스/명령줄 인수/GitHub에 저장하지 않는다.
4. `pnpm check && pnpm test && pnpm build`, `pnpm start`.
5. 운영 호스트에 HTTPS 도메인과 영구 디스크를 연결한다. 운영 쿠키가 Secure이므로 HTTP 공개 운영은 지원하지 않는다. 프록시는 API/파일 응답 캐시를 끄고 업로드 요청 제한을 26MB 이상, 적절한 제한 시간으로 설정한다.
6. 개발 시 터미널 두 개에서 `pnpm dev:server`, `pnpm dev`. Vite의 /api 프록시는 localhost:3001을 사용한다. 다른 PORT를 쓰면 vite.config.ts의 프록시도 맞춘다.

Dockerfile 제공: `docker build -t core-school .`, `docker run --env-file .env -e DATA_DIR=/data -v school-data:/data -p 3001:3001 core-school`. HTTPS는 앞단 프록시에서 제공한다. 컨테이너 삭제·재배포에도 named volume을 보존한다. 다중 인스턴스나 영구 디스크 없는 서버리스에 이 SQLite 버전을 배포하지 않는다. 서버를 중지한 상태에서 DATA_DIR 전체(DB·WAL·파일)를 같은 시점에 백업하고 복구를 연습한다. 세션은 메모리에 있으므로 서버 재시작 때 다시 로그인해야 하지만 자료는 유지된다.

현재 외부 호스팅 계정·도메인·영구 디스크가 제공되지 않아 운영 배포와 실제 운영 주소에서의 재배포 유지 검증은 수행하지 않았다. Docker 빌드는 이 환경에서 별도 검증하지 않았다. 기존 Pages 서버는 변경하지 않았다.

## 교사의 사용 순서

1. 자료 메뉴의 관리자 로그인을 열어 운영자가 설정한 암호로 로그인한다.
2. 프로그램 선택→내용 수정 또는 새 프로그램 등록. 출처·연구 과제·보고서 쪽수·목표·교과·도구 등을 입력한다.
3. 프로그램 상세에서 ‘이 프로그램에 차시 추가’. 차시명·순서·성취기준·도입/전개/정리·평가/피드백을 입력해 임시저장한다.
4. 저장된 차시 상세의 첨부자료에서 파일을 복수 선택하고 자료 유형 및 연결 위치(프로그램/차시)를 지정해 업로드한다. 선택한 연결 위치의 상세 화면에서 원본 다운로드를 확인한다.
5. 평가 및 학생 성장 또는 기재 예시를 등록할 때 프로그램·차시를 연결하고 활동 근거를 작성한다. 기재 예시는 세 가지 기록 영역 중 선택한다. 식별 정보를 제거하고 확인한 뒤 공개한다.
6. 연구자료실에서 분류·설명을 저장한 뒤 파일을 추가한다. 연구보고서의 쪽수와 프로그램 출처를 서로 연결해 안내한다.
7. 공개 전에 로그아웃 상태에서 프로그램→차시→파일과 평가·기재 예시 연결을 확인한다. 차시 순서는 수정 화면의 숫자로 조정한다. 파일 교체는 새 파일 확인 후 이전 파일을 삭제한다.

## 검증 결과와 한계

- `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build` 성공. Git diff 공백 검사 수행. 원격 Actions는 설정안 적용 전이므로 실행되지 않았다.
- 서버 통합 테스트 2개 묶음: 익명 수정·삭제 차단, 잘못된 로그인/요청 헤더 차단, 프로그램·차시 저장, 관계 유효성, 순서 변경, 공개 전 비식별화 검증, 평가/기재 예시/자료실 저장, HWP/HWPX 복수 첨부, 원본 SHA-256 일치, 잘못된 형식/용량/경로 거부, 참조 중인 자료 삭제 차단, 상위 비공개 시 하위 파일 차단, DB 재개방 후 파일·메타데이터 유지.
- 실제 브라우저: 기존 홈과 10개 프로그램 목록, 기존 프로그램 상세 연계, 관리자 로그인, 임시 차시 입력·저장, HWP/HWPX 2개 복수 업로드, 첨부 다운로드 링크 및 빈 자료 안내 확인. 390px 모바일에서 상세 화면 가로 넘침 없음. PC 1280px도 확인.
- 테스트 한글 문서는 형식 검증용 합성 fixture다. 실제 학교 HWP/HWPX를 한글 앱에서 열어 보는 호환성과 원본 해시는 운영 전 추가 확인해야 한다. HWP 웹 미리보기는 구현 대상에서 제외했다.
- 연구보고서 원본 미제공으로 보고서 대조, 실제 차시 입력, B.A.L.A.N.C.E. 구성 확인은 남아 있다. 학생 개인정보 자동 탐지/바이러스 검사, 여러 관리자별 계정·감사 이력, 동시 편집 충돌 방지, 휴지통·자동 백업은 미구현이다.
- DB 목록 검색은 저장된 JSON을 서버에서 읽어 필터링하므로 대규모 운영 시 SQL 인덱스/전문 검색 및 별도 DB·객체 스토리지로 확장하는 작업이 필요하다. 목록 응답은 50개 단위이고 파일 본문은 다운로드할 때만 읽는다.

## 변경 파일

- `shared/catalog.ts`: 개체·입력 필드·분류·타입.
- `server/catalog.ts`, `server/files.ts`, `server/index.ts`: DB·인증·권한·API·원본 파일 저장/전송.
- `client/src/pages/Catalog.tsx`, `catalog.css`: 자료·관리자 화면, 검색, 등록·수정·삭제·첨부 및 차시 이동.
- `client/src/App.tsx`, `Home.tsx`, `index.css`: 기존 화면 연결, 해시 경로, 모바일 메뉴 접근.
- `client/src/pages/NotFound.tsx`: 원래 존재하지 않는 button/card import를 기본 HTML로 교체하여 기존 타입 오류 해결.
- `client/index.html`: 미설정 분석 스크립트 제거, 화면 확대 제한 해제.
- `server/catalog.test.ts`: 서버 통합·파일 검증 테스트.
- `scripts/build-server.mjs`, `scripts/hash-password.mjs`: 서버 빌드 및 암호 해시 생성.
- `Dockerfile`, `.dockerignore`, `.env.example`, `.gitignore`, `docs/IMPLEMENTATION.md`, `README.md`: 배포·영구 저장·운영 안내.
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, `vite.config.ts`: 의존성·런타임·검사·개발 프록시. 설치 환경 pnpm 11.25.0에 맞춰 패치/override와 빌드 허용 설정을 workspace 파일로 이동.
- `docs/ci/verify.yml`, `docs/ci/deploy-pages.yml`: 검사 CI와 Node 24 배포 설정안. 현재 GitHub 자격 증명에 workflow 범위가 없어 실제 .github/workflows 변경 푸시가 거부되었다. 기존 워크플로는 그대로 보존하고 설정안을 docs/ci에 제공했다. 저장소 관리자가 두 파일을 .github/workflows에 복사하면 적용된다. 원격 CI 실행은 검증하지 않았다.

기술 근거: Node 내장 SQLite https://nodejs.org/download/release/v24.16.0/docs/api/sqlite.html , Multer 제한·오류 처리 https://expressjs.com/en/resources/middleware/multer/ .
