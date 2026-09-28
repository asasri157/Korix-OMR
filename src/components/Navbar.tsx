import React, { useState, useEffect } from 'react';
import { User, LandingPageConfig, TeacherTab } from '../types';
import {
  LogOut,
  UserCheck,
  Shield,
  Menu,
  X,
  BookOpen,
  FileCheck2,
  Download,
  Camera,
  Award,
  School,
  ChevronRight,
  Sparkles,
  KeyRound,
} from 'lucide-react';

interface TeacherNavItemConfig {
  id: TeacherTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  countKey?: 'subjects' | 'exams' | 'results';
  isSpecial?: boolean;
}

export const TEACHER_NAV_ITEMS: TeacherNavItemConfig[] = [
  {
    id: 'subjects',
    label: 'Mata Pelajaran',
    shortLabel: 'Mapel',
    icon: BookOpen,
    description: 'Kelola mata pelajaran dan tingkat kelas',
    countKey: 'subjects',
  },
  {
    id: 'exams',
    label: 'Ujian & Kunci',
    shortLabel: 'Ujian',
    icon: FileCheck2,
    description: 'Konfigurasi soal, kunci jawaban & bobot OMR',
    countKey: 'exams',
  },
  {
    id: 'sheet',
    label: 'Download Lembar A4',
    shortLabel: 'Cetak LJK',
    icon: Download,
    description: 'Master template lembar jawaban A4 siap cetak',
  },
  {
    id: 'scan',
    label: 'Scan OMR (Kamera)',
    shortLabel: 'Scan OMR',
    icon: Camera,
    description: 'Pindai lembar jawaban continuous real-time',
    isSpecial: true,
  },
  {
    id: 'results',
    label: 'Hasil Koreksi & Rekap',
    shortLabel: 'Hasil & Rekap',
    icon: Award,
    description: 'Analisis nilai, tanda salah & unduh PDF Landscape',
    countKey: 'results',
  },
  {
    id: 'profile',
    label: 'Profil Guru & Sekolah',
    shortLabel: 'Profil',
    icon: School,
    description: 'Identitas instansi, logo sekolah & kontak',
  },
  {
    id: 'password',
    label: 'Ubah Password',
    shortLabel: 'Password',
    icon: KeyRound,
    description: 'Ubah kata sandi lama ke password baru',
  },
];

interface NavbarProps {
  user: User | null;
  landing: LandingPageConfig;
  onOpenLogin: () => void;
  onLogout: () => void;
  // Teacher navigation props
  activeTeacherTab?: TeacherTab;
  onSelectTeacherTab?: (tab: TeacherTab, tabName: string) => void;
  teacherCounts?: {
    subjects: number;
    exams: number;
    results: number;
  };
  isDrawerOpen?: boolean;
  onToggleDrawer?: () => void;
  onCloseDrawer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  landing,
  onOpenLogin,
  onLogout,
  activeTeacherTab = 'subjects',
  onSelectTeacherTab,
  teacherCounts,
  isDrawerOpen: isDrawerOpenProp,
  onToggleDrawer: onToggleDrawerProp,
  onCloseDrawer: onCloseDrawerProp,
}) => {
  const [internalDrawerOpen, setInternalDrawerOpen] = useState(false);

  // Sync controlled vs uncontrolled drawer state
  const isDrawerOpen =
    isDrawerOpenProp !== undefined ? isDrawerOpenProp : internalDrawerOpen;

  const handleToggleDrawer = () => {
    if (onToggleDrawerProp) {
      onToggleDrawerProp();
    } else {
      setInternalDrawerOpen((prev) => !prev);
    }
  };

  const handleCloseDrawer = () => {
    if (onCloseDrawerProp) {
      onCloseDrawerProp();
    } else {
      setInternalDrawerOpen(false);
    }
  };

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  const isTeacher = user && user.role === 'guru';

  const getItemCount = (item: TeacherNavItemConfig) => {
    if (!teacherCounts || !item.countKey) return null;
    return teacherCounts[item.countKey];
  };

  const handleTabClick = (tab: TeacherTab, label: string) => {
    if (onSelectTeacherTab) {
      onSelectTeacherTab(tab, label);
    }
    handleCloseDrawer();
  };

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* LEFT SECTION: Hamburger + Logo + Left-Aligned Menus */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Hamburger Button for Teacher */}
            {isTeacher && (
              <button
                id="btn-navbar-hamburger"
                type="button"
                onClick={handleToggleDrawer}
                aria-label={isDrawerOpen ? 'Tutup Menu Navigasi Guru' : 'Buka Menu Navigasi Guru'}
                aria-expanded={isDrawerOpen}
                className="p-2 -ml-1 text-slate-700 hover:text-blue-600 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition flex items-center justify-center shrink-0 border border-slate-200/80 shadow-2xs group"
                title="Buka Menu Navigasi Guru"
              >
                <Menu className="w-5 h-5 text-slate-700 group-hover:text-blue-600 transition-colors" />
              </button>
            )}

            {/* Brand & Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shadow-blue-500/20 shrink-0">
                K
              </div>
              <div className="min-w-0 pr-1 sm:pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                    {landing.namaApp || 'KORIX OMR'}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[110px] sm:max-w-[200px] md:max-w-xs font-medium">
                  {user
                    ? user.role === 'superadmin'
                      ? 'Panel Super Admin'
                      : user.namaSekolah || 'Panel Guru'
                    : 'Sistem Koreksi Lembar Jawaban Otomatis'}
                </p>
              </div>
            </div>

            {/* TEACHER MENUS - STRICTLY ON THE LEFT (Desktop & Large Screens) */}
            {isTeacher && (
              <nav
                aria-label="Navigasi Menu Guru"
                className="hidden lg:flex items-center gap-1 xl:gap-1.5 ml-2 pl-3 border-l border-slate-200 overflow-x-auto py-1"
              >
                {TEACHER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTeacherTab === item.id;
                  const count = getItemCount(item);

                  return (
                    <button
                      key={item.id}
                      id={`navbar-tab-guru-${item.id}`}
                      onClick={() => handleTabClick(item.id, item.label)}
                      className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-2xs font-bold ring-1 ring-blue-600/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                      title={item.description}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          item.isSpecial
                            ? isActive
                              ? 'text-emerald-600 font-bold'
                              : 'text-emerald-600'
                            : isActive
                            ? 'text-blue-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span>{item.shortLabel}</span>
                      {count !== null && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {count}
                        </span>
                      )}
                      {item.isSpecial && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                      )}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>

          {/* RIGHT ACTIONS: Profile Info & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-3">
                {/* User Info on Medium & Larger Screens */}
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                    {user.nama}
                  </div>
                  <div className="text-[10px] flex items-center justify-end gap-1 font-semibold text-slate-500 mt-0.5">
                    {user.role === 'superadmin' ? (
                      <span className="px-1.5 py-0.2 bg-purple-100 text-purple-700 rounded flex items-center gap-1 font-bold">
                        <Shield className="w-2.5 h-2.5" /> Super Admin
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded flex items-center gap-1 font-bold">
                        <UserCheck className="w-2.5 h-2.5" /> Guru ({user.paket})
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Role Chip */}
                <div className="sm:hidden">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      user.role === 'superadmin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {user.role === 'superadmin' ? 'Admin' : 'Guru'}
                  </span>
                </div>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition min-h-[36px]"
                  title="Keluar dari sistem"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <button
                id="btn-navbar-login"
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-600/30 transition min-h-[36px]"
              >
                Masuk
              </button>
            )}
          </div>
        </div>
      </header>

      {/* AESTHETIC RESPONSIVE SLIDE-OVER DRAWER (GURU MENU) */}
      {isTeacher && isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={handleCloseDrawer}
          />

          <div className="fixed inset-y-0 left-0 max-w-full flex">
            <aside
              className="w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col border-r border-slate-200 animate-in slide-in-from-left duration-300 ease-out"
            >
              {/* Drawer Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm shadow-blue-600/20">
                    K
                  </div>
                  <div>
                    <div className="font-bold text-sm text-slate-900">
                      {landing.namaApp || 'KORIX OMR'}
                    </div>
                    <div className="text-[11px] text-blue-600 font-medium">
                      Navigasi Akun Guru
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCloseDrawer}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
                  aria-label="Tutup Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Teacher Profile Summary Card inside Drawer */}
              <div className="p-3.5 mx-3 mt-3 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-xl border border-blue-100/80">
                <div className="flex items-center gap-3">
                  {user.logoSekolahUrl ? (
                    <img
                      src={user.logoSekolahUrl}
                      alt="Logo Sekolah"
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 p-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      <School className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {user.nama}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {user.namaSekolah || 'Guru Pengajar'}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                      <span className="font-semibold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                        {user.paket}
                      </span>
                      <span className={`font-semibold px-1.5 py-0.2 rounded ${
                        user.paketStatus === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {user.paketStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Items List */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Daftar Menu Akun Guru
                </div>

                {TEACHER_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTeacherTab === item.id;
                  const count = getItemCount(item);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTabClick(item.id, item.label)}
                      className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl transition-all group ${
                        isActive
                          ? 'bg-blue-50/90 text-blue-900 border border-blue-200/80 shadow-2xs font-semibold'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`text-xs ${isActive ? 'font-bold text-blue-700' : 'font-semibold text-slate-800'}`}>
                            {item.label}
                          </span>
                          {count !== null && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                          {item.isSpecial && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-700">
                              Live
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      </div>

                      <ChevronRight
                        className={`w-4 h-4 self-center shrink-0 transition-transform ${
                          isActive ? 'text-blue-600 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/70 space-y-2">
                <button
                  type="button"
                  onClick={() => handleTabClick('scan', 'Scan OMR (Kamera)')}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  <Camera className="w-4 h-4" />
                  Mulai Scan Kamera OMR
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleCloseDrawer();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition border border-rose-200/60"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Keluar dari Akun Guru
                </button>

                <div className="text-center pt-1 text-[10px] text-slate-400">
                  {landing.namaApp || 'KORIX OMR'} • Sistem Koreksi LJK Digital
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
};
