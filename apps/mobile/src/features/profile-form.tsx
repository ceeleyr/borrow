import { useState } from 'react';
import { Button, ErrorBanner, Field, InfoBanner } from '@/components/ui';
import { getErrorMessage } from '@/lib/errors';
import { validateProfileForm } from '@/lib/validation';
import type { FormErrors } from '@/lib/validation';

type ProfileFormProps = {
  initialName: string;
  /** Menyimpan nama baru ke server. Melempar error bila gagal. */
  onSave: (fullName: string) => Promise<void>;
};

/** Form edit nama profil: validasi input, status simpan, dan pesan sukses/gagal. */
export function ProfileForm({ initialName, onSave }: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [errors, setErrors] = useState<FormErrors<'fullName'>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    setServerError(null);
    setSaved(false);
    const validation = validateProfileForm({ fullName: name });
    setErrors(validation);
    if (validation.fullName) return;

    setSaving(true);
    try {
      await onSave(name);
      setSaved(true);
    } catch (e) {
      setServerError(getErrorMessage(e, 'Gagal menyimpan'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ErrorBanner message={serverError} />
      <InfoBanner message={saved ? 'Profil tersimpan' : null} />
      <Field
        label="Nama lengkap"
        value={name}
        error={errors.fullName}
        onChangeText={(t) => {
          setName(t);
          setSaved(false);
          if (errors.fullName) setErrors({});
        }}
        testID="profile-name"
      />
      <Button title="Simpan" onPress={submit} loading={saving} testID="profile-save" />
    </>
  );
}
