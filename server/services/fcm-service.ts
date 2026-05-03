import * as admin from 'firebase-admin';
import { logServerError } from '../middleware/audit-logger';

/**
 * Firebase Cloud Messaging 서비스
 * 백그라운드에서도 동작하는 푸시 알림 전송
 */
class FCMService {
  private static instance: FCMService;
  private isInitialized: boolean = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  /**
   * Firebase Admin SDK 초기화
   */
  private initialize() {
    try {
      // 환경 변수에서 Firebase 설정 로드
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const projectId = process.env.FIREBASE_PROJECT_ID;

      if (!privateKey || !clientEmail || !projectId) {
        console.warn('[FCM] Firebase 인증 정보가 설정되지 않았습니다. FCM 기능이 비활성화됩니다.');
        console.warn('[FCM] 필요한 환경 변수: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
        return;
      }

      // Firebase Admin 초기화 (중복 초기화 방지)
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            privateKey,
            clientEmail,
            projectId,
          }),
        });
        this.isInitialized = true;
        console.log('[FCM] Firebase Admin SDK가 초기화되었습니다.');
      } else {
        this.isInitialized = true;
        console.log('[FCM] Firebase Admin SDK가 이미 초기화되어 있습니다.');
      }
    } catch (error) {
      logServerError('[FCM] Firebase Admin SDK 초기화 실패:', error);
      this.isInitialized = false;
    }
  }

  /**
   * 단일 기기에 푸시 알림 전송
   */
  async sendToDevice(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isInitialized) {
      return { 
        success: false, 
        error: 'FCM이 초기화되지 않았습니다' 
      };
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: deviceToken,
        // 웹푸시 설정
        webpush: {
          notification: {
            icon: '/logo.svg',
            badge: '/logo.svg',
            requireInteraction: false,
          },
          fcmOptions: {
            link: '/', // 알림 클릭 시 이동할 URL
          },
        },
        // Android 설정
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            color: '#2BAA61', // TALEZ Green
          },
        },
        // iOS 설정
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log('[FCM] 푸시 알림 전송 성공:', response);
      
      return { 
        success: true, 
        messageId: response 
      };
    } catch (error: any) {
      logServerError('[FCM] 푸시 알림 전송 실패:', error);
      
      // 토큰 무효화 에러 처리
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        return { 
          success: false, 
          error: 'INVALID_TOKEN' 
        };
      }
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * 여러 기기에 푸시 알림 전송 (배치)
   */
  async sendToMultipleDevices(
    deviceTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
    if (!this.isInitialized) {
      return { 
        successCount: 0, 
        failureCount: deviceTokens.length,
        invalidTokens: []
      };
    }

    try {
      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body,
        },
        data: data || {},
        tokens: deviceTokens,
        webpush: {
          notification: {
            icon: '/logo.svg',
            badge: '/logo.svg',
          },
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            color: '#2BAA61',
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      // 무효한 토큰 수집
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          if (error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(deviceTokens[idx]);
          }
        }
      });

      console.log(`[FCM] 배치 전송 완료 - 성공: ${response.successCount}, 실패: ${response.failureCount}`);
      
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error) {
      logServerError('[FCM] 배치 푸시 알림 전송 실패:', error);
      return {
        successCount: 0,
        failureCount: deviceTokens.length,
        invalidTokens: [],
      };
    }
  }

  /**
   * 토픽으로 푸시 알림 전송
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isInitialized) {
      return { 
        success: false, 
        error: 'FCM이 초기화되지 않았습니다' 
      };
    }

    try {
      const message: admin.messaging.Message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        topic,
        webpush: {
          notification: {
            icon: '/logo.svg',
          },
        },
      };

      const response = await admin.messaging().send(message);
      console.log(`[FCM] 토픽 '${topic}' 푸시 알림 전송 성공:`, response);
      
      return { 
        success: true, 
        messageId: response 
      };
    } catch (error: any) {
      logServerError(`[FCM] 토픽 '${topic}' 푸시 알림 전송 실패:`, error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * 기기를 토픽에 구독
   */
  async subscribeToTopic(
    deviceTokens: string[],
    topic: string
  ): Promise<{ successCount: number; failureCount: number }> {
    if (!this.isInitialized) {
      return { successCount: 0, failureCount: deviceTokens.length };
    }

    try {
      const response = await admin.messaging().subscribeToTopic(deviceTokens, topic);
      console.log(`[FCM] 토픽 '${topic}' 구독 완료 - 성공: ${response.successCount}, 실패: ${response.failureCount}`);
      
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      logServerError(`[FCM] 토픽 '${topic}' 구독 실패:`, error);
      return {
        successCount: 0,
        failureCount: deviceTokens.length,
      };
    }
  }

  /**
   * FCM 초기화 상태 확인
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

export const fcmService = FCMService.getInstance();
