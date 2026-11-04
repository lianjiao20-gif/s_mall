import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../auth';

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = params.get('next');
  const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) { setError('两次输入的密码不一致'); return; }
    setBusy(true);
    try { await register(name, email, password); navigate(destination); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }

  if (user) return <div className="container state-panel page-state">你已经登录。<Link to="/">继续逛逛</Link></div>;
  return <div className="login-page"><div className="login-art"><div className="login-art-text">A little joy<br/>in everyday life.</div><span>THE SLOW STORE / MEMBERSHIP</span></div><div className="login-form-wrap"><div className="login-panel"><div className="eyebrow">JOIN US <span className="eyebrow-line"/></div><h1>创建账号</h1><p>注册后即可挑选日常好物，开始购物。</p><form onSubmit={submit}>
    <label htmlFor="register-name">昵称</label><input id="register-name" type="text" autoComplete="name" required maxLength={100} value={name} onChange={event => setName(event.target.value)}/>
    <label htmlFor="register-email">邮箱地址</label><input id="register-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)}/>
    <label htmlFor="register-password">密码</label><input id="register-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)}/>
    <label htmlFor="register-confirmation">确认密码</label><input id="register-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={event => setConfirmation(event.target.value)}/>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="button primary login-submit" disabled={busy}>{busy ? '正在注册…' : '注册并登录'} <ArrowRight size={18}/></button>
  </form><p className="auth-switch">已有账号？<Link to={`/login${next ? `?next=${encodeURIComponent(destination)}` : ''}`}>返回登录</Link></p><Link className="back-link" to="/">返回首页</Link></div></div></div>;
}
