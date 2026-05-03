import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logServerError } from './middleware/audit-logger';

export class JavaBridge {
  private javaProcess: ChildProcess | null = null;
  private isJavaRunning = false;
  private javaPort = 8081;

  constructor() {
    this.startJavaService();
  }

  private async startJavaService(): Promise<void> {
    try {
      console.log('[JavaBridge] Java 서비스 시작 시도...');
      
      // Java 환경 설정
      const javaHome = '/nix/store/zmj3m7wrgqf340vqd4v90w8dw371vhjg-openjdk-17.0.7+7';
      const javaPath = path.join(javaHome, 'bin', 'java');
      
      // 컴파일된 Java 클래스 실행 - Maven 타겟 디렉토리 사용
      const classPath = path.join(process.cwd(), 'target/classes');
      
      // 클래스 파일이 존재하는지 확인
      if (!fs.existsSync(classPath)) {
        console.log('[JavaBridge] Java 클래스 파일이 없습니다. Maven 빌드가 필요합니다.');
        return;
      }
      
      this.javaProcess = spawn(javaPath, [
        '-cp', classPath,
        'com.petedu.PetEduApplication',
        `--server.port=${this.javaPort}`
      ], {
        env: { ...process.env, JAVA_HOME: javaHome },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.javaProcess.stdout?.on('data', (data) => {
        console.log('[Java Output]', data.toString());
        if (data.toString().includes('Started PetEduApplication')) {
          this.isJavaRunning = true;
          console.log('[JavaBridge] Java 서비스가 성공적으로 시작되었습니다.');
        }
      });

      this.javaProcess.stderr?.on('data', (data) => {
        console.log('[Java Error]', data.toString());
      });

      this.javaProcess.on('close', (code) => {
        console.log(`[JavaBridge] Java 프로세스가 종료되었습니다. 코드: ${code}`);
        this.isJavaRunning = false;
      });

    } catch (error) {
      logServerError('[JavaBridge] Java 서비스 시작 실패:', error);
    }
  }

  public isRunning(): boolean {
    return this.isJavaRunning;
  }

  public getPort(): number {
    return this.javaPort;
  }

  public async callJavaService(endpoint: string, data?: any): Promise<any> {
    if (!this.isJavaRunning) {
      throw new Error('Java 서비스가 실행되지 않았습니다.');
    }

    try {
      const response = await fetch(`http://localhost:${this.javaPort}${endpoint}`, {
        method: data ? 'POST' : 'GET',
        headers: data ? { 'Content-Type': 'application/json' } : {},
        body: data ? JSON.stringify(data) : undefined
      });

      return await response.text();
    } catch (error) {
      logServerError('[JavaBridge] Java 서비스 호출 실패:', error);
      throw error;
    }
  }

  public stop(): void {
    if (this.javaProcess) {
      this.javaProcess.kill();
      this.isJavaRunning = false;
    }
  }
}

export const javaBridge = new JavaBridge();