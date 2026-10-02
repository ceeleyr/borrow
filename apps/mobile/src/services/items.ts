import { api } from './api';

export type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  condition: string;
  status: string;
  image_url: string | null;
  owner: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
};

export async function getItems(): Promise<Item[]> {
  const response = await api.get('/items');
  return response.data.data;
}

export async function getItemById(id: string): Promise<Item> {
  const response = await api.get(`/items/${id}`);
  return response.data.data;
}