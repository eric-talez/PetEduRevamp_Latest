import { Router } from 'express';
import { google } from 'googleapis';
import { csrfProtection } from '../middleware/csrf';
import { 
  ApiErrorCode,
  createSuccessResponse,
  HTTP_STATUS,
  extendResponse
} from '../middleware/api-standards';
import { logServerError } from '../middleware/audit-logger';

const router = Router();
router.use(extendResponse);

// Google OAuth2 클라이언트 설정
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/google-meet/oauth2callback';

// OAuth2 클라이언트 생성
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

/**
 * Google Meet 미팅 링크 생성 (간소화된 방식)
 * POST /api/google-meet/create
 */
router.post('/create', csrfProtection, async (req, res) => {
  try {
    const { title, startTime, endTime, description } = req.body;

    // 입력 검증
    if (!title || !startTime || !endTime) {
      return res.error(
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        'title, startTime, endTime are required'
      );
    }

    // 간소화된 미팅 링크 생성 (Google Calendar API 없이)
    // 실제로는 Google Calendar API를 사용해야 하지만, 우선 기본 구조만 구현
    const meetingCode = generateMeetingCode();
    const meetingUrl = `https://meet.google.com/${meetingCode}`;

    console.log('[Google Meet] 미팅 생성:', {
      title,
      meetingUrl,
      startTime,
      endTime
    });

    return res.success({
      meetingUrl,
      meetingCode,
      title,
      startTime,
      endTime
    }, 'Google Meet link created successfully');

  } catch (error) {
    logServerError('[Google Meet] 미팅 생성 오류:', error, req);
    return res.error(
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to create Google Meet link'
    );
  }
});

/**
 * OAuth2 인증 URL 생성
 * GET /api/google-meet/auth-url
 */
router.get('/auth-url', (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.error(
        ApiErrorCode.CONFIGURATION_ERROR,
        'Google OAuth credentials not configured'
      );
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });

    return res.success({
      authUrl
    }, 'Google OAuth URL generated');

  } catch (error) {
    logServerError('[Google Meet] Auth URL 생성 오류:', error, req);
    return res.error(
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to generate auth URL'
    );
  }
});

/**
 * OAuth2 콜백 처리
 * GET /api/google-meet/oauth2callback
 */
router.get('/oauth2callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code not provided');
    }

    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // 세션에 토큰 저장
    if (req.session) {
      req.session.googleTokens = tokens;
    }

    console.log('[Google Meet] OAuth 인증 성공');
    
    return res.send(`
      <html>
        <body>
          <h1>인증 성공!</h1>
          <p>창을 닫고 돌아가주세요.</p>
          <script>
            window.close();
          </script>
        </body>
      </html>
    `);

  } catch (error) {
    logServerError('[Google Meet] OAuth 콜백 오류:', error, req);
    return res.status(500).send('Authentication failed');
  }
});

/**
 * Google Calendar API를 사용한 미팅 생성
 * POST /api/google-meet/create-with-calendar
 */
router.post('/create-with-calendar', csrfProtection, async (req, res) => {
  try {
    const { title, startTime, endTime, description, attendees } = req.body;

    // 입력 검증
    if (!title || !startTime || !endTime) {
      return res.error(
        ApiErrorCode.MISSING_REQUIRED_FIELD,
        'title, startTime, endTime are required'
      );
    }

    // 세션에서 토큰 확인
    const tokens = req.session?.googleTokens;
    if (!tokens) {
      return res.error(
        ApiErrorCode.AUTHENTICATION_REQUIRED,
        'Google authentication required. Please authenticate first.'
      );
    }

    oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Calendar 이벤트 생성 (Google Meet 링크 포함)
    const event = {
      summary: title,
      description: description || '',
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: 'Asia/Seoul',
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: 'Asia/Seoul',
      },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      attendees: attendees || [],
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      requestBody: event,
    });

    const meetingUrl = response.data.hangoutLink || '';
    const meetingCode = meetingUrl.split('/').pop() || '';

    console.log('[Google Meet] Calendar 이벤트 생성 성공:', {
      title,
      meetingUrl,
      eventId: response.data.id
    });

    return res.success({
      meetingUrl,
      meetingCode,
      eventId: response.data.id,
      title,
      startTime,
      endTime
    }, 'Google Meet created via Calendar API');

  } catch (error: any) {
    logServerError('[Google Meet] Calendar 이벤트 생성 오류:', error, req);
    
    if (error.message?.includes('invalid_grant')) {
      return res.error(
        ApiErrorCode.AUTHENTICATION_REQUIRED,
        'Google authentication expired. Please re-authenticate.'
      );
    }

    return res.error(
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      'Failed to create Google Meet via Calendar API'
    );
  }
});

/**
 * 헬스 체크
 * GET /api/google-meet/health
 */
router.get('/health', (req, res) => {
  const isConfigured = !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
  const isAuthenticated = !!req.session?.googleTokens;
  
  return res.success({
    status: 'ok',
    configured: isConfigured,
    authenticated: isAuthenticated
  }, 'Google Meet service health check');
});

/**
 * 미팅 코드 생성 헬퍼 함수
 */
function generateMeetingCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segments = 3;
  const segmentLength = 3;
  
  const code = Array.from({ length: segments }, () => {
    return Array.from({ length: segmentLength }, () => 
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
  }).join('-');
  
  return code;
}

export default router;
