import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { apiGet } from '@/lib/api-client';
import { useColors } from '@/hooks/use-colors';

interface DashboardMetrics {
  revenueToday: number;
  activeUsers: number;
  serverStatus: string;
  databaseHealth: string;
  totalOrders: number;
  totalProducts: number;
}

export default function DashboardScreen() {
  const colors = useColors();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      setError('');
      const response = await apiGet('/dashboard');
      setMetrics(response.data);
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError('Failed to load dashboard metrics');
      // Set mock data for demonstration
      setMetrics({
        revenueToday: 0,
        activeUsers: 0,
        serverStatus: 'Unknown',
        databaseHealth: 'Unknown',
        totalOrders: 0,
        totalProducts: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };

  const MetricCard = ({ label, value, icon }: { label: string; value: string | number; icon: string }) => (
    <View
      className="flex-1 rounded-xl p-4 m-2"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text className="text-sm mb-2" style={{ color: colors.muted }}>
        {icon} {label}
      </Text>
      <Text className="text-2xl font-bold" style={{ color: colors.primary }}>
        {value}
      </Text>
    </View>
  );

  return (
    <ScreenContainer
      containerClassName="flex-1"
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4 gap-6">
          {/* Header */}
          <View className="gap-2">
            <Text className="text-3xl font-bold" style={{ color: colors.foreground }}>
              Dashboard
            </Text>
            <Text style={{ color: colors.muted }}>
              Live Store Metrics
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

          {/* Loading State */}
          {loading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* Main Telemetry Card */}
              <View
                className="rounded-2xl p-6 gap-4"
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 2,
                  borderColor: colors.primary,
                }}
              >
                <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                  Today's Performance
                </Text>
                
                <View className="gap-3">
                  <View className="flex-row justify-between items-center">
                    <Text style={{ color: colors.muted }}>💰 Revenue</Text>
                    <Text className="text-xl font-bold" style={{ color: colors.primary }}>
                      ${metrics?.revenueToday || 0}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-center">
                    <Text style={{ color: colors.muted }}>👥 Active Users</Text>
                    <Text className="text-xl font-bold" style={{ color: colors.primary }}>
                      {metrics?.activeUsers || 0}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-center">
                    <Text style={{ color: colors.muted }}>🖥️ Server Status</Text>
                    <Text className="text-sm font-semibold" style={{ color: '#22C55E' }}>
                      {metrics?.serverStatus || 'Unknown'}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-center">
                    <Text style={{ color: colors.muted }}>🗄️ Database</Text>
                    <Text className="text-sm font-semibold" style={{ color: '#22C55E' }}>
                      {metrics?.databaseHealth || 'Unknown'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Quick Stats */}
              <View className="gap-2">
                <Text className="text-lg font-semibold" style={{ color: colors.foreground }}>
                  Quick Stats
                </Text>
                <View className="flex-row flex-wrap">
                  <MetricCard label="Total Orders" value={metrics?.totalOrders || 0} icon="📦" />
                  <MetricCard label="Products" value={metrics?.totalProducts || 0} icon="🛍️" />
                </View>
              </View>

              {/* Refresh Button */}
              <TouchableOpacity
                onPress={onRefresh}
                style={{ backgroundColor: colors.primary }}
                className="rounded-lg py-3 items-center mt-4"
              >
                <Text className="font-semibold" style={{ color: colors.background }}>
                  🔄 Refresh Metrics
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
