export type Role = 'user' | 'admin';
export type BorrowStatus = 'pending' | 'approved' | 'borrowed' | 'returned' | 'rejected' | 'cancelled';
export type ItemStatus = 'available' | 'borrowed' | 'unavailable';
export type ItemCondition = 'good' | 'fair' | 'poor';
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type RequestAction = 'approve' | 'reject' | 'pickup' | 'return' | 'cancel';

export const BORROW_STATUSES: BorrowStatus[] = ['pending', 'approved', 'borrowed', 'returned', 'rejected', 'cancelled'];

export const BORROW_STATUS_LABEL: Record<BorrowStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  borrowed: 'Dipinjam',
  returned: 'Dikembalikan',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

export const BORROW_STATUS_HINT: Record<BorrowStatus, string> = {
  pending: 'Menunggu persetujuan admin',
  approved: 'Disetujui — silakan ambil barang dari admin',
  borrowed: 'Barang sedang kamu pinjam',
  returned: 'Barang sudah dikembalikan',
  rejected: 'Permintaan ditolak admin',
  cancelled: 'Permintaan dibatalkan',
};

export function borrowTone(status: BorrowStatus, overdue = false): Tone {
  if (overdue) return 'danger';
  switch (status) {
    case 'pending':
      return 'warning';
    case 'approved':
      return 'info';
    case 'borrowed':
      return 'info';
    case 'returned':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function borrowLabel(status: BorrowStatus, overdue = false): string {
  return overdue ? 'Terlambat' : BORROW_STATUS_LABEL[status];
}

/** Aksi yang boleh dilakukan pada sebuah request, menurut role & status (cermin aturan backend). */
export function availableActions(role: Role, status: BorrowStatus): RequestAction[] {
  if (role === 'admin') {
    switch (status) {
      case 'pending':
        return ['approve', 'reject'];
      case 'approved':
        return ['pickup', 'cancel'];
      case 'borrowed':
        return ['return'];
      default:
        return [];
    }
  }
  return status === 'pending' ? ['cancel'] : [];
}

export const ACTION_LABEL: Record<RequestAction, string> = {
  approve: 'Setujui',
  reject: 'Tolak',
  pickup: 'Catat Pengambilan',
  return: 'Catat Pengembalian',
  cancel: 'Batalkan',
};

export const ACTION_CONFIRM: Record<RequestAction, string> = {
  approve: 'Setujui permintaan ini? Stok barang akan ditahan.',
  reject: 'Tolak permintaan ini?',
  pickup: 'Catat bahwa peminjam sudah mengambil barang?',
  return: 'Catat bahwa barang sudah dikembalikan? Stok akan bertambah kembali.',
  cancel: 'Batalkan permintaan ini?',
};

export const CONDITION_LABEL: Record<ItemCondition, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Kurang',
};

export const CONDITIONS: ItemCondition[] = ['good', 'fair', 'poor'];

export function itemStatusInfo(item: { status: ItemStatus; available_quantity: number; quantity: number }): {
  label: string;
  tone: Tone;
  canBorrow: boolean;
} {
  if (item.status === 'unavailable') return { label: 'Tidak tersedia', tone: 'neutral', canBorrow: false };
  if (item.available_quantity <= 0) return { label: 'Sedang dipinjam', tone: 'danger', canBorrow: false };
  return { label: 'Tersedia', tone: 'success', canBorrow: true };
}
