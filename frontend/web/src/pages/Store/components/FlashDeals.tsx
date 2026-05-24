import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Product } from '../../../types';
import { resolveImageUrl } from '../../../utils/extractApiError';
import { trackingApi } from '../../../api/tracking.api';
import './FlashDeals.css';

const money = (value?: number) => `${Number(value ?? 0).toFixed(2)} ر.ي`;

function FlashDealItem({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  useEffect(() => {
    trackingApi.track('recommendation_impression', {
      productId: product.id,
      metadata: {
        source: 'flash_deals',
        position: index,
        page: 'store',
        railTitle: 'منتجات مختارة',
      },
    });
  }, [product.id, index]);

  const handleCardClick = () => {
    trackingApi.track('recommendation_click', {
      productId: product.id,
      metadata: {
        source: 'flash_deals',
        position: index,
        page: 'store',
        destination: `/store/product/${product.id}`,
      },
    });
  };

  const price = Number(product.price);
  const comparePrice = Number(product.comparePrice ?? 0);
  const hasDiscount = comparePrice > price;
  const discount = hasDiscount
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0;

  return (
    <Link
      to={`/store/product/${product.id}`}
      className="flash-deal-card"
      onClick={handleCardClick}
    >
      <motion.div whileHover={{ y: -5 }} className="flash-card-inner">
        <div className="flash-card-image">
          {product.thumbnailUrl ? (
            <img src={resolveImageUrl(product.thumbnailUrl)} alt={product.name} />
          ) : (
            <div className="no-img">بدون صورة</div>
          )}
          {hasDiscount && <div className="discount-badge">-{discount}%</div>}
        </div>
        <div className="flash-card-info">
          <div className="flash-price">{money(product.price)}</div>
          {hasDiscount && <div className="flash-original-price">{money(comparePrice)}</div>}
        </div>
      </motion.div>
    </Link>
  );
}

export function FlashDeals({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section className="flash-deals-section">
      <div className="flash-deals-header">
        <div className="flash-deals-title-group">
          <h2>منتجات مختارة</h2>
        </div>
        <Link
          to="#main-store-grid"
          className="view-more-link"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById('main-store-grid')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          عرض المزيد
        </Link>
      </div>

      <div className="flash-deals-scroll">
        {products.map((product, index) => (
          <FlashDealItem
            key={`flash-${product.id}`}
            product={product}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
