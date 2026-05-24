import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('MOHEET app renders', (WidgetTester tester) async {
    await tester.pumpWidget(const MoheetApp());
    expect(find.text('مُحِيط'), findsOneWidget);
  });
}
