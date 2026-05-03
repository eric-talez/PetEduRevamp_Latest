# 운영 OAuth 콜백 도메인 체크리스트

운영 배포 시 카카오/네이버/구글 소셜 로그인을 한 번에 정상 동작시키기 위한 점검 항목입니다.

## 1. Replit Secrets (production scope)

| 키 | 값 | 비고 |
| --- | --- | --- |
| `OAUTH_CALLBACK_BASE_URL` | `https://hitalez.com` | 끝의 `/` 없이 입력. 미설정 시 서버가 기본값으로 동작하지만 시작 로그에 경고가 출력됨 |
| `KAKAO_CLIENT_ID` | 카카오 REST API 키 | |
| `NAVER_CLIENT_ID_V2`, `NAVER_CLIENT_SECRET_V2` | 네이버 V2 시크릿 | |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | 구글 OAuth 클라이언트 | |

> 서버는 `server/auth/social-auth.ts`의 `assertProductionCallbackBaseUrl()`에서 위 값을 검사해 시작 로그에 결과를 출력합니다.

## 2. 각 OAuth 콘솔 redirect URI 등록 여부

운영 도메인 `https://hitalez.com` 기준으로 아래 redirect URI가 모두 등록되어 있어야 합니다.

- 카카오 디벨로퍼스 → 내 애플리케이션 → 카카오 로그인 → Redirect URI
  - `https://hitalez.com/api/auth/kakao/callback`
- 네이버 개발자센터 → 내 애플리케이션 → API 설정 → 서비스 URL / Callback URL
  - 서비스 URL: `https://hitalez.com`
  - Callback URL: `https://hitalez.com/api/auth/naver/callback`
- Google Cloud Console → 사용자 인증 정보 → OAuth 2.0 클라이언트 ID
  - 승인된 JavaScript 출처: `https://hitalez.com`
  - 승인된 리디렉션 URI: `https://hitalez.com/api/auth/google/callback`

## 3. 배포 후 점검

1. 배포 직후 서버 로그에서 다음 라인이 보이는지 확인
   - `[SocialAuth] 운영 콜백 도메인 확인: https://hitalez.com`
   - 경고(`⚠ ... OAUTH_CALLBACK_BASE_URL ...`)가 출력되면 Secret을 다시 설정
2. 카카오/네이버/구글 각각으로 실제 로그인 시도하여 콜백이 `hitalez.com`으로 정상 복귀하는지 확인
3. 신규 가입 → 회원가입 페이지 리다이렉트, 기존 사용자 → 대시보드 리다이렉트 동작 확인
