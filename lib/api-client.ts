import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";

import { OWNER_ADMIN_BASE_URL, OWNER_SESSION_KEY } from "@/constants/owner-api";

let apiClient: AxiosInstance | null = null;

export const createApiClient = async (): Promise<AxiosInstance> => {
  if (apiClient) {
    return apiClient;
  }

  const sessionToken = await SecureStore.getItemAsync(OWNER_SESSION_KEY);

  apiClient = axios.create({
    baseURL: OWNER_ADMIN_BASE_URL,
    timeout: 15000,
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken && { Authorization: `Bearer ${sessionToken}` }),
    },
  });

  apiClient.interceptors.request.use(
    async (config) => {
      const token = await SecureStore.getItemAsync(OWNER_SESSION_KEY);
      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error("Owner API error:", error.response?.status, error.response?.data);
      return Promise.reject(error);
    },
  );

  return apiClient;
};

export const getApiClient = (): AxiosInstance => {
  if (!apiClient) {
    throw new Error("API client not initialized. Call createApiClient first.");
  }
  return apiClient;
};

export const apiGet = async (url: string, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.get(url, config);
};

export const apiPost = async (url: string, data?: unknown, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.post(url, data, config);
};

export const apiUpload = async (url: string, data: unknown) => {
  const client = await createApiClient();
  return client.post(url, data, {
    timeout: 120000,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const apiPut = async (url: string, data?: unknown, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.put(url, data, config);
};

export const apiDelete = async (url: string, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.delete(url, config);
};

export const apiPatch = async (url: string, data?: unknown, config?: AxiosRequestConfig) => {
  const client = await createApiClient();
  return client.patch(url, data, config);
};
