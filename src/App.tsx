import React, { useState } from 'react';
import { User, LandingPageConfig, TeacherTab } from './types';
import { StorageService } from './data/storage';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { LoginModal } from './components/LoginModal';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { NotificationProvider, globalNotify } from './context/NotificationContext';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    StorageService.getAuthUser()
  );
  const [landing, setLanding] = useState<LandingPageConfig>(() =>
    StorageService.getLanding()
  );

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [teacherActiveTab, setTeacherActiveTab] = useState<TeacherTab>('subjects');
  const [isTeacherDrawerOpen, setIsTeacherDrawerOpen] = useState<boolean>(false);
  const [dataVersion, setDataVersion] = useState<number>(0);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    StorageService.setAuthUser(user);
    globalNotify.success(
      'Login Berhasil!',
      `Selamat datang kembali, ${user.nama} (${user.role === 'superadmin' ? 'Super Admin' : 'Guru'}).`
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    StorageService.setAuthUser(null);
    setIsTeacherDrawerOpen(false);
    globalNotify.info('Keluar dari Akun', 'Anda telah berhasil logout dari sistem.');
  };

  const handleUpdateLanding = (newLand: LandingPageConfig) => {
    setLanding(newLand);
    StorageService.saveLanding(newLand);
    globalNotify.success(
      'Landing Page Disimpan',
      'Pengaturan konten, paket berbayar, dan kontak landing page berhasil diperbarui!'
    );
  };

  const handleUpdateCurrentUser = (updated: User) => {
    setCurrentUser(updated);
    StorageService.setAuthUser(updated);
    globalNotify.success(
      'Profil Diperbarui',
      'Data profil guru dan instansi sekolah Anda berhasil disimpan.'
    );
  };

  const handleSelectTeacherTab = (tab: TeacherTab, tabName: string) => {
    setTeacherActiveTab(tab);
    globalNotify.info(`Menu ${tabName}`, `Beralih ke tampilan ${tabName}.`);
  };

  // Keep counts in real-time sync
  // dataVersion in dependency triggers re-read when mutations happen
  const teacherCounts =
    currentUser && currentUser.role === 'guru'
      ? {
          subjects: StorageService.getSubjects(currentUser.id).length,
          exams: StorageService.getExams(currentUser.id).length,
          results: StorageService.getResults(currentUser.id).length,
        }
      : undefined;

  // suppress unused var lint by referencing dataVersion in a harmless way
  void dataVersion;

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Top Navigation */}
        <Navbar
          user={currentUser}
          landing={landing}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          activeTeacherTab={teacherActiveTab}
          onSelectTeacherTab={handleSelectTeacherTab}
          teacherCounts={teacherCounts}
          isDrawerOpen={isTeacherDrawerOpen}
          onToggleDrawer={() => setIsTeacherDrawerOpen((prev) => !prev)}
          onCloseDrawer={() => setIsTeacherDrawerOpen(false)}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {!currentUser ? (
            <LandingPage
              landing={landing}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          ) : currentUser.role === 'superadmin' ? (
            <SuperAdminDashboard
              currentUser={currentUser}
              landing={landing}
              onUpdateLanding={handleUpdateLanding}
            />
          ) : (
            <TeacherDashboard
              currentUser={currentUser}
              landing={landing}
              onUpdateCurrentUser={handleUpdateCurrentUser}
              activeTab={teacherActiveTab}
              onTabChange={handleSelectTeacherTab}
              onOpenDrawer={() => setIsTeacherDrawerOpen(true)}
              onDataMutated={() => setDataVersion((v) => v + 1)}
            />
          )}
        </main>

        {/* Login Modal */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />
      </div>
    </NotificationProvider>
  );
}
