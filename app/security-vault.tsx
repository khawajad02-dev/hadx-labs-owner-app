import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { ScreenContainer } from '@/components/screen-container';
import { useRouter } from 'expo-router';

const API_BASE_URL = 'https://hadx-labs-xeo7.vercel.app/api/admin';
const SECURE_KEY = 'x-admin-secret';
const MASTER_KEY = 'HADX_SEC_9842_CYBER_SHIELD';

export default function SecurityVaultScreen() {
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const validateAndSaveKey = async () => {
    if (!keyInput.trim()) {
      setError('Please enter the Master Key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Test handshake with the API
      const response = await axios.post(
        `${API_BASE_URL}/products`,
        {},
        {
          headers: {
            'x-admin-secret': keyInput,
          },
          timeout: 10000,
        }
      );

      // If successful, save the key to SecureStore
      await SecureStore.setItemAsync(SECURE_KEY, keyInput);
      
      // Navigate to main app
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Key validation error:', err);
      setError('Invalid Master Key. Please try again.');
      setKeyInput('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-black" className="flex-1 justify-center px-6">
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="gap-8">
          {/* Header */}
          <View className="items-center gap-4">
            <Text className="text-4xl font-bold text-yellow-500">🔐</Text>
            <Text className="text-3xl font-bold text-white text-center">
              Security Authorization Vault
            </Text>
            <Text className="text-base text-gray-400 text-center">
              Enter your Master Key to unlock the HADX LABS Owner Dashboard
            </Text>
          </View>

          {/* Glass Card */}
          <View
            className="bg-gray-900 border border-yellow-500 rounded-2xl p-8"
            style={{
              borderWidth: 1,
              borderColor: '#D4AF37',
              backgroundColor: 'rgba(26, 26, 26, 0.8)',
            }}
          >
            {/* Input Field */}
            <View className="gap-3 mb-6">
              <Text className="text-sm font-semibold text-yellow-500">Master Key</Text>
              <TextInput
                placeholder="Enter Master Key"
                placeholderTextColor="#666"
                value={keyInput}
                onChangeText={(text) => {
                  setKeyInput(text);
                  setError('');
                }}
                secureTextEntry={true}
                editable={!loading}
                className="bg-black border border-yellow-500 rounded-lg px-4 py-3 text-white text-base"
                style={{
                  borderWidth: 1,
                  borderColor: '#D4AF37',
                }}
              />
            </View>

            {/* Error Message */}
            {error ? (
              <View className="bg-red-900 border border-red-500 rounded-lg p-3 mb-6">
                <Text className="text-red-200 text-sm">{error}</Text>
              </View>
            ) : null}

            {/* Validate Button */}
            <TouchableOpacity
              onPress={validateAndSaveKey}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#666' : '#D4AF37',
                opacity: loading ? 0.6 : 1,
              }}
              className="rounded-lg py-3 items-center"
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text className="text-black font-bold text-base">Unlock Dashboard</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <Text className="text-xs text-gray-400 text-center">
              Your Master Key is encrypted and stored securely on your device using Expo SecureStore.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
