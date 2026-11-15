import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { Modal } from '../../components/ui/modal';
import {
  Banknote,
  Clock3,
  Edit2,
  Plus,
  Save,
  Scissors,
  Search,
  Trash2,
} from 'lucide-react';
import { Service } from '../../context/BookingContext';

const ServicesManagement = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');

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

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Hizmetler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchServices();
  }, []);

  const resetForm = () => {
    setName('');
    setPrice('');
    setDuration('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEditClick = (service: Service) => {
    setName(service.name);
    setPrice(service.price.toString());
    setDuration(service.duration.toString());
    setEditingId(service.id);
    setIsAdding(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !duration) return;

    const payload = {
      name,
      price: Number(price),
      duration: parseInt(duration),
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('services')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert([payload]);

        if (error) throw error;
      }

      resetForm();
      void fetchServices();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Başarılı',
        description: 'Hizmet başarıyla kaydedildi.',
        onConfirm: closeModal,
        cancelText: '',
      });
    } catch (error) {
      console.error('Hizmet kaydedilirken hata:', error);
      const supabaseError = error as { code?: string; message?: string };

      setModalState({
        isOpen: true,
        type: 'danger',
        title: 'Hata',
        description:
          supabaseError?.code === '42501'
            ? 'Yetki hatası: Hizmet eklemek için patron hesabıyla giriş yapmalısınız.'
            : supabaseError?.message || 'Hizmet kaydedilirken bir hata oluştu.',
        onConfirm: closeModal,
        cancelText: '',
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setModalState({
      isOpen: true,
      type: 'danger',
      title: 'Hizmeti Sil',
      description: 'Bu hizmeti kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      confirmText: 'Evet, Sil',
      cancelText: 'İptal',
      onConfirm: () => void executeDelete(id),
    });
  };

  const executeDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('services').delete().eq('id', id);

      if (error) throw error;
      void fetchServices();
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Başarılı',
        description: 'Hizmet başarıyla silindi.',
        onConfirm: closeModal,
        cancelText: '',
      });
    } catch (error) {
      console.error('Hizmet silinirken hata:', error);
      setModalState({
        isOpen: true,
        type: 'danger',
        title: 'Hata',
        description: 'Hizmet silinirken bir hata oluştu.',
        onConfirm: closeModal,
        cancelText: '',
      });
    }
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  const averagePrice =
    services.length > 0
      ? Math.round(services.reduce((sum, service) => sum + Number(service.price), 0) / services.length)
      : 0;
  const averageDuration =
    services.length > 0
      ? Math.round(
          services.reduce((sum, service) => sum + Number(service.duration), 0) / services.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
            Yönetim
          </p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 md:text-3xl">
            Hizmetler
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Menüyü, fiyatları ve süreleri buradan yönetin.
          </p>
        </div>

        <Button
          onClick={() => setIsAdding(true)}
          className="h-11 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Yeni Hizmet
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { icon: Scissors, label: 'Toplam hizmet', value: services.length },
          { icon: Banknote, label: 'Ortalama fiyat', value: `₺${averagePrice}` },
          { icon: Clock3, label: 'Ortalama süre', value: `${averageDuration} dk` },
        ].map((item) => (
          <div
            key={item.label}
            className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3"
          >
            <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 sm:flex">
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase leading-tight tracking-[0.1em] text-slate-400">
                {item.label}
              </p>
              <p className="mt-1 text-lg font-bold leading-none text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Hizmet ara..."
          className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm focus-visible:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white/60" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <Scissors className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {services.length === 0 ? 'Henüz hizmet eklenmemiş.' : 'Aramanızla eşleşen hizmet yok.'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {services.length === 0
              ? 'İlk hizmeti ekleyerek menüyü oluşturun.'
              : 'Farklı bir arama deneyin.'}
          </p>
          {services.length === 0 && (
            <Button
              onClick={() => setIsAdding(true)}
              className="mt-4 h-10 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Yeni Hizmet
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => (
            <article
              key={service.id}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Scissors className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditClick(service)}
                    aria-label={`${service.name} hizmetini düzenle`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Edit2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(service.id)}
                    aria-label={`${service.name} hizmetini sil`}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <h3 className="mt-4 font-bold text-2xl leading-tight text-slate-900">{service.name}</h3>

              <div className="mt-5 flex items-end justify-between border-t border-slate-200 pt-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Fiyat
                  </p>
                  <p className="mt-0.5 font-bold text-2xl text-slate-900">
                    ₺{Number(service.price).toLocaleString('tr-TR')}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/[0.04] px-3 py-1.5 text-[10px] font-semibold text-slate-600">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {service.duration} dk
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={isAdding}
        onClose={resetForm}
        title={editingId ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}
        icon={<Scissors className="h-5 w-5 text-blue-600" />}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold text-slate-600">
                Hizmet Adı
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Saç Kesimi"
                className="h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs font-semibold text-slate-600">
                Fiyat (₺)
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Örn: 350"
                className="h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-blue-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-xs font-semibold text-slate-600">
                Süre (Dakika)
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Örn: 45"
                className="h-12 rounded-xl border-slate-200 bg-white focus-visible:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-slate-200 pt-4">
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
              className="h-11 rounded-xl bg-blue-600 px-6 text-xs font-semibold text-white hover:bg-blue-700"
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

export default ServicesManagement;
