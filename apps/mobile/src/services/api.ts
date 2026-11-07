import type { AxiosInstance } from 'axios';
import type { BorrowInput, BorrowRequest, Item, ItemInput, Profile, Stats } from './types.ts';
import type { BorrowStatus, Role } from '../lib/status.ts';

type RequestFilters = { status?: BorrowStatus | ''; search?: string };

/** Semua pemanggilan endpoint backend, dibungkus agar screen tidak perlu tahu detail HTTP. */
export function createApiServices(http: AxiosInstance) {
  const data = <T>(res: { data: { data: T } }) => res.data.data;

  return {
    auth: {
      async login(email: string, password: string) {
        return data<{ user: Profile; access_token: string }>(await http.post('/auth/login', { email, password }));
      },
      async register(email: string, password: string, full_name: string) {
        return data<Profile>(await http.post('/auth/register', { email, password, full_name }));
      },
      async me() {
        return data<Profile>(await http.get('/auth/me'));
      },
      async updateProfile(payload: { full_name?: string; avatar_url?: string | null }) {
        return data<Profile>(await http.put('/users/me', payload));
      },
    },

    items: {
      async list(filters: { search?: string; category?: string; status?: string } = {}) {
        return data<Item[]>(await http.get('/items', { params: clean(filters) }));
      },
      async get(id: string) {
        return data<Item>(await http.get(`/items/${id}`));
      },
      async create(payload: ItemInput) {
        return data<Item>(await http.post('/items', payload));
      },
      async update(id: string, payload: Partial<ItemInput>) {
        return data<Item>(await http.put(`/items/${id}`, payload));
      },
      async remove(id: string) {
        await http.delete(`/items/${id}`);
      },
    },

    borrow: {
      async create(payload: BorrowInput) {
        return data<BorrowRequest>(await http.post('/borrow-requests', payload));
      },
      async mine(filters: RequestFilters = {}) {
        return data<BorrowRequest[]>(await http.get('/borrow-requests/mine', { params: clean({ status: filters.status }) }));
      },
      async get(id: string) {
        return data<BorrowRequest>(await http.get(`/borrow-requests/${id}`));
      },
      async cancel(id: string) {
        return data<BorrowRequest>(await http.patch(`/borrow-requests/${id}/cancel`, {}));
      },
    },

    admin: {
      async stats() {
        return data<Stats>(await http.get('/admin/stats'));
      },
      async users() {
        return data<Profile[]>(await http.get('/admin/users'));
      },
      async setRole(id: string, role: Role) {
        return data<Profile>(await http.patch(`/admin/users/${id}/role`, { role }));
      },
      async deleteUser(id: string) {
        await http.delete(`/admin/users/${id}`);
      },
      async requests(filters: RequestFilters = {}) {
        return data<BorrowRequest[]>(await http.get('/admin/borrow-requests', { params: clean(filters) }));
      },
      async approve(id: string, admin_note?: string) {
        return data<BorrowRequest>(await http.patch(`/admin/borrow-requests/${id}/approve`, { admin_note }));
      },
      async reject(id: string, admin_note?: string) {
        return data<BorrowRequest>(await http.patch(`/admin/borrow-requests/${id}/reject`, { admin_note }));
      },
      async pickup(id: string) {
        return data<BorrowRequest>(await http.patch(`/admin/borrow-requests/${id}/pickup`, {}));
      },
      async returnItem(id: string, admin_note?: string) {
        return data<BorrowRequest>(await http.patch(`/admin/borrow-requests/${id}/return`, { admin_note }));
      },
      async cancel(id: string, admin_note?: string) {
        return data<BorrowRequest>(await http.patch(`/admin/borrow-requests/${id}/cancel`, { admin_note }));
      },
    },
  };
}

export type ApiServices = ReturnType<typeof createApiServices>;

/** Buang param kosong supaya tidak terkirim sebagai ?search= */
function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
