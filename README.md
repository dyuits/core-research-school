# 제주중앙고등학교 CORE 연구학교 프로그램 아카이브

제주중앙고등학교의 AI·디지털 기반 질문수용 「CORE」 연구학교 프로그램을 차시별로 소개하는 정적 웹사이트다. 창체 및 교과 프로그램의 CORE 활동, 관찰·평가 근거, 학년별 생활기록부 기재 예시를 제공한다.

## GitHub Pages 배포

`main` 브랜치에 변경 사항을 반영하면 GitHub Actions가 사이트를 빌드하고 GitHub Pages에 자동 배포한다. 공개 주소는 다음 형식을 사용한다.

```text
https://dyuits.github.io/core-research-school/
```

GitHub 저장소의 **Settings → Pages**에서 배포 원본이 **GitHub Actions**로 설정되어 있는지 확인한다.

## 차시·첨부자료 관리자 기능

기존 정적 아카이브에 프로그램·차시·평가·기재 예시·연구자료실 관리 화면과 Node/SQLite 백엔드를 추가했습니다. 원본 파일은 영구 디스크에 저장합니다. GitHub Pages만으로는 관리자 기능을 운영할 수 없습니다.

Node 24 / pnpm 11.25.0 환경에서 `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build`를 실행하세요. `.env.example`을 바탕으로 관리자 암호 해시와 영구 DATA_DIR을 설정한 뒤 `pnpm start`로 서버를 실행합니다.

설치·배포·관리자 사용법·검증 결과·제약은 [구현 및 운영 안내](docs/IMPLEMENTATION.md)를 참고하세요. 비공개 자료·업로드 파일이 들어 있는 DATA_DIR과 실제 .env를 GitHub에 올리지 마세요.
