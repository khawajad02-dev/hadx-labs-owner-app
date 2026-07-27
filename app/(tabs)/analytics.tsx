import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { apiGet } from '@/lib/api-client';
import { useColors } from '@/hooks/use-colors';

interface AnalyticsData {
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  topProducts: Array<{ name: string; sales: number }>;
  topCustomers: Array<{ name: string; spent: number }>;
  dailyRevenue: Array<{ date: string; amount: number }>;
  monthlyRevenue: Array<{ month: string; amount: number }>;
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'daily' | 'monthly'>('monthly');

  const fetchAnalytics = async () => {
    try {
      setError('');
      const response = await apiGet('/analytics');
      setAnalytics(response.data || {
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        topProducts: [],
        topCustomers: [],
        dailyRevenue: [],
        monthlyRevenue: [],
      });
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
      setAnalytics({
        totalRevenue: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        topProducts: [],
        topCustomers: [],
        dailyRevenue: [],
        monthlyRevenue: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const StatCard = ({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) => (
    <View
      className="flex-1 rounded-lg p-4 m-2"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text className="text-sm mb-2" style={{ color: colors.muted }}>
        {label}
      </Text>
      <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
        {value}{unit}
      </Text>
    </View>
  );

  const ChartBar = ({ label, value, maxValue }: { label: string; value: number; maxValue: number }) => {
    const percentage = (value / maxValue) * 100;
    return (
      <View className="gap-1 mb-3">
        <View className="flex-row justify-between items-center">
          <Text style={{ color: colors.foreground }} className="text-sm">
            {label}
          </Text>
          <Text style={{ color: colors.primary }} className="font-bold">
            ${value}
          </Text>
        </View>
        <View
          className="h-2 rounded"
          style={{ backgroundColor: colors.border }}
        >
          <View
            className="h-2 rounded"
            style={{
              backgroundColor: colors.primary,
              width: `${percentage}%`,
            }}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <ScreenContainer containerClassName="flex-1" className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const revenueData = timeRange === 'daily' ? analytics?.dailyRevenue : analytics?.monthlyRevenue;
  const maxRevenue = Math.max(...(revenueData?.map(d => d.amount) || [0]));

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold" style={{ color: colors.foreground }}>
              Analytics
            </Text>
            <Text style={{ color: colors.muted }}>
              Store Performance
            </Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View
              className="rounded-lg p-4"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: '#EF4444' }}
            >
              <Text style={{ color: '#FCA5A5' }}>{error}</Text>
            </View>
          ) : null}

          {/* Key Metrics */}
          <View>
            <Text className="text-lg font-semibold mb-3" style={{ color: colors.foreground }}>
              Key Metrics
            </Text>
            <View className="flex-row flex-wrap">
              <StatCard label="Total Revenue" value={`$${analytics?.totalRevenue || 0}`} />
              <StatCard label="Avg Order Value" value={`$${analytics?.averageOrderValue || 0}`} />
              <StatCard label="Conversion Rate" value={`${analytics?.conversionRate || 0}%`} />
            </View>
          </View>

          {/* Revenue Chart */}
          <View
            className="rounded-lg p-4"
            style={{
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                Revenue Trend
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setTimeRange('daily')}
                  style={{
                    backgroundColor: timeRange === 'daily' ? colors.primary : colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: timeRange === 'daily' ? colors.background : colors.muted }}
                  >
                    Daily
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTimeRange('monthly')}
                  style={{
                    backgroundColor: timeRange === 'monthly' ? colors.primary : colors.border,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: timeRange === 'monthly' ? colors.background : colors.muted }}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {revenueData && revenueData.length > 0 ? (
              <View>
            {revenueData.map((item: any, index: number) => (
              <ChartBar
                key={index}
                label={item.date || item.month || `Period ${index + 1}`}
                value={item.amount}
                maxValue={maxRevenue || 1}
              />
            ))}
              </View>
            ) : (
              <Text style={{ color: colors.muted }} className="text-center py-4">
                No revenue data available
              </Text>
            )}
          </View>

          {/* Top Products */}
          {analytics?.topProducts && analytics.topProducts.length > 0 && (
            <View
              className="rounded-lg p-4"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text className="text-lg font-semibold mb-3" style={{ color: colors.foreground }}>
                Top Products
              </Text>
              {analytics.topProducts.map((product, index) => (
                <View key={index} className="flex-row justify-between items-center mb-2">
                  <Text style={{ color: colors.foreground }}>{product.name}</Text>
                  <View
                    className="rounded px-3 py-1"
                    style={{ backgroundColor: colors.primary }}
                  >
                    <Text className="text-xs font-bold" style={{ color: colors.background }}>
                      {product.sales} sales
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Top Customers */}
          {analytics?.topCustomers && analytics.topCustomers.length > 0 && (
            <View
              className="rounded-lg p-4"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text className="text-lg font-semibold mb-3" style={{ color: colors.foreground }}>
                Top Customers
              </Text>
              {analytics.topCustomers.map((customer, index) => (
                <View key={index} className="flex-row justify-between items-center mb-2">
                  <Text style={{ color: colors.foreground }}>{customer.name}</Text>
                  <Text className="font-bold" style={{ color: colors.primary }}>
                    ${customer.spent}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
