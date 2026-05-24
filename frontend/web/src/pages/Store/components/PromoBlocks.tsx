import { Link } from 'react-router-dom';
import type { Product } from '../../../types';
import { resolveImageUrl } from '../../../utils/extractApiError';
import './PromoBlocks.css';

const money = (value?: number) => `${Number(value ?? 0).toFixed(2)} ر.ي`;

export function PromoBlocks({ products }: { products: Product[] }) {
  const suggestedProducts = products.slice(0, 4);

  return (
    <section className="promo-blocks-section">
      <div className="promo-grid">
        
        {/* Left Column: Suggested / Buy Again */}
        <div className="promo-col promo-suggested">
          <div className="promo-col-header">
            <h3>أقترح لك</h3>
            <Link to="#main-store-grid" onClick={(e) => { e.preventDefault(); document.getElementById('main-store-grid')?.scrollIntoView({ behavior: 'smooth' }); }}>المزيد</Link>
          </div>
          <div className="micro-cards-grid">
            {suggestedProducts.map(product => (
              <Link to={`/store/product/${product.id}`} className="micro-card" key={`promo-${product.id}`}>
                <div className="micro-card-image">
                  {product.thumbnailUrl ? <img src={resolveImageUrl(product.thumbnailUrl)} alt={product.name} /> : <div className="no-img">صورة</div>}
                </div>
                <div className="micro-price">{money(product.price)}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Reward Center / Promo */}
        <div className="promo-col promo-reward">
          <div className="reward-content">
            <h3>مركز المكافآت</h3>
            <p>اربح النقاط واستبدلها بخصومات حصرية على مشترياتك القادمة.</p>
            <button className="reward-btn">اكتشف المكافآت</button>
          </div>
        </div>

      </div>
    </section>
  );
}
