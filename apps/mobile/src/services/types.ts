import type { BorrowStatus, ItemCondition, ItemStatus, Role } from '../lib/status.ts';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  created_at?: string;
};

export type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  condition: ItemCondition;
  quantity: number;
  available_quantity: number;
  status: ItemStatus;
  image_url: string | null;
  created_at: string;
};

export type BorrowRequest = {
  id: string;
  item_id: string;
  borrower_id: string;
  quantity: number;
  borrow_date: string;
  due_date: string;
  note: string | null;
  admin_note: string | null;
  status: BorrowStatus;
  is_overdue: boolean;
  requested_at: string;
  approved_at: string | null;
  picked_up_at: string | null;
  returned_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  item: { id: string; name: string; image_url: string | null; category: string | null } | null;
  borrower: { id: string; full_name: string; email: string } | null;
};

export type Stats = {
  totalUsers: number;
  totalItems: number;
  availableItems: number;
  totalRequests: number;
  pendingRequests: number;
  awaitingPickup: number;
  activeBorrows: number;
  overdue: number;
};

export type ItemInput = {
  name: string;
  description: string | null;
  category: string | null;
  condition: ItemCondition;
  quantity: number;
  image_url: string | null;
  status: 'available' | 'unavailable';
};

export type BorrowInput = {
  item_id: string;
  quantity: number;
  borrow_date: string;
  due_date: string;
  note?: string;
};
