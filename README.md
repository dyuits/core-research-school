# 제주중앙고등학교 CORE 연구학교 프로그램 아카이브

제주중앙고등학교의 AI·디지털 기반 질문수용 「CORE」 연구학교 프로그램을 차시별로 소개하는 정적 웹사이트다. 창체 및 교과 프로그램의 CORE 활동, 관찰·평가 근거, 학년별 생활기록부 기재 예시를 제공한다.

## GitHub Pages 배포

`main` 브랜치에 변경 사항을 반영하면 GitHub Actions가 사이트를 빌드하고 GitHub Pages에 자동 배포한다. 공개 주소는 다음 형식을 사용한다.

```text
https://dyuits.github.io/core-research-school/
```

GitHub 저장소의 **Settings → Pages**에서 배포 원본이 **GitHub Actions**로 설정되어 있는지 확인한다.

## PDF 수업자료

ver25 연구보고서 기준 제목과 22차시 편성을 반영했습니다. 프로그램 카드를 선택하면 ‘PDF 수업자료’에서 지도안과 학생 활동지 17개를 다운로드할 수 있습니다. 실제 PDF 파일은 `client/public/materials/`에 보관합니다.

자료 구성과 원본 대조·변환·검증 방법은 [PDF 자료 공개 안내](docs/PDF_MATERIALS.md)를 참고하세요. 검사는 `pnpm test:materials`로 실행합니다.
