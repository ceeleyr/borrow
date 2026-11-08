import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { services } from '@/services/client';
import type { Category } from '@/services/types';
import { colors, radius, space } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';

type CategoryPickerProps = {
  label?: string;
  value: string;
  onChange: (category: string) => void;
  error?: string;
  testID?: string;
};

export function CategoryPicker({
  label = 'Kategori',
  value,
  onChange,
  error,
  testID = 'category-picker',
}: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  // Mode "Add Category"
  const [isAdding, setIsAdding] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await services.categories.list();
      setCategories(data);
    } catch {
      // Fallback silently if offline or initial load fails
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory() {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setAddError('Nama kategori tidak boleh kosong');
      return;
    }
    if (trimmed.length > 50) {
      setAddError('Nama kategori maksimal 50 karakter');
      return;
    }

    setSavingCat(true);
    setAddError(null);
    try {
      const created = await services.categories.create(trimmed);
      setCategories((prev) => {
        if (prev.some((c) => c.name.toLowerCase() === created.name.toLowerCase())) {
          return prev;
        }
        return [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'id'));
      });
      onChange(created.name);
      setIsAdding(false);
      setNewCatName('');
      setModalVisible(false);
    } catch (e) {
      setAddError(getErrorMessage(e, 'Gagal menambahkan kategori'));
    } finally {
      setSavingCat(false);
    }
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>

      {/* Trigger Button Dropdown */}
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        activeOpacity={0.7}
        onPress={() => {
          setSearch('');
          setIsAdding(false);
          setAddError(null);
          setModalVisible(true);
        }}
        style={[styles.trigger, error ? { borderColor: colors.danger } : null]}
      >
        <Text
          style={[styles.triggerText, !value && { color: colors.faint }]}
          numberOfLines={1}
        >
          {value || 'Pilih Kategori...'}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Dropdown Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Kategori</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Mode Tambah Kategori */}
            {isAdding ? (
              <View style={styles.addSection}>
                <Text style={styles.addSectionTitle}>+ Tambah Kategori Baru</Text>
                {addError ? <Text style={styles.addErrorText}>{addError}</Text> : null}
                <TextInput
                  value={newCatName}
                  onChangeText={(t) => {
                    setNewCatName(t);
                    if (addError) setAddError(null);
                  }}
                  placeholder="Nama kategori baru..."
                  placeholderTextColor={colors.faint}
                  autoFocus
                  style={styles.addInput}
                  testID="new-category-input"
                />
                <View style={styles.addActions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnCancel]}
                    onPress={() => {
                      setIsAdding(false);
                      setNewCatName('');
                      setAddError(null);
                    }}
                    disabled={savingCat}
                  >
                    <Text style={styles.btnCancelText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSave]}
                    onPress={handleAddCategory}
                    disabled={savingCat}
                    testID="save-category-btn"
                  >
                    {savingCat ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.btnSaveText}>Simpan Kategori</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {/* Tombol Add Category */}
                <TouchableOpacity
                  style={styles.addCategoryTrigger}
                  onPress={() => {
                    setIsAdding(true);
                    setNewCatName('');
                    setAddError(null);
                  }}
                  testID="add-category-button"
                >
                  <Text style={styles.addCategoryTriggerText}>
                    ➕ Tambah Kategori Baru (Add Category)
                  </Text>
                </TouchableOpacity>

                {/* Kolom Pencarian Kategori */}
                {categories.length > 4 && (
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Cari kategori..."
                    placeholderTextColor={colors.faint}
                    style={styles.searchInput}
                  />
                )}

                {loading ? (
                  <View style={{ padding: 24, alignItems: 'center' }}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : (
                  <FlatList
                    data={filteredCategories}
                    keyExtractor={(item) => item.id || item.name}
                    style={{ maxHeight: 280 }}
                    keyboardShouldPersistTaps="handled"
                    ListHeaderComponent={
                      <TouchableOpacity
                        style={[
                          styles.categoryItem,
                          !value && styles.categoryItemActive,
                        ]}
                        onPress={() => {
                          onChange('');
                          setModalVisible(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.categoryItemText,
                            !value && styles.categoryItemTextActive,
                            { fontStyle: 'italic', color: colors.muted },
                          ]}
                        >
                          — Tanpa Kategori —
                        </Text>
                        {!value && <Text style={styles.checkMark}>✓</Text>}
                      </TouchableOpacity>
                    }
                    renderItem={({ item }) => {
                      const isSelected =
                        value.trim().toLowerCase() === item.name.trim().toLowerCase();
                      return (
                        <TouchableOpacity
                          style={[
                            styles.categoryItem,
                            isSelected && styles.categoryItemActive,
                          ]}
                          onPress={() => {
                            onChange(item.name);
                            setModalVisible(false);
                          }}
                          testID={`cat-option-${item.name}`}
                        >
                          <Text
                            style={[
                              styles.categoryItemText,
                              isSelected && styles.categoryItemTextActive,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {isSelected && <Text style={styles.checkMark}>✓</Text>}
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <Text style={styles.emptyText}>
                        {search ? 'Kategori tidak ditemukan' : 'Belum ada kategori'}
                      </Text>
                    }
                  />
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  trigger: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerText: { fontSize: 15, color: colors.text, flex: 1 },
  chevron: { fontSize: 12, color: colors.muted, marginLeft: 8 },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: space.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  closeBtn: { fontSize: 18, color: colors.muted, fontWeight: '700' },
  addCategoryTrigger: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: space.md,
    alignItems: 'center',
    marginBottom: space.md,
  },
  addCategoryTriggerText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  searchInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: space.sm,
    color: colors.text,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
  categoryItemActive: {
    backgroundColor: '#eff6ff',
  },
  categoryItemText: { fontSize: 15, color: colors.text },
  categoryItemTextActive: { fontWeight: '700', color: colors.primary },
  checkMark: { fontSize: 15, fontWeight: '700', color: colors.primary },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    paddingVertical: 20,
  },
  addSection: {
    paddingVertical: 6,
  },
  addSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: space.sm,
  },
  addErrorText: {
    color: colors.danger,
    fontSize: 12,
    marginBottom: 6,
  },
  addInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    marginBottom: space.md,
  },
  addActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.sm,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: space.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#f3f4f6',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  btnSave: {
    backgroundColor: colors.primary,
    minWidth: 100,
  },
  btnSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
