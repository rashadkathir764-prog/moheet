import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { commerceApi } from '../../api/commerce.api';
import { trackingApi } from '../../api/tracking.api';
import { PageTransition } from '../../components/Layout/PageTransition';
import type { Product } from '../../types';
import './StorePages.css';

const money = (value?: number) => `${Number(value ?? 0).toFixed(2)} ر.ي`;

interface FavoriteItem {
  id: string;
  product: Pick<Product, 'id' | 'name' | 'price'>;
}

export function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const load = () => commerceApi.favorites.all().then(setFavorites);

  useEffect(() => {
    void load();
  }, []);

  return (
    <PageTransition>
      <div className="commerce-shell">
        <div className="moheet-page-container" style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>
          <h1 style={{ color: 'var(--color-text-primary)' }}>القوائم والمفضلة</h1>
          <hr style={{ margin: '20px 0', border: '1px solid var(--color-border)' }} />
          <div className="commerce-grid">
            {favorites.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)' }}>لا توجد منتجات في المفضلة</p>
            ) : favorites.map((favorite, index) => (
              <motion.article
                className="product-card-modern"
                key={favorite.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.3 }}
                whileHover={{ y: -8 }}
              >
                <div className="pc-image-wrapper">
                  <Link to={`/store/product/${favorite.product.id}`} className="pc-image-link">
                    <div className="pc-no-image">لا توجد صورة</div>
                  </Link>
                </div>
                <div className="pc-info-wrapper">
                  <Link to={`/store/product/${favorite.product.id}`} className="pc-title-link">
                    <h3 className="pc-title" title={favorite.product.name}>{favorite.product.name}</h3>
                  </Link>
                  <div className="pc-price-row">
                    <span className="pc-current-price">{money(Number(favorite.product.price))}</span>
                  </div>
                  <div className="pc-actions">
                    <button
                      className="pc-add-cart-btn"
                      style={{ background: '#ef4444' }}
                      onClick={(event) => {
                        event.preventDefault();
                        commerceApi.favorites.remove(favorite.product.id).then(() => {
                          trackingApi.track('remove_from_favorites', {
                            productId: favorite.product.id,
                          });
                          return load();
                        });
                      }}
                    >
                      إزالة من المفضلة
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
