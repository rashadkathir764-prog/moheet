import { useSearchParams } from 'react-router-dom';
import type { Category } from '../../../types';
import './BentoCategories.css';

export function BentoCategories({ categories }: { categories: Category[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  if (!categories || categories.length === 0) return null;

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('categoryId', categoryId);
    setSearchParams(params);
    document.getElementById('main-store-grid')?.scrollIntoView({ behavior: 'smooth' });
  };

  // We will feature the first category as the large one
  const featuredCategory = categories[0];
  const gridCategories = categories.slice(1, 7); // Show 6 categories in the grid

  // Colors for placeholder icons
  const gradients = [
    'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    'linear-gradient(135deg, #f6d365 0%, #fda085 100%)'
  ];

  return (
    <section className="bento-categories-section">
      <div className="bento-header">
        <h2>تسوق حسب الفئة</h2>
      </div>
      
      <div className="bento-container">
        
        {/* Large Featured Category */}
        <div 
          className="bento-large-card" 
          onClick={() => handleCategoryClick(featuredCategory.id)}
        >
          <div className="bento-large-bg" style={{ background: gradients[0] }}></div>
          <div className="bento-large-content">
            <h3>{featuredCategory.name}</h3>
            <p>تشكيلة مميزة بانتظارك</p>
            <button className="bento-shop-btn">تسوق الآن</button>
          </div>
        </div>

        {/* Small Categories Grid */}
        <div className="bento-small-grid">
          {gridCategories.map((cat, idx) => (
            <div 
              className="bento-small-card" 
              key={`bento-${cat.id}`}
              onClick={() => handleCategoryClick(cat.id)}
            >
              <div className="bento-icon" style={{ background: gradients[(idx + 1) % gradients.length] }}>
                <span className="bento-icon-text">{cat.name.substring(0, 2)}</span>
              </div>
              <span className="bento-cat-name">{cat.name}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
