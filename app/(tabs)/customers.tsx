import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, Alert, Linking } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { apiGet } from '@/lib/api-client';
import { useColors } from '@/hooks/use-colors';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  lifetimeValue: number;
  lastOrderDate?: string;
  notes?: string;
}

export default function CustomersScreen() {
  const colors = useColors();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
    try {
      setError('');
      const response = await apiGet('/customers');
      setCustomers(response.data || []);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
      setCustomers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const message = `Hi ${name}, thank you for your business!`;
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open WhatsApp'));
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Error', 'Could not initiate call'));
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`).catch(() => Alert.alert('Error', 'Could not open email'));
  };

  const CustomerCard = ({ customer }: { customer: Customer }) => (
    <View
      className="rounded-lg p-4 mb-3"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1">
          <Text className="text-lg font-bold" style={{ color: colors.foreground }}>
            {customer.name}
          </Text>
          <Text style={{ color: colors.muted }} className="text-sm">
            {customer.email}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
            ${customer.lifetimeValue}
          </Text>
          <Text style={{ color: colors.muted }} className="text-xs">
            LTV
          </Text>
        </View>
      </View>

      <View className="gap-2 mb-3">
        <View className="flex-row justify-between">
          <Text style={{ color: colors.muted }} className="text-sm">
            Orders
          </Text>
          <Text style={{ color: colors.foreground }} className="font-semibold">
            {customer.totalOrders}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text style={{ color: colors.muted }} className="text-sm">
            Phone
          </Text>
          <Text style={{ color: colors.foreground }} className="text-sm">
            {customer.phone}
          </Text>
        </View>
        {customer.lastOrderDate && (
          <View className="flex-row justify-between">
            <Text style={{ color: colors.muted }} className="text-sm">
              Last Order
            </Text>
            <Text style={{ color: colors.foreground }} className="text-sm">
              {new Date(customer.lastOrderDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Contact Buttons */}
      <View className="flex-row gap-2">
        <TouchableOpacity
          className="flex-1 rounded py-2 items-center"
          style={{ backgroundColor: '#25D366' }}
          onPress={() => handleWhatsApp(customer.phone, customer.name)}
        >
          <Text className="font-semibold text-xs text-white">💬 WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded py-2 items-center"
          style={{ backgroundColor: '#0066CC' }}
          onPress={() => handleCall(customer.phone)}
        >
          <Text className="font-semibold text-xs text-white">📞 Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded py-2 items-center"
          style={{ backgroundColor: '#EA4335' }}
          onPress={() => handleEmail(customer.email)}
        >
          <Text className="font-semibold text-xs text-white">✉️ Email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CustomerCard customer={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="gap-4 mb-4">
            <View>
              <Text className="text-3xl font-bold" style={{ color: colors.foreground }}>
                Customers
              </Text>
              <Text style={{ color: colors.muted }}>
                {customers.length} customers
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
                No customers available
              </Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}
