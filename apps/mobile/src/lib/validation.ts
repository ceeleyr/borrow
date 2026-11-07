import { isValidDateString, validateLoanDates } from './dates.ts';
import type { ItemCondition } from './status.ts';

export type FormErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginForm(v: { email: string; password: string }): FormErrors<'email' | 'password'> {
  const errors: FormErrors<'email' | 'password'> = {};
  if (!v.email.trim()) errors.email = 'Email wajib diisi';
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Format email tidak valid';
  if (!v.password) errors.password = 'Password wajib diisi';
  return errors;
}

export function validateRegisterForm(v: {
  fullName: string;
  email: string;
  password: string;
}): FormErrors<'fullName' | 'email' | 'password'> {
  const errors: FormErrors<'fullName' | 'email' | 'password'> = {};
  if (!v.fullName.trim()) errors.fullName = 'Nama wajib diisi';
  if (!v.email.trim()) errors.email = 'Email wajib diisi';
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = 'Format email tidak valid';
  if (v.password.length < 6) errors.password = 'Password minimal 6 karakter';
  return errors;
}

export type ItemFormInput = {
  name: string;
  description: string;
  category: string;
  condition: ItemCondition;
  quantity: string;
  imageUrl: string;
  unavailable: boolean;
};

export type ItemPayload = {
  name: string;
  description: string | null;
  category: string | null;
  condition: ItemCondition;
  quantity: number;
  image_url: string | null;
  status: 'available' | 'unavailable';
};

export function validateItemForm(v: ItemFormInput): {
  errors: FormErrors<'name' | 'quantity' | 'imageUrl'>;
  payload: ItemPayload | null;
} {
  const errors: FormErrors<'name' | 'quantity' | 'imageUrl'> = {};
  const name = v.name.trim();
  if (!name) errors.name = 'Nama barang wajib diisi';
  else if (name.length > 100) errors.name = 'Nama maksimal 100 karakter';

  const qty = Number(v.quantity);
  if (!/^\d+$/.test(v.quantity.trim()) || !Number.isInteger(qty) || qty < 1) {
    errors.quantity = 'Jumlah harus bilangan bulat minimal 1';
  }

  const imageUrl = v.imageUrl.trim();
  if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) errors.imageUrl = 'URL gambar harus diawali http:// atau https://';

  if (Object.keys(errors).length > 0) return { errors, payload: null };
  return {
    errors,
    payload: {
      name,
      description: v.description.trim() || null,
      category: v.category.trim() || null,
      condition: v.condition,
      quantity: qty,
      image_url: imageUrl || null,
      status: v.unavailable ? 'unavailable' : 'available',
    },
  };
}

export function validateBorrowForm(v: {
  quantity: number;
  maxQuantity: number;
  borrowDate: string;
  dueDate: string;
  today: string;
}): string | null {
  if (!Number.isInteger(v.quantity) || v.quantity < 1) return 'Jumlah minimal 1';
  if (v.quantity > v.maxQuantity) return `Stok tersedia hanya ${v.maxQuantity}`;
  if (!isValidDateString(v.borrowDate) || !isValidDateString(v.dueDate)) return 'Tanggal harus format YYYY-MM-DD';
  return validateLoanDates(v.borrowDate, v.dueDate, v.today);
}
