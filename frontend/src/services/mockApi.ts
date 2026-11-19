import type { Prediction, PredictionRequest } from '../types';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const mockPredictionService = {
  predict(input: PredictionRequest): Promise<Prediction> {
    return request<Prediction>('/predict', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
  },
};

export const api = {
  health: () => request<Record<string, unknown>>('/health'),
  modelStatus: () => request<Record<string, unknown>>('/model/status'),
  modelMetrics: () => request<any>('/model/metrics'),
  train: () => request<{status:string;message:string}>('/train', { method: 'POST' }),
  trainStatus: () => request<any>('/train/status'),
  monitoring: () => request<any>('/monitoring/summary'),
  predictions: () => request<Prediction[]>('/predictions'),
};

export function downloadFile(name: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}
