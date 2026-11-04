import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Menu, ShoppingBag, UserRound } from 'lucide-react';
import { useAuth } from './auth';
import Home from './pages/Home';
import ProductPage from './pages/Product';
import Login from './pages/Login';
import Register from './pages/Register';
import Cart from './pages/Cart';
import Orders from './pages/Orders';

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeCategory = new URLSearchParams(location.search).get('category') || '';
  return <div className="site-shell">
    <div className="announcement">认真挑选的日常好物 · 满 ¥299 享包邮 <ArrowUpRight size={13}/></div>
    <header className="site-header">
      <Link to="/" className="brand" aria-label="拾间首页"><span className="brand-mark">拾</span><span>拾间<small>THE SLOW STORE</small></span></Link>
      <nav className="desktop-nav" aria-label="主导航"><Link className={location.pathname === '/' && !activeCategory ? 'active' : ''} to="/">全部商品</Link><Link className={activeCategory === '居家' ? 'active' : ''} to="/?category=居家">居家生活</Link><Link className={activeCategory === '配饰' ? 'active' : ''} to="/?category=配饰">随行配饰</Link><Link className={activeCategory === '文具' ? 'active' : ''} to="/?category=文具">文具纸品</Link></nav>
      <div className="header-actions">
        <Link to={user ? '/orders' : '/login'} className="icon-link" aria-label={user ? '我的订单' : '登录'}><UserRound size={21}/><span>{user ? user.name : '登录'}</span></Link>
        <Link to="/cart" className="icon-link" aria-label="购物车"><ShoppingBag size={21}/><span>购物车</span></Link>
        {user && <button className="quiet-logout" onClick={() => { logout(); navigate('/'); }}>退出</button>}
      </div>
    </header>
    <main><Routes>
      <Route path="/" element={<Home/>}/>
      <Route path="/products/:id" element={<ProductPage/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/cart" element={<Cart/>}/>
      <Route path="/orders" element={<Orders/>}/>
      <Route path="*" element={<section className="container empty-page"><h1>页面走丢了</h1><Link className="button primary" to="/">返回首页</Link></section>}/>
    </Routes></main>
    <footer className="site-footer"><div className="container footer-grid"><div><strong>拾间</strong><p>把日子过慢一点，把喜欢的留在身边。</p></div><div><span>探索</span><Link to="/">全部商品</Link><Link to="/orders">我的订单</Link></div><div><span>关于</span><p>一个用于接口和 UI 自动化练习的小店。</p><p>所有商品与支付均为演示数据。</p></div></div><div className="container copyright">© 2026 拾间 · THE SLOW STORE <Menu size={14}/></div></footer>
  </div>;
}
