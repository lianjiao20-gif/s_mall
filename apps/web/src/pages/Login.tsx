import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from '../auth';

export default function Login() {
  const { login, user } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [email, setEmail] = useState('demo@example.com'); const [password, setPassword] = useState('Demo123456!'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const destination = params.get('next')?.startsWith('/') && !params.get('next')?.startsWith('//') ? params.get('next')! : '/';
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setBusy(true); try { await login(email, password); navigate(destination); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }
  if (user) return <div className="container state-panel page-state">你已经登录。<Link to="/">继续逛逛</Link></div>;
  return <div className="login-page"><div className="login-art"><div className="login-art-text">A little joy<br/>in everyday life.</div><span>THE SLOW STORE / MEMBERSHIP</span></div><div className="login-form-wrap"><div className="login-panel"><div className="eyebrow">WELCOME BACK <span className="eyebrow-line"/></div><h1>欢迎回来</h1><p>登录之后，把喜欢的好物带回家。</p><form onSubmit={submit}><label htmlFor="email">邮箱地址</label><input id="email" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)}/><label htmlFor="password">密码</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)}/>{error && <div className="form-error" role="alert">{error}</div>}<button className="button primary login-submit" disabled={busy}>{busy ? '正在登录…' : '登录'} <ArrowRight size={18}/></button></form><p className="auth-switch">还没有账号？<Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(destination)}` : ''}`}>立即注册</Link></p><div className="demo-hint"><LockKeyhole size={16}/><span>演示账号已预填，可直接点击登录。此站点不处理真实交易。</span></div><Link className="back-link" to="/">返回首页</Link></div></div></div>;
}
