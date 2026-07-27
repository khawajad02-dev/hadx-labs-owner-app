import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://hadx-labs-xeo7.vercel.app/api/admin';

let apiClient: AxiosInstance | null = null;

export const createApiClient = async (): Promise<AxiosInstance> => {
  if (apiClient) {
    return apiClient;
  }

  // Get the stored secret key
  const secretKey = await SecureStore.getItemAsync('x-admin-secret');

  apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      ...(secretKey && { 'x-admin-secret': secretKey }),
    },
  });

  // Add request interceptor to inject the secret key
  apiClient.interceptors.request.use(
    async (config) => {
      const key = await SecureStore.getItemAsync('x-admin-secret');
      if (key) {
        config.headers['x-admin-secret'] = key;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Add response interceptor for error handling
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', error.response?.status, error.response?.data);
      return Promise.reject(error);
    }
  );

  return apiClient;
};

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    throw new Error('API client not initialized. Call createApiClient first.');
  }
  return apiClient;
};

// Helper functions for common API operations
export const apiGet = async (url: string, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.get(url, config);
};

export const apiPost = async (url: string, data?: any, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.post(url, data, config);
};

export const apiPut = async (url: string, data?: any, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.put(url, data, config);
};

export const apiDelete = async (url: string, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.delete(url, config);
};

export const apiPatch = async (url: string, data?: any, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.patch(url, data, config);
};
