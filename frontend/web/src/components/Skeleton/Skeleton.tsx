import './Skeleton.css';

// ─── ProductCard Skeleton (matches ProductCard layout) ───────
export function ProductCardSkeleton() {
  return (
    <div className="skeleton-product-card" aria-hidden="true">
      <span className="skeleton sk-image" />
      <div className="sk-body">
        <span className="skeleton sk-title-long" />
        <span className="skeleton sk-title-short" />
        <span className="skeleton sk-price" />
        <span className="skeleton sk-btn" />
      </div>
    </div>
  );
}

// ─── Grid of ProductCard Skeletons ───────────────────────────
interface ProductGridSkeletonProps {
  count?: number;
}
export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </>
  );
}

// ─── ProductDetails Skeleton ─────────────────────────────────
export function ProductDetailsSkeleton() {
  return (
    <div className="commerce-shell" style={{ backgroundColor: '#fff' }}>
      {/* Breadcrumb */}
      <div className="moheet-breadcrumb">
        <span className="skeleton sk-breadcrumb" />
      </div>

      <div className="moheet-page-container">
        <div className="skeleton-details-layout" aria-hidden="true">
          {/* Images column */}
          <div className="sk-details-images">
            <div className="sk-thumbs-col">
              <span className="skeleton sk-thumb" />
              <span className="skeleton sk-thumb" />
              <span className="skeleton sk-thumb" />
            </div>
            <span className="skeleton sk-main-image" style={{ flex: 1 }} />
          </div>

          {/* Info column */}
          <div className="sk-details-info">
            <span className="skeleton sk-details-title-l" />
            <span className="skeleton sk-details-title-s" />
            <span className="skeleton sk-details-stars" />
            <span className="skeleton sk-details-price" style={{ marginTop: 8 }} />
            <span className="skeleton sk-details-desc-1" style={{ marginTop: 16 }} />
            <span className="skeleton sk-details-desc-2" />
            <span className="skeleton sk-details-desc-3" />
          </div>

          {/* Action box column */}
          <div className="sk-action-box">
            <span className="skeleton sk-action-price" />
            <span className="skeleton sk-action-stock" />
            <span className="skeleton sk-action-btn-1" />
            <span className="skeleton sk-action-btn-2" />
            <span className="skeleton sk-action-btn-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CartItem Skeleton ────────────────────────────────────────
export function CartItemSkeleton() {
  return (
    <div className="skeleton-cart-item" aria-hidden="true">
      <span className="skeleton sk-cart-image" />
      <div className="sk-cart-info">
        <span className="skeleton sk-cart-title" />
        <span className="skeleton sk-cart-price" />
        <span className="skeleton sk-cart-ship" />
        <span className="skeleton sk-cart-actions" />
      </div>
    </div>
  );
}

// ─── Cart list skeleton (3 items) ────────────────────────────
interface CartSkeletonProps {
  count?: number;
}
export function CartSkeleton({ count = 3 }: CartSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <CartItemSkeleton key={i} />
      ))}
    </>
  );
}
