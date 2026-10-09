import { api } from './api';

export async function createBorrowRequest(itemId: string) {
  const response = await api.post('/borrow-requests', { item_id: itemId });
  return response.data.data;
}