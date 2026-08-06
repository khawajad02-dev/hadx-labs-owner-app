import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { ScreenContainer } from '@/components/screen-container';
import { apiPost } from '@/lib/api-client';
import { useColors } from '@/hooks/use-colors';
import { useRouter } from 'expo-router';

export default function AddProductScreen() {
  const colors = useColors();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    sku: '',
    price: '',
    description: '',
    imageUrl: '',
    category: '',
    stockQuantity: '10',
  });

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!form.title || !form.sku || !form.price) {
      Alert.alert('Error', 'Title, SKU, and Price are required');
      return;
    }

    setLoading(true);
    try {
      await apiPost('/products', {
        ...form,
        status,
        price: parseFloat(form.price),
        stockQuantity: parseInt(form.stockQuantity, 10),
      });
      Alert.alert('Success', `Product ${status === 'PUBLISHED' ? 'published' : 'saved as draft'} successfully`);
      router.back();
    } catch (error: any) {
      console.error('Save product error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const InputField = ({ label, value, onChangeText, keyboardType = 'default', multiline = false }: any) => (
    <View className="mb-4">
      <Text className="text-sm font-semibold mb-1" style={{ color: colors.muted }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        className="rounded-lg p-3"
        style={{
          backgroundColor: colors.surface,
          color: colors.foreground,
          borderWidth: 1,
          borderColor: colors.border,
          textAlignVertical: multiline ? 'top' : 'center',
          minHeight: multiline ? 100 : 50,
        }}
        placeholderTextColor={colors.muted}
      />
    </View>
  );

  return (
    <ScreenContainer containerClassName="flex-1" className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-2xl font-bold" style={{ color: colors.foreground }}>
            Add Product
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={{ color: colors.primary }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <InputField
          label="Product Title"
          value={form.title}
          onChangeText={(text: string) => setForm({ ...form, title: text })}
        />
        <InputField
          label="SKU"
          value={form.sku}
          onChangeText={(text: string) => setForm({ ...form, sku: text })}
        />
        <View className="flex-row gap-4">
          <View className="flex-1">
            <InputField
              label="Price ($)"
              value={form.price}
              onChangeText={(text: string) => setForm({ ...form, price: text })}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <InputField
              label="Stock Quantity"
              value={form.stockQuantity}
              onChangeText={(text: string) => setForm({ ...form, stockQuantity: text })}
              keyboardType="numeric"
            />
          </View>
        </View>
        <InputField
          label="Category"
          value={form.category}
          onChangeText={(text: string) => setForm({ ...form, category: text })}
        />
        <InputField
          label="Image URL"
          value={form.imageUrl}
          onChangeText={(text: string) => setForm({ ...form, imageUrl: text })}
        />
        <InputField
          label="Description"
          value={form.description}
          onChangeText={(text: string) => setForm({ ...form, description: text })}
          multiline
        />

        <View className="flex-row gap-4 mt-6">
          <TouchableOpacity
            className="flex-1 rounded-xl p-4 items-center"
            style={{ 
              backgroundColor: colors.surface, 
              borderWidth: 1, 
              borderColor: colors.border,
              opacity: loading ? 0.7 : 1 
            }}
            onPress={() => handleSave('DRAFT')}
            disabled={loading}
          >
            <Text className="font-bold" style={{ color: colors.foreground }}>
              Save Draft
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 rounded-xl p-4 items-center"
            style={{ 
              backgroundColor: colors.primary,
              opacity: loading ? 0.7 : 1 
            }}
            onPress={() => handleSave('PUBLISHED')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text className="font-bold" style={{ color: colors.background }}>
                Publish Live
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
