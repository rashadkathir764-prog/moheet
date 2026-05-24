import '../../core/api_client.dart';
import 'store_models.dart';

class StoreRepository {
  StoreRepository(this._api);

  final ApiClient _api;

  bool get isAuthenticated => _api.token != null;

  Future<void> login(String email, String password) async {
    final response = await _api.post('/auth/login', {
      'email': email,
      'password': password,
    });
    final data = JsonMap.from(response['data'] as Map);
    _api.token = data['accessToken'] as String;
  }

  Future<List<ProductSummary>> loadProducts() async {
    final response = await _api.get('/products?limit=30');
    return _readList(response['data']).map(ProductSummary.fromJson).toList();
  }

  Future<List<FavoriteEntry>> loadFavorites() async {
    final response = await _api.get('/favorites');
    return _readList(response['data']).map(FavoriteEntry.fromJson).toList();
  }

  Future<List<OrderSummary>> loadOrders() async {
    final response = await _api.get('/orders/my');
    return _readList(response['data']).map(OrderSummary.fromJson).toList();
  }

  Future<void> addToCart(String productId) {
    return _api
        .post('/cart/items', {'productId': productId, 'quantity': 1})
        .then((_) {});
  }

  Future<void> addFavorite(String productId) {
    return _api.post('/favorites/$productId', {}).then((_) {});
  }

  Future<OrderSummary> checkout(CheckoutAddress address) async {
    final response = await _api.post('/orders/checkout', {
      'shippingAddress': address.toJson(),
      'paymentMethod': 'CASH_ON_DELIVERY',
    });
    return OrderSummary.fromJson(JsonMap.from(response['data'] as Map));
  }

  Iterable<JsonMap> _readList(Object? value) {
    final items = value is List ? value : const [];
    return items.map((item) => JsonMap.from(item as Map));
  }
}
