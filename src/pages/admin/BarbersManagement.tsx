import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { Modal } from '../../components/ui/modal';
import {
  Clock3,
  Edit2,
  KeyRound,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Barber } from '../../context/BookingContext';

const BarbersManagement = () => {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'danger' | 'warning' | 'success';
    title: string;
    description: string;
    onConfirm: () => void;
    cancelText?: string;
    confirmText?: string;
  }>({
    isOpen: false,
    type: 'warning',
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const closeModal = () => setModalState((prev) => ({ ...prev, isOpen: false }));

  const fetchBarbers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('barbers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error('Personeller yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBarbers();
  }, []);

  const resetForm = () => {
    setName('');
    setPin('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEditClick = (barber: Barber) => {
    setName(barber.name);
    setPin(barber.pin || '');
    setEditingId(barber.id);
    setIsAdding(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const payload = {
      name,
      pin: pin || null,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('barbers')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('barbers').insert([payload]);

        if (error) throw error;
      }

      resetForm();
      void fetchBarbers();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Başarılı',
        description: 'Personel başarıyla kaydedildi.',
        onConfirm: closeModal,
        cancelText: '',
      });
    } catch (error) {
      console.error('Personel kaydedilirken hata:', error);
      const supabaseError = error as { code?: string; message?: string };

      setModalState({
        isOpen: true,
        type: 'danger',
        title: 'Hata',
        description:
          supabaseError?.code === '42501'
            ? 'Yetki hatası: Personel eklemek için patron hesabıyla giriş yapmalısınız.'
            : supabaseError?.message || 'Personel kaydedilirken bir hata oluştu.',
        onConfirm: closeModal,
        cancelText: '',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setModalState({
      isOpen: true,
      type: 'danger',
      title: 'Personeli Sil',
      description:
        'Bu personeli kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmText: 'Evet, Sil',
      cancelText: 'İptal',
      onConfirm: () => void executeDelete(id),
    });
  };

  const executeDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('barbers').delete().eq('id', id);

      if (error) throw error;
      void fetchBarbers();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Başarılı',
        description: 'Personel başarıyla silindi.',
        onConfirm: closeModal,
        cancelText: '',
      });
    } catch (error) {
      console.error('Personel silinirken hata:', error);
      setModalState({
        isOpen: true,
        type: 'danger',
        title: 'Hata',
        description: 'Personel silinirken bir hata oluştu.',
        onConfirm: closeModal,
        cancelText: '',
      });
    }
  };

  const filteredBarbers = barbers.filter((barber) =>
    barber.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const withPin = barbers.filter((barber) => Boolean(barber.pin)).length;
  const withHours = barbers.filter((barber) => (barber.working_hours?.length ?? 0) > 0).length;

  const getInitials = (value: string) =>
    value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brass-dark">
            Yönetim
          </p>
          <h1 className="mt-1 font-display text-3xl leading-tight text-ink md:text-4xl">
            Personeller
          </h1>
          <p className="mt-1 text-sm text-ink/45">
            Ekibi, giriş PIN'lerini ve mesai durumunu yönetin.
          </p>
        </div>

        <Button
          onClick={() => setIsAdding(true)}
          className="h-11 rounded-full bg-ink px-5 text-xs font-semibold text-cream hover:bg-ink-soft"
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Yeni Personel
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          { icon: UserRound, label: 'Toplam personel', value: barbers.length },
          { icon: KeyRound, label: 'Giriş yetkisi olan', value: withPin },
          { icon: Clock3, label: 'Mesaisi tanımlı', value: withHours },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brass/10 text-brass-dark">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-ink/35">
                {item.label}
              </p>
              <p className="mt-0.5 font-display text-xl leading-none text-ink">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Personel ara..."
          className="h-11 rounded-xl border-ink/10 bg-white pl-10 text-sm focus-visible:ring-brass"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-2xl border border-ink/10 bg-white/60" />
          ))}
        </div>
      ) : filteredBarbers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brass/10 text-brass-dark">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-semibold text-ink">
            {barbers.length === 0 ? 'Henüz personel eklenmemiş.' : 'Aramanızla eşleşen personel yok.'}
          </p>
          <p className="mt-1 text-xs text-ink/45">
            {barbers.length === 0
              ? 'İlk personeli ekleyerek ekibi oluşturun.'
              : 'Farklı bir arama deneyin.'}
          </p>
          {barbers.length === 0 && (
            <Button
              onClick={() => setIsAdding(true)}
              className="mt-4 h-10 rounded-full bg-ink px-5 text-xs font-semibold text-cream hover:bg-ink-soft"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Yeni Personel
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredBarbers.map((barber) => {
            const hours = barber.working_hours?.length ?? 0;

            return (
              <article
                key={barber.id}
                className="group flex flex-col rounded-2xl border border-ink/10 bg-white p-5 transition-all hover:border-brass/40 hover:shadow-[0_20px_45px_-30px_rgba(23,19,16,0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-lg text-cream">
                    {getInitials(barber.name)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditClick(barber)}
                      aria-label={`${barber.name} personelini düzenle`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-ink/5 hover:text-ink"
                    >
                      <Edit2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(barber.id)}
                      aria-label={`${barber.name} personelini sil`}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <h3 className="mt-4 font-display text-2xl leading-tight text-ink">{barber.name}</h3>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/35">
                  Usta Berber
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {barber.pin ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink/[0.04] px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink/70">
                      <KeyRound className="h-3 w-3 text-brass-dark" aria-hidden="true" />
                      {barber.pin}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-semibold text-amber-700">
                      <KeyRound className="h-3 w-3" aria-hidden="true" />
                      Giriş yetkisi yok
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink/[0.04] px-2.5 py-1.5 text-[10px] font-semibold text-ink/55">
                    <Clock3 className="h-3 w-3" aria-hidden="true" />
                    {hours > 0 ? `${hours} saat tanımlı` : 'Mesai tanımsız'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isAdding}
        onClose={resetForm}
        title={editingId ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}
        icon={<UserRound className="h-5 w-5 text-brass-dark" />}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-semibold text-ink/60">
              Personel Adı
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
              className="h-12 rounded-xl border-ink/10 bg-white focus-visible:ring-brass"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin" className="text-xs font-semibold text-ink/60">
              Giriş PIN Kodu (6 Hane)
            </Label>
            <Input
              id="pin"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Örn: 123456"
              className="h-12 rounded-xl border-ink/10 bg-white font-mono text-lg tracking-[0.3em] focus-visible:ring-brass"
            />
            <p className="text-[11px] leading-relaxed text-ink/40">
              Personelin sisteme giriş yapabilmesi için gereklidir. Boş bırakırsanız giriş yetkisi
              olmaz.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-ink/10 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className="h-11 rounded-xl px-5 text-xs font-semibold"
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-ink px-6 text-xs font-semibold text-cream hover:bg-ink-soft"
            >
              <Save className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Kaydet
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        description={modalState.description}
        type={modalState.type}
        confirmText={modalState.cancelText === '' ? 'Tamam' : modalState.confirmText || 'Onayla'}
        cancelText={modalState.cancelText}
      />
    </div>
  );
};

export default BarbersManagement;
