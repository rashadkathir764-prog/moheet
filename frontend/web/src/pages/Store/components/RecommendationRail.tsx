import type { Product } from '../../../types';
import { ProductCard } from './ProductCard';
import './RecommendationRail.css';

interface RecommendationRailProps {
  title: string;
  products: Product[];
  onAddToCart: (productId: string) => void;
  onAddFavorite: (productId: string) => void;
  trackingSource?: string;
  trackingPage?: 'store' | 'product_details';
}

export function RecommendationRail({
  title,
  products,
  onAddToCart,
  onAddFavorite,
  trackingSource,
  trackingPage,
}: RecommendationRailProps) {
  if (products.length === 0) return null;

  return (
    <section className="recommendation-rail">
      <div className="recommendation-rail-header">
        <h2>{title}</h2>
      </div>
      <div className="recommendation-rail-scroll">
        {products.map((product, index) => (
          <div className="recommendation-rail-item" key={product.id}>
            <ProductCard
              product={product}
              index={index}
              onAddToCart={onAddToCart}
              onAddFavorite={onAddFavorite}
              trackingSource={trackingSource}
              trackingPage={trackingPage}
              railTitle={title}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
