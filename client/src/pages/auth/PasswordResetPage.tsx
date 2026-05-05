import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';

const PHONE_REGEX = /^01[016789]-?\d{3,4}-?\d{4}$/;

type Step = 'identify' | 'verify' | 'reset' | 'done';

const PasswordResetPage: React.FC = () => {
  const [step, setStep] = useState<Step>('identify');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [phoneMasked, setPhoneMasked] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (cdRef.current) clearInterval(cdRef.current); }, []);

  const startCooldown = (sec: number) => {
    setCooldown(sec);
    if (cdRef.current) clearInterval(cdRef.current);
    cdRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { if (cdRef.current) clearInterval(cdRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(''); setInfo('');
    if (!email && !phoneNumber) {
      setError('이메일 또는 휴대폰 번호를 입력해주세요.');
      return;
    }
    if (phoneNumber && !PHONE_REGEX.test(phoneNumber.trim())) {
      setError('올바른 휴대폰 번호 형식을 입력해주세요. (예: 010-1234-5678)');
      return;
    }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/password-reset/send-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email || undefined, phoneNumber: phoneNumber || undefined }),
      });
      const data = await r.json();
      if (!r.ok || data?.success === false) {
        const retryAfter = data?.error?.details?.retryAfterSec;
        if (retryAfter) startCooldown(retryAfter);
        setError(data?.error?.message || data?.message || '인증번호 발송에 실패했습니다.');
        return;
      }
      const sent = data?.data?.sent ?? true;
      setPhoneMasked(data?.data?.phoneMasked || '');
      if (sent) {
        setStep('verify');
        startCooldown(60);
        setInfo(data?.message || '등록된 휴대폰으로 인증번호를 발송했습니다.');
      } else {
        setInfo(data?.message || '입력하신 정보로 가입된 계정이 있다면 SMS로 인증번호가 발송됩니다.');
      }
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!smsCode || smsCode.length < 4) { setError('인증번호를 입력해주세요.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/password-reset/verify-code', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), code: smsCode.trim() }),
      });
      const data = await r.json();
      if (!r.ok || data?.success === false) {
        setError(data?.error?.message || data?.message || '인증번호가 올바르지 않습니다.');
        return;
      }
      setResetToken(data?.data?.resetToken || null);
      setStep('reset');
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (newPassword.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (newPassword !== confirmPassword) { setError('비밀번호와 비밀번호 확인이 일치하지 않습니다.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await r.json();
      if (!r.ok || data?.success === false) {
        setError(data?.error?.message || data?.message || '비밀번호 재설정에 실패했습니다.');
        return;
      }
      setStep('done');
    } catch (err) {
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Talez</h1>
          <p className="text-gray-600 dark:text-gray-400">비밀번호 재설정 (SMS 인증)</p>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-md text-sm">{error}</div>
        )}
        {info && !error && (
          <div className="p-3 bg-primary/10 border border-primary/30 text-primary rounded-md text-sm">{info}</div>
        )}

        {step === 'identify' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">이메일 (선택)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="가입 이메일"
                className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:border-gray-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">휴대폰 번호 *</label>
              <input type="tel" inputMode="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="010-1234-5678" required
                className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
                data-testid="input-reset-phone" />
            </div>
            <button type="submit" disabled={loading || cooldown > 0}
              className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-md disabled:opacity-50"
              data-testid="button-reset-send-code">
              {loading ? '처리 중...' : cooldown > 0 ? `${cooldown}초 후 다시 시도` : '인증번호 받기'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {phoneMasked ? `${phoneMasked} 로 ` : ''}전송된 인증번호를 입력해주세요.
            </p>
            <div>
              <label className="block text-sm font-medium mb-1">인증번호</label>
              <input type="text" inputMode="numeric" pattern="\d*" maxLength={8}
                value={smsCode} onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
                data-testid="input-reset-code" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-md disabled:opacity-50"
              data-testid="button-reset-verify-code">
              {loading ? '확인 중...' : '인증 확인'}
            </button>
            <button type="button" onClick={() => handleSendCode()} disabled={loading || cooldown > 0}
              className="w-full py-2 px-4 border rounded-md disabled:opacity-50">
              {cooldown > 0 ? `${cooldown}초 후 재발송` : '인증번호 재발송'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">새 비밀번호 (6자 이상)</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required
                className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
                data-testid="input-new-password" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">새 비밀번호 확인</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                className="w-full rounded-md border px-3 py-2 dark:bg-gray-800 dark:border-gray-700"
                data-testid="input-confirm-new-password" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-md disabled:opacity-50"
              data-testid="button-confirm-reset">
              {loading ? '처리 중...' : '비밀번호 재설정'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <div className="bg-success/10 border border-success/30 text-success p-4 rounded-md">
              비밀번호가 성공적으로 재설정되었습니다. 새 비밀번호로 로그인해주세요.
            </div>
            <Link href="/auth">
              <a className="block w-full py-2 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-md text-center">
                로그인 페이지로 이동
              </a>
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <div className="text-center">
            <Link href="/auth">
              <a className="text-sm text-muted-foreground hover:underline">취소하고 로그인 페이지로 돌아가기</a>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetPage;
