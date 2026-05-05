import { useState } from 'react';
import { useStore } from '../../lib/store';
import type { User } from '../../lib/types';

const AVATARS = [
  '🐿️','🐶','🐱','🐰','🐻','🐼','🦊','🐯','🐨','🐸','🐹','🦄',
  '🌸','🌷','🌹','🌺','🍓','🍒','🍑','🍰','🧁','🍦','🌈','🔮',
  '🌟','✨','💖','💜','💎','🎀','🦋','🪄','💫','⭐','🌙','☀️',
  '😊','🥰','😎','🤩','😇','🥳','🤗','🥺','🌼','💕','💗','💝',
];

type Step = 1 | 2;
interface Pending {
  provider: User['provider'];
  email: string;
  defaultName: string;
  avatar: string;
}

export default function LoginScreen() {
  const login = useStore(s => s.login);
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('🐿️');

  const goStep2 = (p: Pending) => {
    setPending(p);
    setNickname(p.defaultName);
    setAvatar(p.avatar);
    setStep(2);
  };

  const handleEmail = () => {
    if (!/^.+@.+\..+$/.test(email)) return alert('이메일을 확인해주세요');
    if (!pw) return alert('비밀번호를 입력해주세요');
    goStep2({ provider: 'email', email, defaultName: email.split('@')[0], avatar: '🌸' });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) return alert('1.5MB 이하 이미지만 가능해요');
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(String(ev.target?.result));
    reader.readAsDataURL(file);
  };

  const finish = () => {
    if (!nickname.trim() || !pending) return alert('닉네임을 입력해주세요');
    login({
      name: nickname.trim(),
      email: pending.email,
      avatar,
      provider: pending.provider,
      joinedAt: Date.now(),
    });
  };

  if (step === 1) {
    return (
      <main className="screen screen-login active">
        <div className="login-content">
          <div className="login-logo">QLINK</div>
          <p className="login-tagline">링크와 QR을 AI가 정리해주는<br />핑크빛 북마크 ✨</p>
          <div className="login-stack">
            <input className="input" type="email" placeholder="이메일" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="input" type="password" placeholder="비밀번호" value={pw} onChange={e => setPw(e.target.value)} />
            <button className="btn btn-primary" onClick={handleEmail}>다음</button>
          </div>
          <div className="login-divider"><span>또는</span></div>
          <div className="login-stack">
            <button className="btn btn-social btn-google" onClick={() => goStep2({ provider: 'google', email: 'daram@gmail.com', defaultName: '다람이', avatar: '🐿️' })}>
              <span className="social-badge g">G</span> Google로 시작
            </button>
            <button className="btn btn-social btn-kakao" onClick={() => goStep2({ provider: 'kakao', email: 'inwoo@kakao.com', defaultName: '인우', avatar: '🐿️' })}>
              <span className="social-badge k">💬</span> 카카오로 시작
            </button>
          </div>
          <p className="login-foot">계정 정보는 이 기기에만 저장됩니다 (mock)</p>
        </div>
      </main>
    );
  }

  return (
    <main className="screen screen-login active">
      <div className="login-content">
        <div className="login-logo" style={{ fontSize: 36 }}>QLINK</div>
        <p className="login-tagline">프로필을 설정해주세요 ✨</p>
        <div className="avatar-preview-wrap">
          <div className="avatar-preview-circle">
            {avatar.startsWith('data:') ? <img src={avatar} alt="" /> : avatar}
          </div>
          <label className="upload-avatar-btn">
            📷
            <input type="file" accept="image/*" hidden onChange={handleUpload} />
          </label>
        </div>
        <div className="picker-label">프로필 사진</div>
        <div className="emoji-grid avatar-grid">
          {AVATARS.map(a => (
            <button key={a} className={`emoji-cell${a === avatar ? ' selected' : ''}`} onClick={() => setAvatar(a)}>{a}</button>
          ))}
        </div>
        <div className="picker-label">닉네임</div>
        <input className="input" placeholder="닉네임" maxLength={12} value={nickname} onChange={e => setNickname(e.target.value)} onKeyDown={e => e.key === 'Enter' && finish()} />
        <div className="login-stack" style={{ marginTop: 8 }}>
          <button className="btn btn-primary" onClick={finish}>시작하기</button>
          <button className="btn btn-ghost" onClick={() => setStep(1)}>← 다른 방법으로</button>
        </div>
      </div>
    </main>
  );
}
