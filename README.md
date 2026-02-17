# 스팀 게임 사양 검색기

게임 이름으로 스팀 게임을 검색하고, 선택한 게임의 **최소/권장 PC 사양**을 확인하는 웹사이트입니다.

## 기능

- 게임 이름 검색 (`/api/search`)
- 게임 상세 사양 조회 (`/api/specs/:appid`)
- 스팀 상점 링크 이동
- 스팀 앱 목록 6시간 캐시

## 1) 실행 방법

### 요구사항
- Node.js 18+

### 실행
```bash
node server.js
```

브라우저에서 `http://localhost:3000` 접속.

## 2) 실제 Steam 데이터 조회가 되게 하려면

이 프로젝트는 서버에서 Steam API로 직접 요청합니다.
따라서 **서버가 아래 주소로 HTTPS(443) 아웃바운드 연결 가능**해야 합니다.

- `api.steampowered.com`
- `store.steampowered.com`

### 서버에서 연결 테스트
```bash
curl -I https://api.steampowered.com/ISteamApps/GetAppList/v2/
curl -I "https://store.steampowered.com/api/appdetails?appids=730"
```

위 두 명령이 200 계열 응답이면, 앱에서도 실제 데이터 조회가 됩니다.

## 3) 조회가 안될 때 체크리스트

- 방화벽/보안그룹에서 443 아웃바운드가 막혀 있지 않은지 확인
- 사내망이라면 `*.steampowered.com` 도메인 허용 정책 추가
- 컨테이너/서버 DNS 설정 문제 여부 확인

앱에서 Steam API 연결 실패 시, API 응답 메시지에 네트워크 허용이 필요하다는 안내가 표시됩니다.
