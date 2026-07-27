import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, RefreshControl, Alert } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { apiGet, apiDelete } from '@/lib/api-client';
import { useColors } from '@/hooks/use-colors';
import { useRouter } from 'expo-router';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  featured: boolean;
  trending: boolean;
  flashSale: boolean;
}

export default function ProductsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    try {
      setError('');
      const response = await apiGet('/products');
      setProducts(response.data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await apiDelete(`/products/${productId}`);
              setProducts(products.filter(p => p.id !== productId));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete product');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const ProductCard = ({ product }: { product: Product }) => (
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
            {product.title}
          </Text>
          <Text style={{ color: colors.muted }} numberOfLines={1}>
            {product.category}
          </Text>
        </View>
        <Text className="text-lg font-bold" style={{ color: colors.primary }}>
          ${product.price}
        </Text>
      </View>

      <Text style={{ color: colors.muted }} numberOfLines={2} className="text-sm mb-2">
        {product.description}
      </Text>

      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row gap-2">
          {product.featured && (
            <View className="bg-yellow-500 rounded px-2 py-1">
              <Text className="text-xs font-semibold text-black">Featured</Text>
            </View>
          )}
          {product.trending && (
            <View className="bg-blue-500 rounded px-2 py-1">
              <Text className="text-xs font-semibold text-white">Trending</Text>
            </View>
          )}
          {product.flashSale && (
            <View className="bg-red-500 rounded px-2 py-1">
              <Text className="text-xs font-semibold text-white">Flash Sale</Text>
            </View>
          )}
        </View>
        <Text style={{ color: colors.muted }} className="text-sm">
          Stock: {product.stock}
        </Text>
      </View>

      <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 rounded py-2 items-center"
              style={{ backgroundColor: colors.primary }}
              onPress={() => Alert.alert('Edit', `Editing product: ${product.title}`)}
            >
              <Text className="font-semibold" style={{ color: colors.background }}>
                Edit
              </Text>
            </TouchableOpacity>
        <TouchableOpacity
          className="flex-1 rounded py-2 items-center"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, borderColor: '#EF4444' }}
          onPress={() => handleDeleteProduct(product.id)}
        >
          <Text className="font-semibold" style={{ color: '#FCA5A5' }}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <View className="gap-4 mb-4">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-3xl font-bold" style={{ color: colors.foreground }}>
                  Products
                </Text>
                <Text style={{ color: colors.muted }}>
                  {products.length} products
                </Text>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: colors.primary }}
                className="rounded-lg px-4 py-2"
                onPress={() => Alert.alert('Add Product', 'Product form would open here')}
              >
                <Text className="font-semibold" style={{ color: colors.background }}>
                  + Add
                </Text>
              </TouchableOpacity>
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
                No products available
              </Text>
            </View>
          )
        }
      />
    </ScreenContainer>
  );
}
