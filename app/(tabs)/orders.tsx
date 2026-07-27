import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, Alert, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { apiGet, apiPut } from '@/lib/api-client';
import { useColors } from '@/hooks/use-colors';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  address: string;
  paymentMethod: string;
  trackingNumber?: string;
  createdAt: string;
}

export default function OrdersScreen() {
  const colors = useColors();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    try {
      setError('');
      const response = await apiGet('/orders');
      setOrders(response.data || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiPut(`/orders/${orderId}`, { status: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleWhatsApp = (phone: string, customerName: string) => {
    const message = `Hi ${customerName}, this is an update about your order.`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Could not initiate call'));
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => Alert.alert('Error', 'Could not open email'));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'processing': return '#3B82F6';
      case 'shipped': return '#8B5CF6';
      case 'delivered': return '#22C55E';
      case 'cancelled': return '#EF4444';
      default: return colors.muted;
    }
  };

  const OrderCard = ({ order }: { order: Order }) => (
    <View
      className="rounded-lg p-4 mb-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: colors.foreground }}>
            #{order.orderNumber}
          </Text>
          <Text style={{ color: colors.muted }} className="text-sm">
            {order.customerName}
          </Text>
        </View>
        <View
          className="rounded px-3 py-1"
          style={{ backgroundColor: getStatusColor(order.status) }}
        >
          <Text className="text-xs font-bold text-white capitalize">
            {order.status}
          </Text>
        </View>
      </View>

      <View className="gap-2 mb-3">
        <View className="flex-row justify-between">
          <Text style={{ color: colors.muted }} className="text-sm">
            Total
          </Text>
          <Text className="font-bold" style={{ color: colors.primary }}>
            ${order.total}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text style={{ color: colors.muted }} className="text-sm">
            Address
          </Text>
          <Text style={{ color: colors.foreground }} className="text-sm flex-1 text-right">
            {order.address}
          </Text>
        </View>
        {order.trackingNumber && (
          <View className="flex-row justify-between">
            <Text style={{ color: colors.muted }} className="text-sm">
              Tracking
            </Text>
            <Text style={{ color: colors.foreground }} className="text-sm">
              {order.trackingNumber}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View className="gap-2 mb-3">
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: colors.primary }}
            onPress={() => updateOrderStatus(order.id, 'shipped')}
          >
            <Text className="font-semibold text-xs" style={{ color: colors.background }}>
              📦 Fulfill
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: colors.primary, opacity: 0.7 }}
            onPress={() => updateOrderStatus(order.id, 'delivered')}
          >
            <Text className="font-semibold text-xs" style={{ color: colors.background }}>
              ✓ Deliver
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact Buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: '#25D366' }}
            onPress={() => handleWhatsApp(order.customerPhone, order.customerName)}
          >
            <Text className="font-semibold text-xs text-white">💬 WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: '#0066CC' }}
            onPress={() => handleCall(order.customerPhone)}
          >
            <Text className="font-semibold text-xs text-white">📞 Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: '#EA4335' }}
            onPress={() => handleEmail(order.customerEmail)}
          >
            <Text className="font-semibold text-xs text-white">✉️ Email</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OrderCard order={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="gap-4 mb-4">
            <View>
              <Text className="text-3xl font-bold" style={{ color: colors.foreground }}>
                Orders
              </Text>
              <Text style={{ color: colors.muted }}>
                {orders.length} orders
              </Text>
            </View>

            {error ? (
              <View
                className="rounded-lg p-4"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: '#EF4444' }}
              >
                <Text style={{ color: '#FCA5A5' }}>{error}</Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View className="items-center justify-center py-12">
              <Text style={{ color: colors.muted }} className="text-center">
                No orders available
              </Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}
