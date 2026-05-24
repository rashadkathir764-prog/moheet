import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Product } from '../../../types';
import { resolveImageUrl } from '../../../utils/extractApiError';
import { trackingApi } from '../../../api/tracking.api';
import './ProductCard.css';

const money = (value?: number) => `${Number(value ?? 0).toFixed(2)} ر.ي`;

interface ProductCardProps {
  product: Product;
  index: number;
  onAddToCart: (productId: string) => void;
  onAddFavorite: (productId: string) => void;
  trackingSource?: string;
  trackingPage?: 'store' | 'product_details';
  railTitle?: string;
}

export function ProductCard({
  product,
  index,
  onAddToCart,
  onAddFavorite,
  trackingSource,
  trackingPage,
  railTitle,
}: ProductCardProps) {
  useEffect(() => {
    if (trackingSource) {
      trackingApi.track('recommendation_impression', {
        productId: product.id,
        metadata: {
          source: trackingSource,
          position: index,
          page: trackingPage || 'store',
          railTitle,
        },
      });
    }
  }, [product.id, trackingSource, index, trackingPage, railTitle]);

  const handleCardClick = () => {
    if (trackingSource) {
      trackingApi.track('recommendation_click', {
        productId: product.id,
        metadata: {
          source: trackingSource,
          position: index,
          page: trackingPage || 'store',
          destination: `/store/product/${product.id}`,
        },
      });
    }
  };

  const price = Number(product.price);
  const comparePrice = Number(product.comparePrice ?? 0);
  const hasDiscount = comparePrice > price;
  const discount = hasDiscount
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0;

  return (
    <motion.article
      className="product-card-modern"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.3 }}
      whileHover={{ y: -8 }}
    >
      <div className="pc-image-wrapper">
        {hasDiscount && (
          <div className="pc-badges">
            <span className="pc-badge-discount">-{discount}%</span>
          </div>
        )}
        <button
          aria-label={`حفظ ${product.name} في المفضلة`}
          className="pc-favorite-btn"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onAddFavorite(product.id);
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <Link to={`/store/product/${product.id}`} className="pc-image-link" onClick={handleCardClick}>
          {product.thumbnailUrl ? (
            <img src={resolveImageUrl(product.thumbnailUrl)} alt={product.name} />
          ) : (
            <div className="pc-no-image">لا توجد صورة</div>
          )}
        </Link>
      </div>

      <div className="pc-info-wrapper">
        <Link to={`/store/product/${product.id}`} className="pc-title-link" onClick={handleCardClick}>
          <h3 className="pc-title" title={product.name}>{product.name}</h3>
        </Link>

        <div className="pc-price-row">
          <span className="pc-current-price">{money(product.price)}</span>
          {hasDiscount && <span className="pc-original-price">{money(comparePrice)}</span>}
        </div>

        {product.stockQuantity > 0 && product.stockQuantity < 5 && (
          <div className="pc-fomo-text">
            تبقى {product.stockQuantity} فقط
          </div>
        )}

        <div className="pc-actions">
          <button
            className="pc-add-cart-btn"
            disabled={!product.isActive || product.stockQuantity === 0}
            onClick={(event) => {
              event.preventDefault();
              onAddToCart(product.id);
            }}
          >
            {!product.isActive ? 'غير متاح' : product.stockQuantity === 0 ? 'غير متوفر' : 'أضف إلى السلة'}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
