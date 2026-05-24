typedef JsonMap = Map<String, dynamic>;

class ProductSummary {
  const ProductSummary({
    required this.id,
    required this.name,
    required this.price,
    this.thumbnailUrl,
  });

  final String id;
  final String name;
  final num price;
  final String? thumbnailUrl;

  factory ProductSummary.fromJson(JsonMap json) {
    return ProductSummary(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      price: json['price'] as num? ?? 0,
      thumbnailUrl: json['thumbnailUrl'] as String?,
    );
  }
}

class FavoriteEntry {
  const FavoriteEntry({required this.id, required this.product});

  final String id;
  final ProductSummary product;

  factory FavoriteEntry.fromJson(JsonMap json) {
    return FavoriteEntry(
      id: json['id'] as String,
      product: ProductSummary.fromJson(JsonMap.from(json['product'] as Map)),
    );
  }
}

class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.status,
    required this.paymentStatus,
    required this.totalAmount,
  });

  final String id;
  final String status;
  final String paymentStatus;
  final num totalAmount;

  factory OrderSummary.fromJson(JsonMap json) {
    return OrderSummary(
      id: json['id'] as String,
      status: json['status'] as String? ?? '',
      paymentStatus: json['paymentStatus'] as String? ?? '',
      totalAmount: json['totalAmount'] as num? ?? 0,
    );
  }
}

class CheckoutAddress {
  const CheckoutAddress({
    required this.fullName,
    required this.phone,
    required this.city,
    required this.fullAddress,
  });

  final String fullName;
  final String phone;
  final String city;
  final String fullAddress;

  JsonMap toJson() => {
    'fullName': fullName,
    'phone': phone,
    'city': city,
    'fullAddress': fullAddress,
  };
}
