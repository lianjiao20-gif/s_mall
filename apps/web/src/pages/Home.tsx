import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { api, money, type Product } from '../api';

const categories = ['全部', '居家', '配饰', '文具'];

export default function Home() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(params.get('q') || '');
  const category = params.get('category') || '';
  const query = params.get('q') || '';
  useEffect(() => {
    setLoading(true); setError('');
    api<{ products: Product[] }>(`/products?${new URLSearchParams({ q: query, category })}`)
      .then(data => setProducts(data.products)).catch(err => setError(err.message)).finally(() => setLoading(false));
  }, [query, category]);
  return <>
    <section className="hero"><div className="container hero-inner"><div className="hero-copy"><div className="eyebrow light">SLOW DAYS · GOOD THINGS <span className="eyebrow-line"/></div><h1>把日常，<br/>过成喜欢的样子。</h1><p>为每一个平凡的日子，挑选一点让人心动的小事物。</p><a href="#collection" className="hero-button">探索好物 <ArrowRight size={17}/></a></div><div className="hero-art" aria-hidden="true"><div className="art-circle"/><div className="art-vase"><div className="art-stem one"/><div className="art-stem two"/><div className="art-leaf a"/><div className="art-leaf b"/><div className="art-leaf c"/></div><div className="art-caption">Objects for<br/>a gentler life.</div></div></div><div className="hero-side-label">EST. 2026 &nbsp; / &nbsp; THOUGHTFULLY CURATED</div></section>
    <section className="promise-bar"><div className="container promise-inner"><span>01 &nbsp; 精心挑选</span><span>02 &nbsp; 简单生活</span><span>03 &nbsp; 温柔日常</span></div></section>
    <section className="container collection" id="collection"><div className="section-heading"><div><div className="eyebrow">THE COLLECTION <span className="eyebrow-line"/></div><h2>值得收藏的日常</h2><p>不急着拥有更多，只挑真正喜欢的。</p></div><span className="section-count">精选好物 / {products.length.toString().padStart(2, '0')}</span></div>
      <div className="catalog-tools"><div className="category-tabs" role="group" aria-label="商品分类">{categories.map(item => <button key={item} className={category === (item === '全部' ? '' : item) ? 'active' : ''} onClick={() => setParams(prev => { const next = new URLSearchParams(prev); item === '全部' ? next.delete('category') : next.set('category', item); return next; })}>{item}</button>)}</div><form className="search-box" onSubmit={event => { event.preventDefault(); setParams(prev => { const next = new URLSearchParams(prev); search.trim() ? next.set('q', search.trim()) : next.delete('q'); return next; }); }}><Search size={17}/><input aria-label="搜索商品" placeholder="搜索心仪好物" value={search} onChange={e => setSearch(e.target.value)}/><button type="submit" aria-label="提交搜索"><ArrowRight size={17}/></button></form></div>
      {loading ? <div className="state-panel">正在寻找好物…</div> : error ? <div className="state-panel error">{error}<button onClick={() => window.location.reload()}>重试</button></div> : products.length === 0 ? <div className="state-panel"><SlidersHorizontal size={26}/><h3>还没有找到合适的商品</h3><p>换个关键词或分类试试。</p><button onClick={() => { setSearch(''); setParams({}); }}>查看全部商品</button></div> : <div className="product-grid">{products.map((product, index) => <Link to={`/products/${product.id}`} className="product-card" key={product.id}><div className="product-image"><img src={product.imagePath} alt={product.name}/><span className="product-index">0{index + 1} / 0{products.length}</span><span className="product-view">查看详情 <ArrowRight size={14}/></span></div><div className="product-meta"><span>{product.category}</span><span>{product.stock > 0 ? '现货' : '暂时售罄'}</span></div><div className="product-title-row"><h3>{product.name}</h3><strong>{money(product.priceCents)}</strong></div><p>{product.description}</p></Link>)}</div>}
    </section>
    <section className="story-strip"><div className="container story-inner"><span>THE ART OF LIVING SLOWLY</span><h2>喜欢的东西，<em>值得慢慢遇见。</em></h2><Link to="/" className="text-link">继续逛逛 <ArrowRight size={18}/></Link></div></section>
  </>;
}
