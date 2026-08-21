import 'package:flutter_test/flutter_test.dart';
import 'package:garbage_app/main.dart';

void main() {
  testWidgets('App renders bottom navigation', (WidgetTester tester) async {
    await tester.pumpWidget(const GarbageApp());
    expect(find.text('Current'), findsOneWidget);
    expect(find.text('Map'), findsOneWidget);
    expect(find.text('Orders'), findsOneWidget);
    expect(find.text('Chat'), findsOneWidget);
    expect(find.text('Menu'), findsOneWidget);
  });
}
