import React, { useState, useEffect } from 'react';
import { User, LandingPageConfig, ScanResultItem, Exam, PaketType, PaketPricingItem } from '../types';
import { StorageService } from '../data/storage';
import { useNotification } from '../context/NotificationContext';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  Users,
  LayoutDashboard,
  FileSpreadsheet,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Save,
  Search,
  MessageSquare,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Eye,
  EyeOff,
  X,
  Copy,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  currentUser: User;
  landing: LandingPageConfig;
  onUpdateLanding: (newLanding: LandingPageConfig) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  currentUser,
  landing,
  onUpdateLanding,
}) => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'landing' | 'exams'>('overview');
  const [teachers, setTeachers] = useState<User[]>(() =>
    StorageService.getUsers().filter((u) => u.role === 'guru')
  );
  const [allResults, setAllResults] = useState<ScanResultItem[]>(() =>
    StorageService.getResults()
  );
  const [allExams] = useState<Exam[]>(() => StorageService.getExams());

  // Modal Tambah Guru
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [newNama, setNewNama] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Guru@12345');
  const [showNewTeacherPassword, setShowNewTeacherPassword] = useState(false);
  const [newSekolah, setNewSekolah] = useState('');
  const [newPaket, setNewPaket] = useState<PaketType>('Bulanan');

  // Modal Kelola Paket
  const [selectedTeacherForPackage, setSelectedTeacherForPackage] = useState<User | null>(null);
  const [editPaketType, setEditPaketType] = useState<PaketType>('Tahunan');

  // Landing Page Form State
  const [landingForm, setLandingForm] = useState<LandingPageConfig>(landing);
  const [landingSavedAlert, setLandingSavedAlert] = useState(false);

  // In-app Delete Confirmation Modal State (replaces window.confirm)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    setLandingForm(landing);
  }, [landing]);

  // Search filter
  const [searchTeacher, setSearchTeacher] = useState('');
  const [searchResult, setSearchResult] = useState('');

  const handleTabChange = (tab: 'overview' | 'users' | 'landing' | 'exams', tabName: string) => {
    setActiveTab(tab);
    notify.info(`Menu ${tabName}`, `Beralih ke tampilan ${tabName}.`);
  };

  // Handle Add Guru
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    let end = '';
    if (newPaket === 'Unlimited') {
      end = 'Unlimited';
    } else {
      const days = newPaket === 'Bulanan' ? 30 : 365;
      const d = new Date();
      d.setDate(d.getDate() + days);
      end = d.toISOString().split('T')[0];
    }

    const newT: User = {
      id: `usr-${Date.now()}`,
      username: newUsername.trim(),
      password: newPassword,
      nama: newNama.trim(),
      email: newEmail.trim(),
      role: 'guru',
      aktif: true,
      createdAt: today,
      paket: newPaket,
      paketStatus: 'Aktif',
      tanggalMulai: today,
      tanggalBerakhir: end,
      namaSekolah: newSekolah.trim() || 'Sekolah Baru',
      alamatSekolah: '',
      logoSekolahUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=160&auto=format&fit=crop&q=80',
    };

    StorageService.addUser(newT);
    setTeachers(StorageService.getUsers().filter((u) => u.role === 'guru'));
    setIsAddTeacherOpen(false);
    notify.success(
      'Akun Guru Berhasil Dibuat!',
      `Akun "${newNama}" (@${newUsername}) telah aktif dengan paket ${newPaket}.`
    );
    setNewNama('');
    setNewUsername('');
    setNewEmail('');
    setNewSekolah('');
  };

  const handleToggleTeacherActive = (id: string, current: boolean, name: string) => {
    StorageService.updateUser(id, { aktif: !current });
    setTeachers(StorageService.getUsers().filter((u) => u.role === 'guru'));
    notify.info(
      'Status Akun Diperbarui',
      `Akun guru "${name}" telah ${!current ? 'diaktifkan' : 'dinonaktifkan'}.`
    );
  };

  const handleDeleteTeacher = (id: string, name?: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Akun Guru',
      itemName: name || id,
      message: 'Apakah Anda yakin ingin menghapus akun guru ini? Akses login dan seluruh data terkait akan dihapus secara permanen dari sistem.',
      onConfirm: () => {
        StorageService.deleteUser(id);
        setTeachers(StorageService.getUsers().filter((u) => u.role === 'guru'));
        notify.warning(
          'Akun Guru Berhasil Dihapus',
          `Akun guru "${name || id}" telah berhasil dihapus dari sistem.`
        );
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleCopyTeacherInfo = (t: User) => {
    const text = `Halo Bapak/Ibu ${t.nama},\nBerikut akun KORIX OMR Anda:\n• Username: ${t.username}\n• Password default: Guru@12345\n• Paket: ${t.paket} (Berlaku s/d: ${t.tanggalBerakhir})\n• Sekolah: ${t.namaSekolah || '-'}\nSilakan login ke aplikasi KORIX OMR.`;
    navigator.clipboard?.writeText?.(text).then(
      () => {
        notify.success('Data Login Disalin!', `Detail akun "${t.nama}" berhasil disalin ke clipboard.`);
      },
      () => {
        notify.info('Detail Akun', `Username: ${t.username}`);
      }
    );
  };

  const handleApplyPackageChange = (isExtend: boolean) => {
    if (!selectedTeacherForPackage) return;
    if (isExtend) {
      StorageService.extendPackage(selectedTeacherForPackage.id, editPaketType);
      notify.success(
        'Masa Aktif Diperpanjang!',
        `Paket guru "${selectedTeacherForPackage.nama}" diperpanjang (+${editPaketType === 'Bulanan' ? '30 Hari' : editPaketType === 'Tahunan' ? '365 Hari' : 'Unlimited'}).`
      );
    } else {
      // Ubah paket langsung
      const today = new Date().toISOString().split('T')[0];
      let end = '';
      if (editPaketType === 'Unlimited') {
        end = 'Unlimited';
      } else {
        const days = editPaketType === 'Bulanan' ? 30 : 365;
        const d = new Date();
        d.setDate(d.getDate() + days);
        end = d.toISOString().split('T')[0];
      }
      StorageService.updateUser(selectedTeacherForPackage.id, {
        paket: editPaketType,
        paketStatus: 'Aktif',
        tanggalMulai: today,
        tanggalBerakhir: end,
      });
      notify.success(
        'Paket Baru Diterapkan!',
        `Paket guru "${selectedTeacherForPackage.nama}" diubah menjadi ${editPaketType} mulai hari ini.`
      );
    }

    setTeachers(StorageService.getUsers().filter((u) => u.role === 'guru'));
    setSelectedTeacherForPackage(null);
  };

  const handleSaveLanding = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLanding(landingForm);
    setLandingSavedAlert(true);
    notify.success(
      'Pengaturan Landing Page Disimpan!',
      'Seluruh konten, kontak WA admin, dan daftar paket harga publik berhasil diperbarui.'
    );
    setTimeout(() => setLandingSavedAlert(false), 3000);
  };

  // Handler Manajemen Paket Landing Page
  const handleAddPaket = () => {
    const newPaketItem: PaketPricingItem = {
      id: `paket-${Date.now()}`,
      nama: 'Paket Baru',
      durasiHari: 30,
      harga: 'Rp 49.000',
      periode: 'per bulan (30 hari)',
      populer: false,
      keterangan: 'Pilihan fleksibel untuk evaluasi pembelajaran.',
      fitur: [
        'Masa aktif 30 hari otomatis',
        'Semua jenis soal (PG, PGK, Isian, Uraian)',
        'Continuous scan kamera smartphone & laptop',
        'Cetak lembar A4 & batch generator',
      ],
    };
    setLandingForm((prev) => ({
      ...prev,
      paketList: [...prev.paketList, newPaketItem],
    }));
    notify.success(
      'Paket Baru Ditambahkan!',
      'Paket harga baru berhasil ditambahkan ke daftar. Jangan lupa klik Simpan Perubahan.'
    );
  };

  const handleDeletePaket = (index: number, nama: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Paket Harga',
      itemName: nama || 'Paket',
      message: `Apakah Anda yakin ingin menghapus paket "${nama || 'Paket'}" dari daftar paket landing page?`,
      onConfirm: () => {
        setLandingForm((prev) => ({
          ...prev,
          paketList: prev.paketList.filter((_, i) => i !== index),
        }));
        notify.warning(
          'Paket Berhasil Dihapus',
          `Paket "${nama || 'Paket'}" telah dihapus dari daftar paket landing page. Klik Simpan Perubahan untuk memperbarui publik.`
        );
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleUpdatePaketField = <K extends keyof PaketPricingItem>(
    index: number,
    field: K,
    value: PaketPricingItem[K]
  ) => {
    setLandingForm((prev) => {
      const updated = [...prev.paketList];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, paketList: updated };
    });
    if (field === 'populer') {
      notify.info(
        'Status Populer Diubah',
        value ? 'Paket ditandai sebagai pilihan terpopuler.' : 'Tanda terpopuler dinonaktifkan.'
      );
    }
  };

  const handleAddPaketFeature = (paketIndex: number) => {
    setLandingForm((prev) => {
      const updated = [...prev.paketList];
      const target = updated[paketIndex];
      const currentFitur = target.fitur || [];
      updated[paketIndex] = {
        ...target,
        fitur: [...currentFitur, 'Poin fitur baru'],
      };
      return { ...prev, paketList: updated };
    });
    notify.info('Fitur Ditambahkan', 'Poin fitur baru ditambahkan ke paket.');
  };

  const handleUpdatePaketFeature = (paketIndex: number, featureIndex: number, text: string) => {
    setLandingForm((prev) => {
      const updated = [...prev.paketList];
      const target = updated[paketIndex];
      const newFitur = [...(target.fitur || [])];
      newFitur[featureIndex] = text;
      updated[paketIndex] = {
        ...target,
        fitur: newFitur,
      };
      return { ...prev, paketList: updated };
    });
  };

  const handleDeletePaketFeature = (paketIndex: number, featureIndex: number) => {
    setLandingForm((prev) => {
      const updated = [...prev.paketList];
      const target = updated[paketIndex];
      updated[paketIndex] = {
        ...target,
        fitur: (target.fitur || []).filter((_, fi) => fi !== featureIndex),
      };
      return { ...prev, paketList: updated };
    });
    notify.info('Fitur Dihapus', 'Poin fitur telah dihapus dari daftar.');
  };


  const filteredTeachers = teachers.filter(
    (t) =>
      t.nama.toLowerCase().includes(searchTeacher.toLowerCase()) ||
      t.username.toLowerCase().includes(searchTeacher.toLowerCase()) ||
      t.namaSekolah?.toLowerCase().includes(searchTeacher.toLowerCase())
  );

  const activeCount = teachers.filter((t) => t.paketStatus === 'Aktif').length;
  const expiredCount = teachers.filter((t) => t.paketStatus === 'Expired').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Panel Pengelola Aplikasi (Super Admin)
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Pusat Manajemen KORIX OMR
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl leading-relaxed">
              Kelola akun Guru, pantau otomatisasi masa aktif & aktivasi paket berbayar, edit konfigurasi landing page publik, dan pantau seluruh ujian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-add-teacher-top"
              onClick={() => {
                setIsAddTeacherOpen(true);
                notify.info('Formulir Tambah Guru', 'Silakan masukkan nama, sekolah, dan paket untuk guru baru.');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Akun Guru
            </button>
            <a
              id="btn-open-wa-admin"
              href={`https://wa.me/${landing.nomorWhatsApp.replace(/[^0-9]/g, '')}?text=Halo%20Super%20Admin%20KORIX%20OMR`}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                notify.info('WhatsApp Super Admin', 'Menghubungkan ke kontak WhatsApp resmi admin...');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-xl border border-white/20 backdrop-blur-sm transition"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              WhatsApp Admin
            </a>
          </div>
        </div>

        {/* Decorative ambient elements */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          id="tab-superadmin-overview"
          onClick={() => handleTabChange('overview', 'Ringkasan & Statistik')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Ringkasan & Statistik
        </button>

        <button
          id="tab-superadmin-users"
          onClick={() => handleTabChange('users', 'Kelola Guru & Paket')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Kelola Guru & Paket
          <span className="px-2 py-0.5 text-xs bg-slate-100 rounded-full text-slate-600 font-semibold">
            {teachers.length}
          </span>
        </button>

        <button
          id="tab-superadmin-landing"
          onClick={() => handleTabChange('landing', 'Pengaturan Landing Page')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'landing'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-4 h-4" />
          Pengaturan Landing Page
        </button>

        <button
          id="tab-superadmin-exams"
          onClick={() => handleTabChange('exams', 'Semua Ujian & Rekap')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 font-medium text-sm border-b-2 transition whitespace-nowrap ${
            activeTab === 'exams'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Semua Ujian & Rekap
          <span className="px-2 py-0.5 text-xs bg-slate-100 rounded-full text-slate-600 font-semibold">
            {allResults.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
                <span>Total Akun Guru</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-slate-900">{teachers.length}</div>
              <p className="text-xs text-slate-500 mt-1">Pengguna aktif terdaftar</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between text-emerald-600 text-xs font-medium uppercase tracking-wider mb-2">
                <span>Paket Aktif</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-bold text-emerald-700">{activeCount}</div>
              <p className="text-xs text-emerald-600 mt-1">Dapat menggunakan semua fitur scan</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between text-amber-600 text-xs font-medium uppercase tracking-wider mb-2">
                <span>Paket Expired</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-amber-700">{expiredCount}</div>
              <p className="text-xs text-amber-600 mt-1">Terkunci otomatis setelah masa lewat</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-sm">
              <div className="flex items-center justify-between text-indigo-600 text-xs font-medium uppercase tracking-wider mb-2">
                <span>Total Lembar Scan</span>
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-3xl font-bold text-indigo-700">{allResults.length}</div>
              <p className="text-xs text-indigo-600 mt-1">Hasil koreksi tersimpan</p>
            </div>
          </div>

          {/* Quick Package Rules Info */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-900 text-base flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Prinsip Otomatisasi Paket & Masa Aktif
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm text-blue-900/80">
              <div className="bg-white/80 p-4 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-950 block">1. Paket Bulanan (30 Hari)</span>
                Masa aktif berlaku tepat 30 hari sejak aktivasi. Jika tanggal berakhir terlewati, status berubah seketika menjadi Expired.
              </div>
              <div className="bg-white/80 p-4 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-950 block">2. Paket Tahunan (365 Hari)</span>
                Masa aktif 1 tahun kalender penuh. Saat diperpanjang sebelum expired, sisa hari aktif akan ditambahkan secara akumulatif.
              </div>
              <div className="bg-white/80 p-4 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-950 block">3. Paket Unlimited (Selamanya)</span>
                Tidak memiliki tanggal kadaluwarsa (Unlimited). Cocok untuk lisensi permanen tanpa perlu perpanjangan rutin.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KELOLA GURU & PAKET */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="search-teacher-input"
                type="text"
                placeholder="Cari nama guru, username, atau nama sekolah..."
                value={searchTeacher}
                onChange={(e) => setSearchTeacher(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <button
              id="btn-open-modal-add-teacher"
              onClick={() => setIsAddTeacherOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition"
            >
              <Plus className="w-4 h-4" />
              Tambah Akun Guru
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Guru & Sekolah</th>
                    <th className="px-5 py-3.5">Username</th>
                    <th className="px-5 py-3.5">Paket</th>
                    <th className="px-5 py-3.5">Masa Aktif</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{t.nama}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="font-medium text-blue-600">{t.namaSekolah || 'Sekolah belum diisi'}</span>
                          <span>•</span>
                          <span>{t.email || '-'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {t.username}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {t.paket}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <div className="text-slate-800 font-medium">
                          Berakhir: {t.tanggalBerakhir === 'Unlimited' ? 'Selamanya (Unlimited)' : t.tanggalBerakhir || '-'}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Mulai: {t.tanggalMulai || '-'}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {t.paketStatus === 'Aktif' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-copy-login-${t.id}`}
                            onClick={() => handleCopyTeacherInfo(t)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition"
                            title="Salin Data Login Guru untuk Dikirim ke WhatsApp"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-manage-pkg-${t.id}`}
                            onClick={() => {
                              setSelectedTeacherForPackage(t);
                              setEditPaketType(t.paket === 'None' ? 'Bulanan' : t.paket);
                              notify.info('Kelola Paket', `Membuka pengaturan paket untuk ${t.nama}.`);
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition"
                          >
                            Kelola Paket
                          </button>
                          <button
                            id={`btn-del-teacher-${t.id}`}
                            onClick={() => handleDeleteTeacher(t.id, t.nama)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        Tidak ada guru yang ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PENGATURAN LANDING PAGE */}
      {activeTab === 'landing' && (
        <form onSubmit={handleSaveLanding} className="space-y-6">
          {landingSavedAlert && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Konfigurasi landing page publik berhasil disimpan dan diperbarui!
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Informasi Utama & Hero Section
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Aplikasi
                </label>
                <input
                  id="landing-nama-app"
                  type="text"
                  value={landingForm.namaApp}
                  onChange={(e) => setLandingForm({ ...landingForm, namaApp: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  URL Logo Publik
                </label>
                <input
                  id="landing-logo-url"
                  type="url"
                  value={landingForm.logoUrl}
                  onChange={(e) => setLandingForm({ ...landingForm, logoUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Judul Utama (Headline Hero)
                </label>
                <input
                  id="landing-judul"
                  type="text"
                  value={landingForm.judul}
                  onChange={(e) => setLandingForm({ ...landingForm, judul: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subjudul
                </label>
                <input
                  id="landing-subjudul"
                  type="text"
                  value={landingForm.subjudul}
                  onChange={(e) => setLandingForm({ ...landingForm, subjudul: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Deskripsi Lengkap
                </label>
                <textarea
                  id="landing-deskripsi"
                  rows={3}
                  value={landingForm.deskripsi}
                  onChange={(e) => setLandingForm({ ...landingForm, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Pricing & WhatsApp Payment Config */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              Kontak Pembayaran & WhatsApp Super Admin
            </h3>
            <p className="text-xs text-slate-500">
              Sesuai sistem KORIX OMR, pembayaran tidak diproses melalui gateway internal melainkan langsung diarahkan ke kontak WhatsApp resmi Super Admin.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nomor WhatsApp Super Admin (Format 62...)
                </label>
                <input
                  id="landing-wa-number"
                  type="text"
                  value={landingForm.nomorWhatsApp}
                  onChange={(e) => setLandingForm({ ...landingForm, nomorWhatsApp: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="6281234567890"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Teks Tombol WhatsApp
                </label>
                <input
                  id="landing-wa-text"
                  type="text"
                  value={landingForm.teksTombolWhatsApp}
                  onChange={(e) => setLandingForm({ ...landingForm, teksTombolWhatsApp: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Daftar Paket Berbayar di Landing Page ({landingForm.paketList.length} Paket)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambah paket baru, atur rincian harga/fitur, tandai paket paling populer, atau hapus paket.
                  </p>
                </div>
                <button
                  id="btn-tambah-paket-landing"
                  type="button"
                  onClick={handleAddPaket}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Paket Baru
                </button>
              </div>

              {landingForm.paketList.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 space-y-3">
                  <p className="text-xs text-slate-500">
                    Belum ada paket berbayar yang ditambahkan untuk landing page publik.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddPaket}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Paket Pertama
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {landingForm.paketList.map((pkt, idx) => (
                    <div
                      key={pkt.id || idx}
                      className={`rounded-2xl border p-4.5 bg-white shadow-xs space-y-3.5 relative transition ${
                        pkt.populer ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Header Kartu Paket */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={Boolean(pkt.populer)}
                              onChange={(e) => handleUpdatePaketField(idx, 'populer', e.target.checked)}
                              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            <span className={pkt.populer ? 'text-blue-600 font-bold' : 'text-slate-500'}>
                              Badge Populer
                            </span>
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePaket(idx, pkt.nama)}
                          title={`Hapus ${pkt.nama}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>

                      {/* Nama Paket */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Nama Paket
                        </label>
                        <input
                          type="text"
                          value={pkt.nama}
                          onChange={(e) => handleUpdatePaketField(idx, 'nama', e.target.value)}
                          placeholder="Contoh: Paket Bulanan"
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                          required
                        />
                      </div>

                      {/* Durasi Hari & Preset */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Durasi (0 = Unlimited)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={pkt.durasiHari}
                            onChange={(e) => handleUpdatePaketField(idx, 'durasiHari', parseInt(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Shortcut Durasi
                          </label>
                          <select
                            value={[0, 30, 90, 180, 365].includes(pkt.durasiHari) ? pkt.durasiHari : 'custom'}
                            onChange={(e) => {
                              if (e.target.value !== 'custom') {
                                handleUpdatePaketField(idx, 'durasiHari', parseInt(e.target.value));
                              }
                            }}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-700"
                          >
                            <option value={30}>30 Hari (1 Bln)</option>
                            <option value={90}>90 Hari (3 Bln)</option>
                            <option value={180}>180 Hari (Smstr)</option>
                            <option value={365}>365 Hari (1 Thn)</option>
                            <option value={0}>0 (Unlimited)</option>
                            {![0, 30, 90, 180, 365].includes(pkt.durasiHari) && (
                              <option value="custom">{pkt.durasiHari} Hari (Kustom)</option>
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Harga & Periode Tampil */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Harga Tampil
                          </label>
                          <input
                            type="text"
                            value={pkt.harga}
                            onChange={(e) => handleUpdatePaketField(idx, 'harga', e.target.value)}
                            placeholder="Rp 49.000"
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Periode Tampil
                          </label>
                          <input
                            type="text"
                            value={pkt.periode}
                            onChange={(e) => handleUpdatePaketField(idx, 'periode', e.target.value)}
                            placeholder="per bulan (30 hari)"
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>

                      {/* Keterangan Singkat */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Keterangan Paket
                        </label>
                        <textarea
                          rows={2}
                          value={pkt.keterangan}
                          onChange={(e) => handleUpdatePaketField(idx, 'keterangan', e.target.value)}
                          placeholder="Deskripsi singkat paket langganan"
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      {/* Daftar Poin Fitur */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-600">
                            Poin Fitur Paket ({pkt.fitur ? pkt.fitur.length : 0})
                          </label>
                          <button
                            type="button"
                            onClick={() => handleAddPaketFeature(idx)}
                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-blue-50 transition"
                          >
                            <Plus className="w-3 h-3" /> Tambah Fitur
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {(pkt.fitur || []).map((ft, fIdx) => (
                            <div key={fIdx} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 select-none">•</span>
                              <input
                                type="text"
                                value={ft}
                                onChange={(e) => handleUpdatePaketFeature(idx, fIdx, e.target.value)}
                                className="flex-1 px-2 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded focus:bg-white focus:ring-1 focus:ring-blue-500"
                                placeholder={`Fitur #${fIdx + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleDeletePaketFeature(idx, fIdx)}
                                title="Hapus baris fitur ini"
                                className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {(!pkt.fitur || pkt.fitur.length === 0) && (
                            <div className="text-[11px] text-slate-400 italic py-1">
                              Belum ada poin fitur. Klik 'Tambah Fitur' di atas.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Teks Footer
              </label>
              <input
                id="landing-footer"
                type="text"
                value={landingForm.footerText}
                onChange={(e) => setLandingForm({ ...landingForm, footerText: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              id="btn-save-landing-config"
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition"
            >
              <Save className="w-4 h-4" />
              Simpan Perubahan Landing Page
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: SEMUA UJIAN & REKAP NILAI */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Monitoring Hasil Ujian & Scan Semua Guru</h3>
              <p className="text-xs text-slate-500 mt-0.5">Super Admin dapat melihat ringkasan seluruh hasil koreksi</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa atau ujian..."
                value={searchResult}
                onChange={(e) => setSearchResult(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">ID Lembar</th>
                    <th className="px-5 py-3.5">Nama Siswa</th>
                    <th className="px-5 py-3.5">Ujian & Mapel</th>
                    <th className="px-5 py-3.5 text-center">B / S / K</th>
                    <th className="px-5 py-3.5 text-center">Nilai</th>
                    <th className="px-5 py-3.5">Waktu Scan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allResults
                    .filter(
                      (r) =>
                        r.namaSiswa.toLowerCase().includes(searchResult.toLowerCase()) ||
                        r.examJudul.toLowerCase().includes(searchResult.toLowerCase())
                    )
                    .map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-blue-600">
                          {r.sheetCode}
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {r.namaSiswa}
                        </td>
                        <td className="px-5 py-3 text-xs">
                          <div className="font-semibold text-slate-800">{r.examJudul}</div>
                          <div className="text-slate-500">{r.mapelNama}</div>
                        </td>
                        <td className="px-5 py-3 text-center text-xs font-mono">
                          <span className="text-emerald-600 font-bold">{r.benar}</span> /{' '}
                          <span className="text-rose-600 font-bold">{r.salah}</span> /{' '}
                          <span className="text-slate-400 font-bold">{r.kosong}</span>
                        </td>
                        <td className="px-5 py-3 text-center font-bold text-slate-900">
                          {r.nilai}
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {r.waktuScan}
                        </td>
                      </tr>
                    ))}
                  {allResults.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        Belum ada data scan tersimpan di sistem.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH GURU */}
      {isAddTeacherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Tambah Akun Guru Baru</h3>
            <form onSubmit={handleAddTeacher} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Guru Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, M.Pd."
                  value={newNama}
                  onChange={(e) => setNewNama(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah Guru</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMA Negeri 1 Nusantara"
                  value={newSekolah}
                  onChange={(e) => setNewSekolah(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    placeholder="guru.budi"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      id="input-new-teacher-password"
                      type={showNewTeacherPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />
                    <button
                      id="btn-toggle-new-teacher-password"
                      type="button"
                      onClick={() => {
                        const nextState = !showNewTeacherPassword;
                        setShowNewTeacherPassword(nextState);
                        notify.info(nextState ? 'Password Ditampilkan' : 'Password Disembunyikan');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition rounded-lg hover:bg-slate-100"
                      aria-label={showNewTeacherPassword ? 'Sembunyikan password' : 'Lihat password'}
                      title={showNewTeacherPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showNewTeacherPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="budi@guru.sch.id"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pilihan Paket Langganan</label>
                <select
                  value={newPaket}
                  onChange={(e) => setNewPaket(e.target.value as PaketType)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="Bulanan">Paket Bulanan (30 Hari)</option>
                  <option value="Tahunan">Paket Tahunan (365 Hari)</option>
                  <option value="Unlimited">Paket Unlimited (Selamanya)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTeacherOpen(false);
                    notify.info('Batal', 'Penambahan akun guru dibatalkan.');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KELOLA PAKET GURU */}
      {selectedTeacherForPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Kelola Paket & Masa Aktif</h3>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="font-semibold text-slate-900">{selectedTeacherForPackage.nama}</div>
              <div className="text-slate-600">{selectedTeacherForPackage.namaSekolah}</div>
              <div className="text-slate-500">
                Paket Saat Ini: <span className="font-bold text-blue-600">{selectedTeacherForPackage.paket}</span> ({selectedTeacherForPackage.paketStatus})
              </div>
              <div className="text-slate-500">
                Masa Berakhir: <span className="font-bold">{selectedTeacherForPackage.tanggalBerakhir || '-'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilih Jenis Paket</label>
              <select
                value={editPaketType}
                onChange={(e) => setEditPaketType(e.target.value as PaketType)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 font-medium"
              >
                <option value="Bulanan">Paket Bulanan (30 Hari)</option>
                <option value="Tahunan">Paket Tahunan (365 Hari)</option>
                <option value="Unlimited">Paket Unlimited (Tanpa Batas Waktu)</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                id="btn-perpanjang-paket"
                type="button"
                onClick={() => handleApplyPackageChange(true)}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Perpanjang Paket (+{editPaketType === 'Bulanan' ? '30 Hari' : editPaketType === 'Tahunan' ? '365 Hari' : 'Unlimited'})
              </button>

              <button
                id="btn-ubah-paket-reset"
                type="button"
                onClick={() => handleApplyPackageChange(false)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center justify-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Ubah Paket Baru & Mulai dari Hari Ini
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedTeacherForPackage(null);
                  notify.info('Pengaturan Paket Ditutup');
                }}
                className="w-full py-2 text-slate-500 hover:text-slate-700 text-xs font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.title}
        itemName={deleteConfirm.itemName}
        message={deleteConfirm.message}
        onConfirm={deleteConfirm.onConfirm}
        onCancel={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
