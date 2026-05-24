import 'package:flutter/material.dart';
import 'core/api_client.dart';
import 'features/store/store_models.dart';
import 'features/store/store_repository.dart';

void main() => runApp(const MoheetApp());

class MoheetApp extends StatelessWidget {
  const MoheetApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MOHEET',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00F0FF),
          brightness: Brightness.dark,
          surface: const Color(0xFF0F172A),
        ),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        cardTheme: const CardThemeData(
          color: Color(0xFF111827),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
          ),
        ),
        useMaterial3: true,
      ),
      home: const MoheetHome(),
    );
  }
}

class MoheetHome extends StatefulWidget {
  const MoheetHome({super.key});

  @override
  State<MoheetHome> createState() => _MoheetHomeState();
}

class _MoheetHomeState extends State<MoheetHome> {
  final repository = StoreRepository(ApiClient());
  var index = 0;
  var loading = false;
  var message = '';
  List<ProductSummary> products = [];
  List<FavoriteEntry> favorites = [];
  List<OrderSummary> orders = [];

  final email = TextEditingController();
  final password = TextEditingController();
  final recipientName = TextEditingController();
  final phone = TextEditingController();
  final city = TextEditingController();
  final address = TextEditingController();

  @override
  void initState() {
    super.initState();
    loadProducts();
  }

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    recipientName.dispose();
    phone.dispose();
    city.dispose();
    address.dispose();
    super.dispose();
  }

  Future<void> run(Future<void> Function() action) async {
    setState(() {
      loading = true;
      message = '';
    });
    try {
      await action();
    } catch (error) {
      message = error.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> login() => run(() async {
    await repository.login(email.text.trim(), password.text);
    message = 'تم تسجيل الدخول';
    await Future.wait([loadProducts(), loadFavorites(), loadOrders()]);
  });

  Future<void> loadProducts() async {
    try {
      products = await repository.loadProducts();
      if (mounted) setState(() {});
    } catch (_) {
      products = [];
    }
  }

  Future<void> loadFavorites() async {
    if (!repository.isAuthenticated) return;
    favorites = await repository.loadFavorites();
  }

  Future<void> loadOrders() async {
    if (!repository.isAuthenticated) return;
    orders = await repository.loadOrders();
  }

  Future<void> addToCart(String productId) => run(() async {
    await repository.addToCart(productId);
    message = 'تمت الإضافة للسلة';
  });

  Future<void> addFavorite(String productId) => run(() async {
    await repository.addFavorite(productId);
    await loadFavorites();
    message = 'تم الحفظ في المفضلة';
  });

  Future<void> checkout() => run(() async {
    if ([
      recipientName.text,
      phone.text,
      city.text,
      address.text,
    ].any((value) => value.trim().isEmpty)) {
      throw Exception('أدخل اسم المستلم والهاتف والمدينة والعنوان');
    }

    final order = await repository.checkout(
      CheckoutAddress(
        fullName: recipientName.text.trim(),
        phone: phone.text.trim(),
        city: city.text.trim(),
        fullAddress: address.text.trim(),
      ),
    );
    await loadOrders();
    message = 'تم إنشاء الطلب ${order.id.substring(0, 8)}';
  });

  @override
  Widget build(BuildContext context) {
    final pages = [
      StoreTab(products: products, onCart: addToCart, onFavorite: addFavorite),
      FavoritesTab(favorites: favorites),
      OrdersTab(orders: orders),
      AccountTab(
        email: email,
        password: password,
        recipientName: recipientName,
        phone: phone,
        city: city,
        address: address,
        onLogin: login,
        onCheckout: checkout,
      ),
    ];

    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('مُحِيط'),
          backgroundColor: const Color(0xFF0A1128),
          actions: [
            IconButton(
              onPressed: loadProducts,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: Column(
          children: [
            if (loading) const LinearProgressIndicator(),
            if (message.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                color: const Color(0x2200F0FF),
                child: Text(message),
              ),
            Expanded(child: pages[index]),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (value) => setState(() => index = value),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.storefront),
              label: 'المتجر',
            ),
            NavigationDestination(icon: Icon(Icons.favorite), label: 'المفضلة'),
            NavigationDestination(
              icon: Icon(Icons.receipt_long),
              label: 'طلباتي',
            ),
            NavigationDestination(icon: Icon(Icons.person), label: 'الحساب'),
          ],
        ),
      ),
    );
  }
}

class StoreTab extends StatelessWidget {
  const StoreTab({
    required this.products,
    required this.onCart,
    required this.onFavorite,
    super.key,
  });

  final List<ProductSummary> products;
  final Future<void> Function(String productId) onCart;
  final Future<void> Function(String productId) onFavorite;

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: .68,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: products.length,
      itemBuilder: (context, index) {
        final product = products[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A1128),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: product.thumbnailUrl == null
                        ? const Icon(Icons.image, size: 40)
                        : Image.network(
                            product.thumbnailUrl!,
                            fit: BoxFit.cover,
                          ),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  product.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  '${product.price} ر.ي',
                  style: const TextStyle(
                    color: Color(0xFF00F0FF),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Row(
                  children: [
                    IconButton(
                      onPressed: () => onFavorite(product.id),
                      icon: const Icon(Icons.favorite_border),
                    ),
                    Expanded(
                      child: FilledButton(
                        onPressed: () => onCart(product.id),
                        child: const Text('أضف'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class FavoritesTab extends StatelessWidget {
  const FavoritesTab({required this.favorites, super.key});
  final List<FavoriteEntry> favorites;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: favorites
          .map(
            (item) => Card(
              child: ListTile(
                leading: const Icon(Icons.favorite, color: Color(0xFF00F0FF)),
                title: Text(item.product.name),
                subtitle: Text('${item.product.price} ر.ي'),
              ),
            ),
          )
          .toList(),
    );
  }
}

class OrdersTab extends StatelessWidget {
  const OrdersTab({required this.orders, super.key});
  final List<OrderSummary> orders;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: orders
          .map(
            (order) => Card(
              child: ListTile(
                title: Text('طلب ${order.id.substring(0, 8)}'),
                subtitle: Text('${order.status} - ${order.paymentStatus}'),
                trailing: Text('${order.totalAmount} ر.ي'),
              ),
            ),
          )
          .toList(),
    );
  }
}

class AccountTab extends StatelessWidget {
  const AccountTab({
    required this.email,
    required this.password,
    required this.recipientName,
    required this.phone,
    required this.city,
    required this.address,
    required this.onLogin,
    required this.onCheckout,
    super.key,
  });

  final TextEditingController email;
  final TextEditingController password;
  final TextEditingController recipientName;
  final TextEditingController phone;
  final TextEditingController city;
  final TextEditingController address;
  final Future<void> Function() onLogin;
  final Future<void> Function() onCheckout;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: email,
          decoration: const InputDecoration(labelText: 'البريد'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: password,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'كلمة المرور'),
        ),
        const SizedBox(height: 14),
        FilledButton(onPressed: onLogin, child: const Text('تسجيل الدخول')),
        const SizedBox(height: 20),
        const Text(
          'عنوان الشحن',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: recipientName,
          decoration: const InputDecoration(labelText: 'اسم المستلم'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: phone,
          decoration: const InputDecoration(labelText: 'رقم الهاتف'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: city,
          decoration: const InputDecoration(labelText: 'المدينة'),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: address,
          decoration: const InputDecoration(labelText: 'العنوان التفصيلي'),
        ),
        const SizedBox(height: 14),
        OutlinedButton(
          onPressed: onCheckout,
          child: const Text('إتمام شراء السلة'),
        ),
        const SizedBox(height: 14),
        const Text(
          'للمحاكي Android استخدم API_BASE_URL الافتراضي 10.0.2.2. على Windows Desktop شغّل مع --dart-define=API_BASE_URL=http://localhost:3000/api/v1',
        ),
      ],
    );
  }
}
