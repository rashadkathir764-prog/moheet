import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Role } from '../src/common/enums/role.enum';
import { User } from '../src/users/entities/user.entity';
import { Category } from '../src/categories/entities/category.entity';
import { Product } from '../src/products/entities/product.entity';
import { ProductImage } from '../src/products/entities/product-image.entity';
import { Cart } from '../src/carts/entities/cart.entity';
import { CartItem } from '../src/carts/entities/cart-item.entity';
import { Order } from '../src/orders/entities/order.entity';
import { OrderItem } from '../src/orders/entities/order-item.entity';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '../.env' });

type CategorySeed = {
  name: string;
  slug: string;
  children: Array<{ name: string; slug: string }>;
};

const demoPassword = process.env.DEMO_SEED_PASSWORD ?? 'DemoPassword123!';
const uploadDest = process.env.UPLOAD_DEST ?? './uploads';
const uploadPublicBaseUrl =
  process.env.UPLOAD_PUBLIC_BASE_URL ?? 'http://localhost:3000/uploads';
const toNumber = (value: string | undefined, fallback: number): number =>
  value ? Number(value) : fallback;

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: toNumber(process.env.DB_PORT, 5432),
  database: process.env.DB_NAME ?? 'moheet_db',
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [
    User,
    Category,
    Product,
    ProductImage,
    Cart,
    CartItem,
    Order,
    OrderItem,
  ],
  synchronize: false,
  logging: false,
});

const categorySeeds: CategorySeed[] = [
  {
    name: 'الإلكترونيات',
    slug: 'electronics',
    children: [
      { name: 'الجوالات', slug: 'mobiles' },
      { name: 'اللابتوبات', slug: 'laptops' },
      { name: 'الصوتيات', slug: 'audio' },
    ],
  },
  {
    name: 'الأزياء',
    slug: 'fashion',
    children: [
      { name: 'ملابس رجالية', slug: 'mens-fashion' },
      { name: 'ملابس نسائية', slug: 'womens-fashion' },
      { name: 'الأحذية', slug: 'shoes' },
    ],
  },
  {
    name: 'المنزل والمطبخ',
    slug: 'home-kitchen',
    children: [
      { name: 'أجهزة المطبخ', slug: 'kitchen-appliances' },
      { name: 'الأثاث', slug: 'furniture' },
      { name: 'الديكور', slug: 'decor' },
    ],
  },
  {
    name: 'الجمال والعناية',
    slug: 'beauty-care',
    children: [
      { name: 'العطور', slug: 'perfumes' },
      { name: 'العناية بالبشرة', slug: 'skin-care' },
      { name: 'العناية بالشعر', slug: 'hair-care' },
    ],
  },
  {
    name: 'السوبرماركت',
    slug: 'supermarket',
    children: [
      { name: 'القهوة والشاي', slug: 'coffee-tea' },
      { name: 'الأغذية الجافة', slug: 'dry-food' },
      { name: 'المستلزمات المنزلية', slug: 'household-essentials' },
    ],
  },
  {
    name: 'الرياضة واللياقة',
    slug: 'sports-fitness',
    children: [
      { name: 'معدات التمرين', slug: 'fitness-equipment' },
      { name: 'ملابس رياضية', slug: 'sportswear' },
      { name: 'أنشطة خارجية', slug: 'outdoors' },
    ],
  },
  {
    name: 'السيارات',
    slug: 'automotive',
    children: [
      { name: 'إكسسوارات السيارات', slug: 'car-accessories' },
      { name: 'العناية بالسيارة', slug: 'car-care' },
      { name: 'قطع الغيار', slug: 'spare-parts' },
    ],
  },
  {
    name: 'الأطفال والألعاب',
    slug: 'kids-toys',
    children: [
      { name: 'ألعاب تعليمية', slug: 'educational-toys' },
      { name: 'مستلزمات الأطفال', slug: 'baby-essentials' },
      { name: 'ألعاب خارجية', slug: 'outdoor-toys' },
    ],
  },
  {
    name: 'الكتب والقرطاسية',
    slug: 'books-stationery',
    children: [
      { name: 'كتب عربية', slug: 'arabic-books' },
      { name: 'أدوات مكتبية', slug: 'office-supplies' },
      { name: 'دفاتر ومذكرات', slug: 'notebooks' },
    ],
  },
  {
    name: 'الأجهزة الذكية',
    slug: 'smart-devices',
    children: [
      { name: 'الساعات الذكية', slug: 'smart-watches' },
      { name: 'المنزل الذكي', slug: 'smart-home' },
      { name: 'كاميرات المراقبة', slug: 'security-cameras' },
    ],
  },
  {
    name: 'الصحة والعافية',
    slug: 'health-wellness',
    children: [
      { name: 'أجهزة قياس', slug: 'health-monitors' },
      { name: 'فيتامينات', slug: 'vitamins' },
      { name: 'مستلزمات طبية', slug: 'medical-supplies' },
    ],
  },
  {
    name: 'العروض المختارة',
    slug: 'featured-deals',
    children: [
      { name: 'الأكثر مبيعاً', slug: 'best-sellers' },
      { name: 'وصل حديثاً', slug: 'new-arrivals' },
      { name: 'خصومات قوية', slug: 'hot-deals' },
    ],
  },
];

const realProducts = [
  { name: 'آبل آيفون 15 برو ماكس 256 جيجابايت', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80' },
  { name: 'سامسونج جالكسي S24 ألترا تيتانيوم', image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80' },
  { name: 'سماعات سوني WH-1000XM5 لاسلكية', image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80' },
  { name: 'آبل ماك بوك برو 16 إنش شريحة M3', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80' },
  { name: 'جهاز سوني بلايستيشن 5', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80' },
  { name: 'نينتندو سويتش شاشة OLED', image: 'https://images.unsplash.com/photo-1612282130134-4b5a26a41f8c?auto=format&fit=crop&w=800&q=80' },
  { name: 'ساعة آبل الذكية الإصدار 9', image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=80' },
  { name: 'كاميرا كانون EOS R5 الاحترافية', image: 'https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&w=800&q=80' },
  { name: 'لابتوب ديل XPS 15', image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80' },
  { name: 'عطر شانيل بلو دي شانيل رجالي', image: 'https://images.unsplash.com/photo-1523293115678-d2900f52f461?auto=format&fit=crop&w=800&q=80' },
  { name: 'حذاء نايك إير جوردن 1', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80' },
  { name: 'ماكينة قهوة ديلونجي ديديكا', image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80' }
];

const productsByCategory: Record<string, Array<{ name: string; image: string }>> = {
  mobiles: [
    { name: 'آبل آيفون 15 برو ماكس 256 جيجابايت تيتانيوم طبيعي', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80' },
    { name: 'سامسونج جالكسي S24 ألترا تيتانيوم رمادي ذكاء اصطناعي', image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80' },
    { name: 'جوجل بكسل 8 برو 128 جيجابايت أسود بركان', image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80' },
    { name: 'شاومي 14 ألترا 5G كاميرا لايكا الاحترافية', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80' },
    { name: 'آيفون 13 عادي 128 جيجابايت سماء زرقاء', image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=800&q=80' }
  ],
  laptops: [
    { name: 'آبل ماك بوك برو 16 إنش شريحة M3 Pro الفائقة', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80' },
    { name: 'لابتوب ديل XPS 15 شاشة OLED لمسية فاخرة', image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80' },
    { name: 'لابتوب أسوس روج ستريكس للألعاب والرسومات الثقيلة', image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80' },
    { name: 'لينوفو ثينك باد X1 كاربون خفيف الوزن وقوي جداً', image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80' },
    { name: 'اتش بي سبيكتر x360 لابتوب متحول 2 في 1', image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80' }
  ],
  audio: [
    { name: 'سماعات سوني WH-1000XM5 لاسلكية مانعة للضجيج', image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80' },
    { name: 'سماعات آبل إيربودز برو الجيل الثاني علبة تايب سي', image: 'https://images.unsplash.com/photo-1588449668365-d15e397f6787?auto=format&fit=crop&w=800&q=80' },
    { name: 'سماعات رأس بوز QuietComfort Ultra فائقة الراحة', image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80' },
    { name: 'مكبر صوت بلوتوث جي بي إل فليب 6 مقاوم للمياه', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80' },
    { name: 'ميكروفون شور SM7B للبث الصوتي وتسجيل الأغاني', image: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80' }
  ],
  'mens-fashion': [
    { name: 'قميص رجالي كلاسيكي قطن 100% رمادي مريح', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80' },
    { name: 'جاكيت شتوي وندبريكر رجالي أسود دافئ وعصري', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80' },
    { name: 'بنطال جينز أزرق داكن سليم فت متين', image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80' },
    { name: 'تيشيرت رياضي بولو أبيض ناصع بتصميم عصري', image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80' },
    { name: 'هودي شتوي مريح رمادي سادة مع قبعة', image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80' }
  ],
  'womens-fashion': [
    { name: 'فستان نسائي أنيق طويل للمناسبات والحفلات', image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80' },
    { name: 'معطف شتوي طويل بيج كلاسيكي دافئ للغاية', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80' },
    { name: 'عباية سوداء كلاسيكية بتطريز ناعم وتصميم شرقي', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم كاجوال نسائي قطعتين مريح لليوميات والمنزل', image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80' },
    { name: 'حقيبة يد جلدية نسائية فاخرة كلاسيكية سوداء', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80' }
  ],
  shoes: [
    { name: 'حذاء نايك إير جوردن 1 الأصلي أبيض وأسود', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80' },
    { name: 'حذاء جري أديداس ألترا بوست مريح ومرن للغاية', image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80' },
    { name: 'حذاء كلاسيكي جلدي رسمي بني فاخر للمناسبات', image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80' },
    { name: 'حذاء رياضي مريح جداً للمشي اليومي من سكتشرز', image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80' },
    { name: 'حذاء نسائي أنيق كعب عالي أحمر جذاب للغاية', image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80' }
  ],
  'kitchen-appliances': [
    { name: 'ماكينة قهوة ديلونجي ديديكا إي سي 685 ستيل', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=800&q=80' },
    { name: 'قلاية هوائية فيليبس إكس إل الرقمية بدون زيت', image: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=800&q=80' },
    { name: 'خلاط نينجا الاحترافي 1000 واط قوي للغاية للمطبخ', image: 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?auto=format&fit=crop&w=800&q=80' },
    { name: 'عجانة كينوود شيف إكس إل ستيل كامل لجميع أنواع العجين', image: 'https://images.unsplash.com/photo-1578643463396-0997cb5328c1?auto=format&fit=crop&w=800&q=80' },
    { name: 'غلاية ماء كهربائية سميج بتصميم كلاسيكي ريتر', image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80' }
  ],
  furniture: [
    { name: 'كرسي مكتب مريح داعم للظهر بالكامل للعمل الطويل', image: 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80' },
    { name: 'طاولة قهوة خشبية مودرن لغرفة المعيشة بتصميم مريح', image: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=800&q=80' },
    { name: 'أريكة صالة معيشة مريحة 3 مقاعد بلون بيج راقٍ', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80' },
    { name: 'مكتب عمل خشبي عصري مع أدراج تخزين وأرجل معدنية', image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=800&q=80' },
    { name: 'خزانة كتب خشبية 5 أرفف واسعة للمكتب والمنزل', image: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80' }
  ],
  decor: [
    { name: 'مصباح طاولة سيراميك بتصميم عصري إضاءة دافئة', image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80' },
    { name: 'مرآة حائط دائرية كبيرة بإطار ذهبي أنيق وعصري', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80' },
    { name: 'نبات زينة صناعي في وعاء سيراميك أبيض للمكتب والصالة', image: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم لوحات جدارية كانفاس بتصميم مودرن تجريدي 3 قطع', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80' },
    { name: 'سجادة غرفة معيشة ناعمة بتصميم رمادي كلاسيكي مريح', image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80' }
  ],
  perfumes: [
    { name: 'عطر شانيل بلو دي شانيل رجالي فاخر أو دي تواليت', image: 'https://images.unsplash.com/photo-1523293115678-d2900f52f461?auto=format&fit=crop&w=800&q=80' },
    { name: 'عطر ديور ساواج للرجال أو دي برفيوم فواح وجذاب', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80' },
    { name: 'عطر إيف سان لوران ليبر النسائي الأنيق والجريء', image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80' },
    { name: 'عطر دولتشي أند غابانا ذا ون الفخم للرجال والنساء', image: 'https://images.unsplash.com/photo-1523293115678-d2900f52f461?auto=format&fit=crop&w=800&q=80' },
    { name: 'عطر باكو رابان وان مليون رجالي جذاب بعبوة ذهبية', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80' }
  ],
  'skin-care': [
    { name: 'سيروم حمض الهيالورونيك لاروش بوزيه بي 5 المغذي للبشرة', image: 'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=800&q=80' },
    { name: 'غسول الوجه سيرافي للبشرة العادية إلى الجافة بالرغوة المرطبة', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80' },
    { name: 'كريم مرطب بيبانثين اللطيف للعناية بالبشرة وحمايتها', image: 'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=800&q=80' },
    { name: 'واقي شمس فيشي سائل غير دهني SPF50 حماية كاملة', image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80' },
    { name: 'تونر بيكسي جلو المقشر للوجه 250 مل لبشرة مشرقة', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80' }
  ],
  'hair-care': [
    { name: 'مصفف ومجفف شعر دايسون إيرواب متكامل لجميع أنواع الشعر', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80' },
    { name: 'شامبو أولابلكس رقم 4 لإصلاح روابط الشعر التالف والمتقصف', image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80' },
    { name: 'زيت إكليل الجبل والنعناع ميلي الأصلي لتقوية بصيلات الشعر', image: 'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=800&q=80' },
    { name: 'قناع ماكاديميا لترطيب وإصلاح الشعر العميق واستعادة اللمعان', image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80' },
    { name: 'سيروم كريستاس المغذي لأطراف الشعر التالف والجاف للغاية', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80' }
  ],
  'coffee-tea': [
    { name: 'بن قهوة إثيوبية مختصة محمصة كاملة 250 جم نكهة فاكهية', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80' },
    { name: 'كبسولات نيسبريسو الأصلي طعم كلاسيكي متوازن 50 كبسولة', image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80' },
    { name: 'شاي ماتشا ياباني عضوي فاخر 100 جم مضاد للأكسدة', image: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم أوراق شاي أخضر كامل بالياسمين الطبيعي العطري المريح', image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80' },
    { name: 'بن قهوة كولومبية مختصة محمصة متوسطة نكهة الكاكاو الفخمة', image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80' }
  ],
  'dry-food': [
    { name: 'شوفان كامل الحبة عضوي وصحي 1 كجم مثالي للفطور', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=800&q=80' },
    { name: 'مكرونة إيطالية سميد القمح الصلب الممتاز لطهي رائع', image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=800&q=80' },
    { name: 'أرز بسمتي هندي طويل الحبة كلاسيك 5 كجم ممتاز للكبسة', image: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=800&q=80' },
    { name: 'زيت زيتون بكر ممتاز معصور على البارد 1 لتر نقي جداً', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80' },
    { name: 'مكسرات مشكلة فاخرة محمصة بعناية 500 جرام للتسالي الفاخرة', image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80' }
  ],
  'household-essentials': [
    { name: 'منظف الأسطح المتعدد ديتول برائحة الصنوبر المنعشة 1 لتر', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80' },
    { name: 'صابون غسيل ملابس تايد باور جل لغسيل ناصع ورائحة منعشة', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80' },
    { name: 'أقراص غسالة الصحون فينيش كوانتوم عبوة جامبو لغسيل لامع', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80' },
    { name: 'مناديل مبللة مضادة للبكتيريا عبوة عائلية فائقة النعومة والنظافة', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80' },
    { name: 'معطر الجو الفاخر برائحة العود والبخور الشرقي للأجواء الراقية', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80' }
  ],
  'fitness-equipment': [
    { name: 'سير جري كهربائي منزلي قابل للطي مع شاشة سرعات متعددة', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم أوزان دامبلز قابلة للتعديل 20 كجم مع حقيبة للياقة المنزلية', image: 'https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?auto=format&fit=crop&w=800&q=80' },
    { name: 'حبل قفز ذكي مع شاشة عرض رقمية ذكية لحرق السعرات الحرارية', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80' },
    { name: 'سجادة يوغا مطاطية مانعة للانزلاق عالية الكثافة وصديقة للبيئة', image: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=800&q=80' },
    { name: 'أربطة مقاومة مطاطية لتمارين اللياقة البدنية وبناء العضلات بالمنزل', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80' }
  ],
  sportswear: [
    { name: 'تيشيرت جري نايك دراي فيت أسود مريح سريع الجفاف والتهوية', image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80' },
    { name: 'بنطال ضاغط رياضي تحت الملابس أندر آرمور لتمارين شاقة وجري', image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80' },
    { name: 'سترة رياضية خفيفة مقاومة للرياح والمطر خفيفة وسهلة التخزين', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80' },
    { name: 'جوارب جري مبطنة لحماية القدمين طقم 3 أزواج قطن رياضي', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80' },
    { name: 'قبعة رياضية قابلة للتعديل أديداس بشعار مطرز للحماية من الشمس', image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80' }
  ],
  outdoors: [
    { name: 'خيمة تخييم تتسع لـ 4 أشخاص مقاومة للماء بالكامل وسهلة التركيب', image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80' },
    { name: 'حقيبة ظهر للتنزه والمغامرات 50 لتر واسعة ومريحة بحمالات مبطنة', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80' },
    { name: 'مطارة ماء معزولة لحفظ الحرارة والبرودة 1 لتر ستيل متين مقاوم للصدأ', image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80' },
    { name: 'كرسي رحلات قابل للطي خفيف الوزن مع حامل أكواب وحقيبة كتف', image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80' },
    { name: 'كشاف رأس قوي مضاد للمياه قابل لإعادة الشحن بمنفذ Type-C ذكي', image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80' }
  ],
  'car-accessories': [
    { name: 'شاحن جوال سريع للسيارة منفذين بقوة 38 واط أنكر عالي الكفاءة', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' },
    { name: 'حامل جوال مغناطيسي قوي يثبت بفتحة تهوية السيارة لمنع السقوط', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' },
    { name: 'كاميرا لوحة قيادة السيارة داش كام دقة 4K مع GPS ورؤية ليلية', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' },
    { name: 'مظلة زجاج السيارة الأمامي القابلة للطي والفتح بسهولة لحماية الطبلون', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم دواسات سيارة جلدية فاخرة بتصميم خياطة ماسية أسود متين مقاوم للمياه', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' }
  ],
  'car-care': [
    { name: 'شامبو غسيل سيارات ميجوايرز بالواكس لمعان رائع وحماية طلاء السيارت', image: 'https://images.unsplash.com/photo-1607860108855-64cac207864d?auto=format&fit=crop&w=800&q=80' },
    { name: 'منظف وتلميع داخلي للسيارة ارمور اول حماية من التشققات والأتربة', image: 'https://images.unsplash.com/photo-1607860108855-64cac207864d?auto=format&fit=crop&w=800&q=80' },
    { name: 'فوط مايكروفايبر فائقة الامتصاص لتنشيف وتلميع السيارة 6 قطع ناعمة', image: 'https://images.unsplash.com/photo-1607860108855-64cac207864d?auto=format&fit=crop&w=800&q=80' },
    { name: 'ملمع زجاج ومرايا السيارة المانع للضباب وتراكم المياه وتسهيل القيادة', image: 'https://images.unsplash.com/photo-1607860108855-64cac207864d?auto=format&fit=crop&w=800&q=80' },
    { name: 'جهاز نفخ إطارات السيارة الكهربائي محمول وذكي لاسلكي مع شاشة رقمية', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' }
  ],
  'spare-parts': [
    { name: 'طقم شفرات مساحات بوش للزجاج الأمامي للسيارة أداء صامت وممتاز', image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80' },
    { name: 'فلتر هواء محرك السيارة الأصلي لأداء محرك ممتاز واستهلاك بنزين أقل', image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80' },
    { name: 'مصباح أمامي إل إي دي للسيارات قوي جداً أبيض ناصع بقوة إضاءة عالية', image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80' },
    { name: 'شاحن بطارية سيارة ذكي أوتوماتيكي مع شاشة ديجيتال وإصلاح ذكي للبطارية', image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم أغطية صمامات إطارات سيارة معدنية مضادة للسرقة 4 قطع مع مفتاح', image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80' }
  ],
  'educational-toys': [
    { name: 'طقم مكعبات تركيب مغناطيسية للأطفال لتنمية الذكاء والهندسة الإبداعية', image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' },
    { name: 'مجهر تعليمي للأطفال لعلم الأحياء والاستكشاف العلمي دقة عالية', image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' },
    { name: 'مجموعات تجارب كيميائية آمنة للأطفال في المنزل مع كتيب التجارب', image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' },
    { name: 'ألعاب مكعبات أرقام وحروف خشبية للتعلم المبكر وتطوير المهارات الحركية', image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' },
    { name: 'روبوت ذكي قابل للبرمجة والتحكم للأطفال مع تطبيق الهاتف الجوال', image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80' }
  ],
  'baby-essentials': [
    { name: 'حفاضات بامبرز بريميوم عناية ممتازة مقاس 3 عبوة 100 حفاضة ناعمة', image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80' },
    { name: 'عربة أطفال خفيفة قابلة للطي بيد واحدة للسفر والرحلات والتنقل المريح', image: 'https://images.unsplash.com/photo-1594782078968-2b07aa56e9df?auto=format&fit=crop&w=800&q=80' },
    { name: 'لهاية أطفال سيليكون طبي ناعم مهدئة ومريحة خالية من BPA قطعتين', image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80' },
    { name: 'حقيبة ظهر لحفاضات ومستلزمات الأطفال مع سرير متنقل مدمج وذكي', image: 'https://images.unsplash.com/photo-1594782078968-2b07aa56e9df?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم ملاعق وأطباق سيليكون طبي مرن لتغذية الأطفال الصغار بأمان', image: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80' }
  ],
  'outdoor-toys': [
    { name: 'سكوتر أطفال ثلاثي العجلات مضيء وقابل للتعديل عالي الجودة والأمان', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80' },
    { name: 'ترامبولين أطفال منزلي مع شبكة حماية كاملة وزنبرك قوي وآمن للحديقة', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80' },
    { name: 'أرجوحة أطفال معلقة للحديقة آمنة للغاية وتتحمل أوزاناً كبيرة ومتينة', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم ألعاب الشاطئ والرمل للأطفال مع دلو ومجارف 10 قطع ملونة جميلة', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80' },
    { name: 'مسدس فقاعات الصابون الأوتوماتيكي الكبير مع سائل الفقاعات الممتع', image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80' }
  ],
  'arabic-books': [
    { name: 'كتاب مقدمة ابن خلدون طبعة فاخرة ومحققة بالكامل للباحثين والمؤرخين', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80' },
    { name: 'رواية أنتونيلا المشوقة - قصة في الحب والتحدي والمجتمع العربي', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80' },
    { name: 'كتاب الأب الغني والأب الفقير دليل الحرية المالية وتطوير الذات بالكامل', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80' },
    { name: 'كتاب لأنك الله - رحلة إلى السماء السابعة للكاتب د. علي الفيفي المشهور', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80' },
    { name: 'كتاب قوة العادات لتغيير حياتك اليومية وتحقيق النجاح المهني والشخصي', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80' }
  ],
  'office-supplies': [
    { name: 'طقم أقلام حبر سائل ملونة للكتابة السلسة والرسم الدقيق 12 قلم متنوع', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
    { name: 'خرامة ورق مكتبية شديدة التحمل تخرم حتى 30 ورقة معاً بتصميم معدني', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم منظم مكتب خشبي فاخر لترتيب الملفات والأقلام 5 قطع أنيقة جداً', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
    { name: 'دباسة ورق مكتبية متينة ومقاومة للانحشار مع علبة 5000 دبوس صلب', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
    { name: 'سبورة بيضاء مغناطيسية عريضة مع حامل أقلام متكامل لغرف الاجتماعات', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' }
  ],
  notebooks: [
    { name: 'دفتر ملاحظات جلدي فاخر مسطر مقاس A5 عالي الجودة ومقاوم للتمزق', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
    { name: 'مفكرة يومية لتنظيم المهام وخطط العمل والإنتاجية بتصميم رائع وعصري', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
    { name: 'دفتر سكتش رسم ورق سميك يناسب التلوين المائي والرصاص والفحم الفني', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم دفاتر ملاحظات صغيرة ملونة لتدوين الأفكار السريعة 3 دفاتر بغلاف قوي', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' },
    { name: 'مفكرة أسبوعية غير مؤرخة لتخطيط الإنتاجية وتنظيم الوقت والأهداف', image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=800&q=80' }
  ],
  'smart-watches': [
    { name: 'ساعة آبل الذكية الإصدار 9 جي بي إس هيكل ألومنيوم مع حزام رياضي', image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=80' },
    { name: 'ساعة سامسونج جالكسي واتش 6 كلاسيك شاشة سوبر أموليد دائرية فاخرة', image: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80' },
    { name: 'ساعة هواوي جي تي 4 بتصميم كلاسيكي أنيق وبطارية تدوم لأسبوعين كاملين', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' },
    { name: 'سوار شاومي الذكي الإصدار 8 الرياضي لرصد اللياقة والنوم ودعم الأنشطة', image: 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?auto=format&fit=crop&w=800&q=80' },
    { name: 'ساعة جارمن فينيكس 7 للمغامرات الرياضية وتحديد المواقع GPS بدقة فائقة', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' }
  ],
  'smart-home': [
    { name: 'جهاز جوجل نست هب الذكي الجيل الثاني مع شاشة عرض مدمجة وصوت نقي', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'مقبس كهربائي ذكي للتحكم بالأجهزة عن بعد متوافق بالكامل مع أليكسا وجوجل', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'طقم إضاءة فيليبس هيو الذكية الملونة لبدء ذكي للمنزل مع جهاز التحكم', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'قفل باب ذكي ببصمة الأصابع وواي فاي لفتح آمن ومريح ومراقبة الدخول', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'جهاز شاومي العالمي للتحكم بالأجهزة المنزلية عبر الأشعة تحت الحمراء بهاتفك', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' }
  ],
  'security-cameras': [
    { name: 'كاميرا مراقبة منزلية يوفي دقة 2K داخلية بزاوية دوران كاملة ومستشعر', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'كاميرا مراقبة خارجية لاسلكية تعمل بالطاقة الشمسية مع كشاف ذكي قوي', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'جرس باب ذكي بالفيديو وكاميرا دقة HD مع مستشعر حركة متطور وتحدث ثنائي', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'كاميرا مراقبة شاومي 360 درجة ذكية تدعم الرؤية الليلية بالألوان بالكامل', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'كاميرا مراقبة صغيرة لاسلكية مخفية للغرف والمنزل الذكي مراقبة مستمرة', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' }
  ],
  'health-monitors': [
    { name: 'جهاز قياس ضغط الدم التلقائي من أومرون دقة وموثوقية عالية معتمد طبياً', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
    { name: 'ميزان حرارة الجبهة بالأشعة تحت الحمراء بدون تلامس للأطفال والكبار دقيق', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
    { name: 'ميزان دهون وكتلة الجسم الذكي يقيس 12 مؤشراً حيوياً مع تطبيق الهاتف', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
    { name: 'جهاز قياس نسبة الأكسجين في الدم محمول وسريع يعلق بالإصبع بضغطة واحدة', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
    { name: 'جهاز قياس نسبة السكر في الدم مع 50 شريط اختبار ومشرط طبي معقم وسريع', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' }
  ],
  vitamins: [
    { name: 'كبسولات أوميغا 3 زيت السمك تركيز عالٍ لصحة القلب والذاكرة والمفاصل', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80' },
    { name: 'فيتامين د3 تركيز 5000 وحدة دولية 120 كبسولة هلامية لصحة العظام والمناعة', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80' },
    { name: 'فيتامينات متعددة للرجال عبوة 90 قرص لزيادة الطاقة والنشاط البدني المتكامل', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80' },
    { name: 'حبوب الكولاجين البحري الطبيعي مع حمض الهيالورونيك للبشرة والشعر والأظافر', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80' },
    { name: 'مكمل الزنك والمغنيسيوم مع فيتامين ب6 للاستشفاء العضلي المريح ونوم عميق', image: 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80' }
  ],
  'medical-supplies': [
    { name: 'كمامات طبية 3 طبقات حماية ممتازة عبوة 50 قطعة زرقاء معقمة ومريحة', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
    { name: 'حقيبة إسعافات أولية منزلية متكاملة لجميع الطوارئ والجروح والرحلات الخارجية', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
    { name: 'معقم يدين جل طبي كحول 70% عبوة ضاغطة عائلية 500 مل للوقاية اليومية', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
    { name: 'ضمادات جروح مرنة بأحجام متنوعة مضادة للمياه طقم 100 ضمادة طبية ناعمة', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' },
    { name: 'كمادات باردة وحارة قابلة لإعادة الاستخدام لتخفيف آلام المفاصل والعضلات', image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80' }
  ],
  'best-sellers': [
    { name: 'آبل آيفون 15 برو ماكس 256 جيجابايت تيتانيوم طبيعي فخم للغاية', image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80' },
    { name: 'سماعات سوني WH-1000XM5 عازلة للضوضاء ومريحة للغاية وبطارية طويلة', image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=800&q=80' },
    { name: 'جهاز سوني بلايستيشن 5 الإصدار الرقمي مع ذراعي تحكم لاسلكي أصليين', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80' },
    { name: 'قلاية هوائية فيليبس إكس إل بدون زيت سعة عائلية شاشة ديجيتال ممتازة', image: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=800&q=80' },
    { name: 'عطر ديور ساواج الفاخر للرجال رائحة تدوم طويلاً جذاب جداً وفواح', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80' }
  ],
  'new-arrivals': [
    { name: 'سامسونج جالكسي S24 ألترا الذكاء الاصطناعي شاشة مسطحة تيتانيوم رمادي رائع', image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80' },
    { name: 'آبل ماك بوك برو 16 شريحة M3 برو شاشة ليكويد ريتنا إكس دي آر فائق القوة', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80' },
    { name: 'ساعة آبل الذكية الإصدار 9 ألمنيوم مع سوار رياضي أنيق جداً وعصري', image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=800&q=80' },
    { name: 'مصفف ومجفف شعر دايسون إيرواب الجيل الجديد بتقنيات ذكية وتحكم فائق بالحرارة', image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80' },
    { name: 'كاميرا كانون EOS R5 الاحترافية 45 ميجابكسل تصوير فيديو بدقة 8K ممتازة', image: 'https://images.unsplash.com/photo-1516724562728-afc824a36e84?auto=format&fit=crop&w=800&q=80' }
  ],
  'hot-deals': [
    { name: 'لابتوب ديل XPS 15 شاشة لمس مخصصة للتصميم والأعمال بخصم 20% مذهل', image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80' },
    { name: 'شاحن أنكر المحمول بقوة 20000 مللي أمبير سرعة فائقة وجودة عالية للرحلات', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80' },
    { name: 'مكنسة يوفي الروبوتية الذكية لشفط الأتربة والمسح المائي عن بعد بالواي فاي', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80' },
    { name: 'شاشة ألعاب إل جي 27 إنش بمعدل تحديث 144Hz وزمن استجابة 1ms مذهلة للألعاب', image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80' },
    { name: 'ميكروويف إل جي الذكي سعة 42 لتر تسخين ذكي وتصميم راقٍ جداً فضي', image: 'https://images.unsplash.com/photo-1621972750749-0fbb1abb7736?auto=format&fit=crop&w=800&q=80' }
  ]
};

async function upsertUser(
  email: string,
  fullName: string,
  role: Role,
  passwordHash: string,
): Promise<User> {
  const repo = dataSource.getRepository(User);
  const existing = await repo.findOne({ where: { email } });

  if (existing) {
    existing.fullName = fullName;
    existing.role = role;
    existing.isActive = true;
    existing.isVerified = true;
    return repo.save(existing);
  }

  return repo.save(
    repo.create({
      email,
      fullName,
      role,
      passwordHash,
      isActive: true,
      isVerified: true,
    }),
  );
}

async function upsertCategory(
  name: string,
  slug: string,
  sortOrder: number,
  parentId?: string,
): Promise<Category> {
  const repo = dataSource.getRepository(Category);
  const imageUrl = await ensureSeedImage(slug, name);
  const existing = await repo.findOne({ where: { slug } });

  if (existing) {
    existing.name = name;
    existing.sortOrder = sortOrder;
    existing.parentId = parentId ?? null;
    existing.imageUrl = imageUrl;
    existing.isActive = true;
    return repo.save(existing);
  }

  return repo.save(
    repo.create({
      name,
      slug,
      parentId: parentId ?? null,
      sortOrder,
      imageUrl,
      isActive: true,
    }),
  );
}

async function upsertProduct(
  category: Category,
  vendor: User,
  index: number,
): Promise<Product> {
  const productRepo = dataSource.getRepository(Product);
  const imageRepo = dataSource.getRepository(ProductImage);
  
  // Choose category-specific products if available, otherwise fallback to the default list
  const categoryProducts = productsByCategory[category.slug] || realProducts;
  const realProduct = categoryProducts[index % categoryProducts.length];
  
  const name = realProduct.name;
  const slug = `seed-${category.slug}-${index + 1}`;
  const price = Number(
    (99 + ((index * 137) % 4800) + (index % 9) * 0.99).toFixed(2),
  );
  const comparePrice =
    index % 3 === 0 ? Number((price * 1.18).toFixed(2)) : null;
  const thumbnailUrl = realProduct.image;

  let product = await productRepo.findOne({
    where: { slug },
    withDeleted: true,
  });
  if (!product) {
    product = productRepo.create({ slug });
  }

  product.name = name;
  product.description = `منتج تجريبي عالي الجودة ضمن قسم ${category.name}. مناسب لاختبار البحث، التصنيفات، السلة، وتجربة الشراء.`;
  product.vendorId = vendor.id;
  product.categoryId = category.id;
  product.price = price;
  product.comparePrice = comparePrice;
  product.sku = `MOH-${category.slug.toUpperCase().slice(0, 12)}-${String(
    index + 1,
  ).padStart(3, '0')}`;
  product.stockQuantity = 15 + ((index * 11) % 240);
  product.isActive = true;
  product.isFeatured = index % 5 === 0;
  product.weightKg = Number((0.15 + (index % 12) * 0.21).toFixed(3));
  product.thumbnailUrl = thumbnailUrl;
  product.deletedAt = null;

  const savedProduct = await productRepo.save(product);
  const existingImage = await imageRepo.findOne({
    where: { productId: savedProduct.id, imageUrl: thumbnailUrl },
  });

  if (!existingImage) {
    await imageRepo.save(
      imageRepo.create({
        productId: savedProduct.id,
        imageUrl: thumbnailUrl,
        altText: name,
        sortOrder: 0,
      }),
    );
  }

  return savedProduct;
}

async function ensureSeedImage(slug: string, title: string): Promise<string> {
  const relativePath = `seed/products/${slug}.svg`;
  const uploadRoot = resolve(process.cwd(), uploadDest);
  const absolutePath = join(uploadRoot, relativePath);
  const background = colorFromSlug(slug);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <rect width="900" height="900" fill="#0F172A"/>
  <rect x="60" y="60" width="780" height="780" rx="42" fill="${background}"/>
  <circle cx="710" cy="190" r="86" fill="#00F0FF" opacity="0.22"/>
  <circle cx="185" cy="715" r="126" fill="#0A1128" opacity="0.35"/>
  <text x="450" y="405" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" fill="#FFFFFF" font-weight="700">MOHEET</text>
  <text x="450" y="468" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#DFFBFF">${escapeXml(title.slice(0, 38))}</text>
  <text x="450" y="535" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#E2E8F0">Demo Product Image</text>
</svg>`;

  await mkdir(join(uploadRoot, 'seed', 'products'), { recursive: true });
  await writeFile(absolutePath, svg, 'utf8');

  return `${uploadPublicBaseUrl.replace(/\/$/, '')}/${relativePath}`;
}

function colorFromSlug(slug: string): string {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const palette = [
    '#0A1128',
    '#164E63',
    '#155E75',
    '#1E3A8A',
    '#334155',
    '#065F46',
  ];
  return palette[hash % palette.length];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function bootstrap() {
  await dataSource.initialize();

  try {
    const passwordHash = await bcrypt.hash(demoPassword, 12);
    const vendors: User[] = [];

    for (let i = 1; i <= 6; i++) {
      vendors.push(
        await upsertUser(
          `vendor${i}@moheet.test`,
          `تاجر محيط التجريبي ${i}`,
          Role.VENDOR,
          passwordHash,
        ),
      );
    }

    await upsertUser(
      'customer@moheet.test',
      'عميل محيط التجريبي',
      Role.CUSTOMER,
      passwordHash,
    );

    const childCategories: Category[] = [];
    let sortOrder = 0;

    for (const categorySeed of categorySeeds) {
      const parent = await upsertCategory(
        categorySeed.name,
        categorySeed.slug,
        sortOrder++,
      );

      for (const child of categorySeed.children) {
        childCategories.push(
          await upsertCategory(child.name, child.slug, sortOrder++, parent.id),
        );
      }
    }

    let productCount = 0;
    for (const [categoryIndex, category] of childCategories.entries()) {
      for (let i = 0; i < 10; i++) {
        const globalIndex = categoryIndex * 10 + i;
        const vendor = vendors[globalIndex % vendors.length];
        await upsertProduct(category, vendor, globalIndex);
        productCount++;
      }
    }

    console.log('MOHEET demo seed completed');
    console.log(`vendors=${vendors.length}`);
    console.log(`categories=${categorySeeds.length + childCategories.length}`);
    console.log(`products=${productCount}`);
  } finally {
    await dataSource.destroy();
  }
}

bootstrap().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
