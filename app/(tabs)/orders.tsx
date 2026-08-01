import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, Alert, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { apiGet, apiPut } from '@/lib/api-client';
import { useColors } from '@/hooks/use-colors';

interface Order {
  id: string;
  orderReference: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  productTitle: string;
  quantity: number;
  totalAmountInCents: number;
  paymentStatus: string;
  orderStatus: string;
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
      // The API returns the array directly
      setOrders(Array.isArray(response.data) ? response.data : []);
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
      // Note: We need to implement this endpoint in the storefront if not already there
      await apiPut(`/orders/${orderId}`, { orderStatus: newStatus });
      setOrders(orders.map(o => o.id === orderId ? { ...o, orderStatus: newStatus } : o));
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  const handleWhatsApp = (phone: string, customerName: string) => {
    if (!phone) return Alert.alert('Error', 'No phone number available');
    const message = `Hi ${customerName}, this is an update about your order from HADX LABS.`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'RESERVED': return '#F59E0B';
      case 'CONFIRMED': return '#3B82F6';
      case 'SHIPPED': return '#8B5CF6';
      case 'DELIVERED': return '#22C55E';
      case 'CANCELLED': return '#EF4444';
      case 'EXPIRED': return '#71717A';
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
            {order.orderReference}
          </Text>
          <Text style={{ color: colors.muted }} className="text-sm">
            {order.fullName}
          </Text>
        </View>
        <View
          className="rounded px-3 py-1"
          style={{ backgroundColor: getStatusColor(order.orderStatus) }}
        >
          <Text className="text-xs font-bold text-white capitalize">
            {order.orderStatus}
          </Text>
        </View>
      </View>

      <View className="gap-2 mb-3">
        <View className="flex-row justify-between">
          <Text style={{ color: colors.muted }} className="text-sm">
            Product
          </Text>
          <Text style={{ color: colors.foreground }} className="text-sm font-medium">
            {order.productTitle} (x{order.quantity})
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text style={{ color: colors.muted }} className="text-sm">
            Total
          </Text>
          <Text className="font-bold" style={{ color: colors.primary }}>
            ${(order.totalAmountInCents / 100).toFixed(2)}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text style={{ color: colors.muted }} className="text-sm">
            Address
          </Text>
          <Text style={{ color: colors.foreground }} className="text-sm flex-1 text-right" numberOfLines={2}>
            {order.address}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="gap-2 mb-3">
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: colors.primary }}
            onPress={() => updateOrderStatus(order.id, 'CONFIRMED')}
          >
            <Text className="font-semibold text-xs" style={{ color: colors.background }}>
              Confirm
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: '#EF4444' }}
            onPress={() => updateOrderStatus(order.id, 'CANCELLED')}
          >
            <Text className="font-semibold text-xs" style={{ color: '#FCA5A5' }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact Buttons */}
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: '#25D366' }}
            onPress={() => handleWhatsApp(order.phone, order.fullName)}
          >
            <Text className="font-semibold text-xs text-white">WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 rounded py-2 items-center"
            style={{ backgroundColor: '#0066CC' }}
            onPress={() => Linking.openURL(`tel:${order.phone}`)}
          >
            <Text className="font-semibold text-xs text-white">Call</Text>
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
                Live Orders
              </Text>
              <Text style={{ color: colors.muted }}>
                {orders.length} orders found
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
