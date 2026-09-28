import React, { useState, useRef, useEffect } from 'react';
import { User, Subject, Exam, Question, QuestionType, ScanResultItem, LandingPageConfig, TeacherTab } from '../types';
import { StorageService } from '../data/storage';
import { PrintableOMRSheet } from './PrintableOMRSheet';
import { ContinuousScanner } from './ContinuousScanner';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { OMREngine } from '../utils/omrEngine';
import { useNotification } from '../context/NotificationContext';
import {
  BookOpen,
  FileCheck2,
  Printer,
  Download,
  Camera,
  Award,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  ChevronRight,
  School,
  Save,
  MessageSquare,
  Lock,
  UserCheck,
  Upload,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  XCircle,
  CheckCheck,
  Menu,
} from 'lucide-react';
import { exportResultsLandscapePDF } from '../utils/pdfExport';

interface TeacherDashboardProps {
  currentUser: User;
  landing: LandingPageConfig;
  onUpdateCurrentUser: (updated: User) => void;
  activeTab?: TeacherTab;
  onTabChange?: (tab: TeacherTab, tabName: string) => void;
  onOpenDrawer?: () => void;
  onDataMutated?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  landing,
  onUpdateCurrentUser,
  activeTab: activeTabProp,
  onTabChange: onTabChangeProp,
  onOpenDrawer,
  onDataMutated,
}) => {
  const { notify } = useNotification();
  const [internalActiveTab, setInternalActiveTab] = useState<TeacherTab>('subjects');
  const activeTab = activeTabProp !== undefined ? activeTabProp : internalActiveTab;

  const handleTabChange = (tab: TeacherTab, tabName: string) => {
    if (onTabChangeProp) {
      onTabChangeProp(tab, tabName);
    } else {
      setInternalActiveTab(tab);
      notify.info(`Menu ${tabName}`, `Beralih ke tampilan ${tabName}.`);
    }
  };

  // Teacher specific state
  const [subjects, setSubjects] = useState<Subject[]>(() =>
    StorageService.getSubjects(currentUser.id)
  );
  const [exams, setExams] = useState<Exam[]>(() =>
    StorageService.getExams(currentUser.id)
  );
  const [results, setResults] = useState<ScanResultItem[]>(() =>
    StorageService.getResults(currentUser.id)
  );

  // Selected exam for A4 sheet printing or scanning
  const [selectedExamForSheet, setSelectedExamForSheet] = useState<string>(
    exams[0]?.id || ''
  );

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

  // Modal State: Add Subject
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [subKode, setSubKode] = useState('');
  const [subNama, setSubNama] = useState('');
  const [subTingkat, setSubTingkat] = useState('Kelas X');

  // Modal State: Create / Edit Exam
  const [isCreateExamOpen, setIsCreateExamOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [previewKeysExamId, setPreviewKeysExamId] = useState<string | null>(null);
  const [examJudul, setExamJudul] = useState('');
  const [examSubjectId, setExamSubjectId] = useState('');
  const [examKelas, setExamKelas] = useState('Kelas X-A');
  const [examTanggal, setExamTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [examDurasi, setExamDurasi] = useState(90);
  const [countPG, setCountPG] = useState(10);
  const [countPGK, setCountPGK] = useState(2);
  const [countIsian, setCountIsian] = useState(2);
  const [countUraian, setCountUraian] = useState(1);
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);

  // Results Filter & Inline Name Editing
  const [resultsFilterExam, setResultsFilterExam] = useState<string>('all');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentNameValue, setEditStudentNameValue] = useState<string>('');
  const [detailResultItem, setDetailResultItem] = useState<ScanResultItem | null>(null);
  const [detailFilterTab, setDetailFilterTab] = useState<'all' | 'wrong' | 'correct' | 'blank'>('all');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Profile Form State
  const [profileNama, setProfileNama] = useState(currentUser.nama);
  const [profileSekolah, setProfileSekolah] = useState(currentUser.namaSekolah || '');
  const [profileAlamat, setProfileAlamat] = useState(currentUser.alamatSekolah || '');
  const [profileTelepon, setProfileTelepon] = useState(currentUser.teleponSekolah || '');
  const [profileLogo, setProfileLogo] = useState(currentUser.logoSekolahUrl || '');
  const [profileSavedAlert, setProfileSavedAlert] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // Fetch freshest user data from StorageService
    const allUsers = StorageService.getUsers();
    const dbUser = allUsers.find((u) => u.id === currentUser.id);
    const actualCurrentPassword = dbUser?.password || currentUser.password;

    if (oldPassword !== actualCurrentPassword) {
      const msg = 'Password lama yang Anda masukkan tidak sesuai. Silakan periksa kembali.';
      setPasswordError(msg);
      notify.error('Password Lama Salah', msg);
      return;
    }

    if (newPassword.length < 6) {
      const msg = 'Password baru harus memiliki minimal 6 karakter.';
      setPasswordError(msg);
      notify.warning('Password Terlalu Pendek', msg);
      return;
    }

    if (newPassword === oldPassword) {
      const msg = 'Password baru tidak boleh sama dengan password lama saat ini.';
      setPasswordError(msg);
      notify.warning('Password Sama', msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'Konfirmasi password baru tidak cocok dengan password baru.';
      setPasswordError(msg);
      notify.error('Konfirmasi Tidak Cocok', msg);
      return;
    }

    // Save updated password to storage and state
    StorageService.updateUser(currentUser.id, { password: newPassword });
    onUpdateCurrentUser({ ...currentUser, password: newPassword });

    setPasswordChangeSuccess(true);
    notify.success(
      'Password Berhasil Diubah!',
      'Kata sandi akun guru Anda telah diperbarui. Silakan gunakan password baru saat login.'
    );

    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);

    setTimeout(() => {
      setPasswordChangeSuccess(false);
    }, 6000);
  };

  useEffect(() => {
    setProfileNama(currentUser.nama);
    setProfileSekolah(currentUser.namaSekolah || '');
    setProfileAlamat(currentUser.alamatSekolah || '');
    setProfileTelepon(currentUser.teleponSekolah || '');
    setProfileLogo(currentUser.logoSekolahUrl || '');
  }, [currentUser]);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify.error('Format Tidak Didukung', 'Mohon pilih file gambar yang valid (PNG, JPG, JPEG, WEBP, atau SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const isPng = file.type === 'image/png' || file.type === 'image/svg+xml';
          const compressedDataUrl = isPng
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.88);
          setProfileLogo(compressedDataUrl);
          notify.success('Logo Berhasil Dimuat', 'Logo sekolah berhasil diambil dari perangkat dan dioptimasi.');
        } else {
          setProfileLogo(event.target?.result as string);
          notify.success('Logo Berhasil Dimuat', 'Logo sekolah siap digunakan.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Logo Sekolah',
      itemName: 'Logo Profil Sekolah',
      message: 'Apakah Anda yakin ingin menghapus logo sekolah dari profil Anda?',
      onConfirm: () => {
        setProfileLogo('');
        if (logoFileInputRef.current) {
          logoFileInputRef.current.value = '';
        }
        notify.warning(
          'Logo Sekolah Dihapus',
          'Logo sekolah telah dihapus dari profil. Silakan klik "Simpan Profil Saya" untuk mempermanenkan perubahan.'
        );
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Automatic Expiry Check
  const isExpired = currentUser.paketStatus === 'Expired';

  // Handle Add Subject
  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) {
      notify.warning('Paket Expired', 'Paket Anda sudah Expired. Silakan perpanjang paket untuk menambah mata pelajaran.');
      return;
    }
    const newSub: Subject = {
      id: `sub-${Date.now()}`,
      kode: subKode.toUpperCase().trim(),
      nama: subNama.trim(),
      tingkat: subTingkat,
      guruId: currentUser.id,
    };
    StorageService.addSubject(newSub);
    setSubjects(StorageService.getSubjects(currentUser.id));
    setIsAddSubjectOpen(false);
    notify.success(
      'Mata Pelajaran Ditambahkan!',
      `Mata pelajaran "${newSub.nama}" (${newSub.kode}) berhasil disimpan.`
    );
    setSubKode('');
    setSubNama('');
  };

  const handleDeleteSubject = (id: string, namaSub?: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Mata Pelajaran',
      itemName: namaSub || id,
      message: `Apakah Anda yakin ingin menghapus mata pelajaran "${namaSub || id}"? Ujian yang dibuat di bawah mata pelajaran ini mungkin terpengaruh.`,
      onConfirm: () => {
        StorageService.deleteSubject(id);
        setSubjects(StorageService.getSubjects(currentUser.id));
        notify.warning('Mata Pelajaran Dihapus', `Mata pelajaran "${namaSub || id}" berhasil dihapus.`);
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Open Create Exam Modal & Generate Default Questions Template
  const handleOpenCreateExam = () => {
    if (isExpired) {
      notify.warning('Paket Expired', 'Paket Anda sudah Expired. Silakan perpanjang paket untuk membuat ujian.');
      return;
    }
    if (subjects.length === 0) {
      notify.warning('Mata Pelajaran Diperlukan', 'Silakan buat mata pelajaran terlebih dahulu sebelum membuat ujian.');
      return;
    }
    setEditingExamId(null);
    setExamJudul('');
    setExamSubjectId(subjects[0].id);
    setExamKelas('Kelas X-A');
    setExamTanggal(new Date().toISOString().split('T')[0]);
    setExamDurasi(90);
    setCountPG(10);
    setCountPGK(2);
    setCountIsian(2);
    setCountUraian(1);
    setExamQuestions(adjustQuestionsList([], 10, 2, 2, 1));
    setIsCreateExamOpen(true);
    notify.info('Formulir Ujian Dibuka', 'Silakan tentukan judul ujian dan atur kunci jawaban soal.');
  };

  // Open Edit Exam Modal & Preload Existing Answer Keys
  const handleOpenEditExam = (exam: Exam) => {
    if (isExpired) {
      notify.warning('Paket Expired', 'Paket Anda sudah Expired. Silakan perpanjang paket untuk mengedit ujian.');
      return;
    }
    setEditingExamId(exam.id);
    setExamJudul(exam.judul);
    setExamSubjectId(exam.subjectId);
    setExamKelas(exam.kelas);
    setExamTanggal(exam.tanggal);
    setExamDurasi(exam.durasiMenit);
    setCountPG(exam.tipeSoalCounts.pg);
    setCountPGK(exam.tipeSoalCounts.pgk);
    setCountIsian(exam.tipeSoalCounts.isian);
    setCountUraian(exam.tipeSoalCounts.uraian);
    // Deep clone existing questions so teacher can modify keys freely
    setExamQuestions(JSON.parse(JSON.stringify(exam.questions || [])));
    setIsCreateExamOpen(true);
    notify.info(
      'Edit Kunci Jawaban Dibuka',
      `Anda sedang mengedit ujian "${exam.judul}". Silakan perbarui kunci jawaban dan rincian ujian.`
    );
  };

  const adjustQuestionsList = (
    currentList: Question[],
    pg: number,
    pgk: number,
    isian: number,
    uraian: number
  ): Question[] => {
    const existingPG = currentList.filter((q) => q.tipe === 'pg');
    const existingPGK = currentList.filter((q) => q.tipe === 'pgk');
    const existingIsian = currentList.filter((q) => q.tipe === 'isian');
    const existingUraian = currentList.filter((q) => q.tipe === 'uraian');

    const list: Question[] = [];
    let num = 1;

    // PG
    for (let i = 0; i < pg; i++) {
      if (i < existingPG.length) {
        list.push({ ...existingPG[i], nomor: num++ });
      } else {
        list.push({
          nomor: num++,
          tipe: 'pg',
          bobot: 5,
          kunci: 'A',
          opsiCount: 5,
        });
      }
    }

    // PGK
    for (let i = 0; i < pgk; i++) {
      if (i < existingPGK.length) {
        list.push({ ...existingPGK[i], nomor: num++ });
      } else {
        list.push({
          nomor: num++,
          tipe: 'pgk',
          bobot: 10,
          kunci: ['A', 'C'],
          opsiCount: 5,
        });
      }
    }

    // Isian
    for (let i = 0; i < isian; i++) {
      if (i < existingIsian.length) {
        list.push({ ...existingIsian[i], nomor: num++ });
      } else {
        list.push({
          nomor: num++,
          tipe: 'isian',
          bobot: 10,
          kunci: 'Jawaban singkat',
        });
      }
    }

    // Uraian
    for (let i = 0; i < uraian; i++) {
      if (i < existingUraian.length) {
        list.push({ ...existingUraian[i], nomor: num++ });
      } else {
        list.push({
          nomor: num++,
          tipe: 'uraian',
          bobot: 15,
          kunci: 'Rubrik penilaian uraian guru',
        });
      }
    }

    return list;
  };

  const regenerateQuestions = (pg: number, pgk: number, isian: number, uraian: number) => {
    setExamQuestions((prev) => adjustQuestionsList(prev, pg, pgk, isian, uraian));
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examJudul.trim()) {
      notify.error('Judul Diperlukan', 'Silakan masukkan judul/nama ujian.');
      return;
    }

    const totalSoal = countPG + countPGK + countIsian + countUraian;
    if (totalSoal === 0) {
      notify.error('Jumlah Soal Kosong', 'Jumlah soal minimal 1 soal.');
      return;
    }

    if (editingExamId) {
      const existing = exams.find((x) => x.id === editingExamId);
      const updatedExam: Exam = {
        id: editingExamId,
        judul: examJudul.trim(),
        subjectId: examSubjectId,
        guruId: currentUser.id,
        kelas: examKelas,
        tanggal: examTanggal,
        durasiMenit: Number(examDurasi),
        jumlahSoal: totalSoal,
        keterangan: `Ujian ${examKelas} - ${totalSoal} Soal`,
        tipeSoalCounts: {
          pg: countPG,
          pgk: countPGK,
          isian: countIsian,
          uraian: countUraian,
        },
        questions: examQuestions,
        createdAt: existing?.createdAt || new Date().toISOString().split('T')[0],
      };

      StorageService.updateExam(updatedExam);
      const updated = StorageService.getExams(currentUser.id);
      setExams(updated);

      // Re-grade existing scan results of this exam automatically so scores reflect new keys!
      const existingResults = StorageService.getResults(currentUser.id);
      const examResults = existingResults.filter((r) => r.examId === updatedExam.id);
      if (examResults.length > 0) {
        const updatedAllResults = existingResults.map((res) => {
          if (res.examId === updatedExam.id && res.jawabanTerdeteksi) {
            const regraded = OMREngine.gradeExam(updatedExam, res.jawabanTerdeteksi, res.sheetCode);
            return {
              ...res,
              examJudul: updatedExam.judul,
              mapelNama: subjects.find((s) => s.id === updatedExam.subjectId)?.nama || res.mapelNama,
              benar: regraded.benar,
              salah: regraded.salah,
              kosong: regraded.kosong,
              nilai: regraded.nilai,
            };
          }
          return res;
        });
        StorageService.saveResults(updatedAllResults);
        setResults(StorageService.getResults(currentUser.id));
        notify.success(
          'Kunci Jawaban Diperbarui & Nilai Dihitung Ulang!',
          `Kunci jawaban "${updatedExam.judul}" berhasil disimpan. ${examResults.length} hasil koreksi siswa otomatis disinkronkan ulang dengan kunci baru.`
        );
      } else {
        notify.success(
          'Kunci Jawaban & Ujian Diperbarui!',
          `Perubahan pada ujian "${updatedExam.judul}" dan kunci jawaban berhasil disimpan.`
        );
      }

      setIsCreateExamOpen(false);
      setEditingExamId(null);
    } else {
      const newExam: Exam = {
        id: `exam-${Date.now()}`,
        judul: examJudul.trim(),
        subjectId: examSubjectId,
        guruId: currentUser.id,
        kelas: examKelas,
        tanggal: examTanggal,
        durasiMenit: Number(examDurasi),
        jumlahSoal: totalSoal,
        keterangan: `Ujian ${examKelas} - ${totalSoal} Soal`,
        tipeSoalCounts: {
          pg: countPG,
          pgk: countPGK,
          isian: countIsian,
          uraian: countUraian,
        },
        questions: examQuestions,
        createdAt: new Date().toISOString().split('T')[0],
      };

      StorageService.addExam(newExam);
      const updated = StorageService.getExams(currentUser.id);
      setExams(updated);
      if (!selectedExamForSheet) {
        setSelectedExamForSheet(newExam.id);
      }
      setIsCreateExamOpen(false);
      notify.success(
        'Ujian Berhasil Dibuat!',
        `Ujian "${newExam.judul}" (${totalSoal} soal) siap dicetak dan dikoreksi.`
      );
      setExamJudul('');
    }
  };

  const handleDeleteExam = (id: string, judulEx?: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Ujian',
      itemName: judulEx || id,
      message: `Apakah Anda yakin ingin menghapus ujian "${judulEx || id}"? Seluruh data hasil koreksi lembar ujian ini juga akan terhapus.`,
      onConfirm: () => {
        StorageService.deleteExam(id);
        const updated = StorageService.getExams(currentUser.id);
        setExams(updated);
        if (selectedExamForSheet === id) {
          setSelectedExamForSheet(updated[0]?.id || '');
        }
        notify.warning('Ujian Dihapus', `Ujian "${judulEx || id}" berhasil dihapus.`);
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteResult = (id: string, studentName: string) => {
    setDeleteConfirm({
      isOpen: true,
      title: 'Hapus Hasil Koreksi',
      itemName: studentName,
      message: `Apakah Anda yakin ingin menghapus data koreksi untuk "${studentName}"? Nilai ini akan dihapus dari rekap.`,
      onConfirm: () => {
        StorageService.deleteResult(id);
        setResults(StorageService.getResults(currentUser.id));
        notify.warning('Hasil Scan Dihapus', `Data koreksi siswa "${studentName}" berhasil dihapus.`);
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Result handling
  const handleResultSaved = (newResult: ScanResultItem) => {
    setResults(StorageService.getResults(currentUser.id));
    notify.success(
      'Hasil Scan Tersimpan!',
      `Nilai ${newResult.namaSiswa}: ${newResult.nilai} (B: ${newResult.benar}, S: ${newResult.salah}, K: ${newResult.kosong}).`
    );
  };

  const handleSaveStudentName = (resultId: string) => {
    const finalName = editStudentNameValue.trim() || 'Nama belum dikenali';
    StorageService.updateStudentName(resultId, finalName);
    setResults(StorageService.getResults(currentUser.id));
    setEditingStudentId(null);
    notify.success('Nama Siswa Diperbarui', `Nama berhasil disimpan sebagai "${finalName}".`);
  };

  const handleExportPDFLandscape = async () => {
    const filtered =
      resultsFilterExam === 'all'
        ? results
        : results.filter((r) => r.examId === resultsFilterExam);

    if (filtered.length === 0) {
      notify.warning('Data Kosong', 'Tidak ada data hasil koreksi untuk diunduh.');
      return;
    }

    try {
      setIsExportingPDF(true);
      const selectedExam =
        resultsFilterExam === 'all'
          ? null
          : exams.find((e) => e.id === resultsFilterExam) || null;

      notify.info(
        'Menyiapkan Rekap PDF Landscape...',
        `Sedang menyusun laporan PDF landscape (${filtered.length} peserta) dengan kop sekolah dan tabel nilai.`
      );

      await exportResultsLandscapePDF({
        results: filtered,
        selectedExam,
        guru: currentUser,
        kkm: 75,
        safeLogoUrl: currentUser.logoSekolahUrl,
      });

      notify.success(
        'Download PDF Landscape Berhasil!',
        `Rekapitulasi nilai ${filtered.length} lembar ujian berhasil diunduh dalam format PDF Landscape.`
      );
    } catch (err: any) {
      notify.error(
        'Gagal Mengunduh PDF',
        err?.message || 'Terjadi kendala saat menyusun dokumen PDF.'
      );
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    const filtered =
      resultsFilterExam === 'all'
        ? results
        : results.filter((r) => r.examId === resultsFilterExam);

    if (filtered.length === 0) {
      notify.warning('Data Kosong', 'Tidak ada data hasil koreksi untuk diekspor.');
      return;
    }

    const headers = ['No', 'ID Lembar', 'Nama Siswa', 'Mata Pelajaran', 'Ujian', 'Benar', 'Salah', 'Kosong', 'Nilai', 'Status', 'Waktu Scan'];
    const rows = filtered.map((r, idx) => [
      idx + 1,
      r.sheetCode,
      `"${(r.namaSiswa || 'Nama belum dikenali').replace(/"/g, '""')}"`,
      `"${(r.mapelNama || '-').replace(/"/g, '""')}"`,
      `"${(r.examJudul || '-').replace(/"/g, '""')}"`,
      r.benar,
      r.salah,
      r.kosong,
      r.nilai,
      r.nilai >= 75 ? '"TUNTAS"' : '"REMEDIAL"',
      `"${r.waktuScan}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    const fileName = `rekap_nilai_korix_${new Date().toISOString().split('T')[0]}.csv`;

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 200);

      notify.success(
        'Unduh CSV Berhasil!',
        `Rekap nilai ${filtered.length} lembar jawaban siswa berhasil diekspor ke file CSV.`
      );
    } catch {
      // Data URI fallback for strict environments
      const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 200);
      notify.success('Unduh CSV Berhasil!', 'File CSV berhasil diunduh.');
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: Partial<User> = {
      nama: profileNama.trim(),
      namaSekolah: profileSekolah.trim(),
      alamatSekolah: profileAlamat.trim(),
      teleponSekolah: profileTelepon.trim(),
      logoSekolahUrl: profileLogo.trim(),
    };
    StorageService.updateUser(currentUser.id, updatedUser);
    onUpdateCurrentUser({ ...currentUser, ...updatedUser });
    setProfileSavedAlert(true);
    notify.success(
      'Profil Guru & Sekolah Disimpan!',
      'Perubahan profil dan logo sekolah berhasil disimpan dan aktif di seluruh kop lembar OMR.'
    );
    setTimeout(() => setProfileSavedAlert(false), 3000);
  };

  const currentExamObj = exams.find((e) => e.id === selectedExamForSheet);
  const currentSubjectObj = subjects.find((s) => s.id === currentExamObj?.subjectId);

  return (
    <div className="space-y-6">
      {/* 1. DASHBOARD GURU: STATISTIK & STATUS PAKET */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-4">
            {currentUser.logoSekolahUrl ? (
              <img
                src={currentUser.logoSekolahUrl}
                alt="Logo Sekolah Guru"
                className="w-14 h-14 rounded-xl object-contain border border-slate-200 p-1 bg-white shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 font-bold text-xl">
                <School className="w-7 h-7" />
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Dashboard Guru / Pelanggan
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                {currentUser.nama}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                {currentUser.namaSekolah || 'Sekolah belum diatur'} • {currentUser.email}
              </p>
            </div>
          </div>

          {/* KOTAK STATUS PAKET */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full lg:w-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 text-xs">
              <div className="text-slate-500 font-medium">Paket Langganan:</div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                <span className="text-blue-600 truncate">Paket: {currentUser.paket}</span>
              </div>
              <div className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5 truncate">
                Berakhir: <span className="font-semibold text-slate-700">{currentUser.tanggalBerakhir === 'Unlimited' ? 'Selamanya (Unlimited)' : currentUser.tanggalBerakhir || '-'}</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 text-xs">
              <div className="text-slate-500 font-medium">Status Akun:</div>
              <div className="mt-1">
                {isExpired ? (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    Expired
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    Aktif
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 text-xs text-center">
              <div className="text-slate-500 font-medium">Jumlah Ujian:</div>
              <div className="text-lg font-black text-slate-900">{exams.length}</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 sm:p-3 text-xs text-center">
              <div className="text-slate-500 font-medium">Hasil Koreksi:</div>
              <div className="text-lg font-black text-blue-700">{results.length}</div>
            </div>
          </div>
        </div>

        {/* PERINGATAN JIKA EXPIRED */}
        {isExpired && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-rose-800 text-xs sm:text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Masa aktif paket Anda telah habis (Expired).</span> Fitur pembuatan ujian, cetak lembar A4, dan continuous scan kamera saat ini terkunci.
              </div>
            </div>
            <a
              id="btn-expired-wa"
              href={`https://wa.me/${landing.nomorWhatsApp.replace(/[^0-9]/g, '')}?text=Halo%20Super%20Admin,%20saya%20guru%20${encodeURIComponent(currentUser.nama)}%20dari%20${encodeURIComponent(currentUser.namaSekolah)}%20ingin%20memperpanjang%20paket%20KORIX%20OMR.`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs shrink-0 transition"
            >
              <MessageSquare className="w-4 h-4" />
              Perpanjang via WhatsApp Super Admin
            </a>
          </div>
        )}
      </div>

      {/* 2. NAVIGATION TABS GURU - STRICTLY LEFT-ALIGNED WITH HAMBURGER ICON */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-2xs">
        <div className="flex items-center justify-start gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
          {/* Hamburger Icon Button */}
          <button
            type="button"
            id="btn-teacher-dashboard-hamburger"
            onClick={() => onOpenDrawer?.()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-slate-100/90 hover:bg-blue-50 active:bg-blue-100 rounded-xl border border-slate-200/80 transition-all shrink-0 group shadow-2xs"
            title="Buka Menu Navigasi Lengkap (Drawer)"
          >
            <Menu className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
            <span className="hidden sm:inline font-bold">Menu Guru</span>
          </button>

          {/* Vertical subtle divider */}
          <div className="h-6 w-px bg-slate-200 shrink-0 mx-0.5" />

          {/* Left-Aligned Tab Buttons */}
          <div className="flex items-center justify-start gap-1 sm:gap-1.5 min-w-0">
            <button
              id="tab-guru-subjects"
              onClick={() => handleTabChange('subjects', 'Mata Pelajaran')}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'subjects'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>Mata Pelajaran</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ml-0.5 ${
                  activeTab === 'subjects'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {subjects.length}
              </span>
            </button>

            <button
              id="tab-guru-exams"
              onClick={() => handleTabChange('exams', 'Ujian & Kunci Jawaban')}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'exams'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileCheck2 className="w-4 h-4 shrink-0" />
              <span>Ujian & Kunci</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ml-0.5 ${
                  activeTab === 'exams'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {exams.length}
              </span>
            </button>

            <button
              id="tab-guru-sheet"
              onClick={() => handleTabChange('sheet', 'Download Lembar A4')}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'sheet'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Download Lembar A4</span>
            </button>

            <button
              id="tab-guru-scan"
              onClick={() => handleTabChange('scan', 'Scan OMR (Kamera)')}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'scan'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Camera className={`w-4 h-4 shrink-0 ${activeTab === 'scan' ? 'text-white' : 'text-emerald-600'}`} />
              <span>Scan OMR (Kamera)</span>
              <span className={`w-2 h-2 rounded-full ${activeTab === 'scan' ? 'bg-white' : 'bg-emerald-500 animate-pulse'}`} />
            </button>

            <button
              id="tab-guru-results"
              onClick={() => handleTabChange('results', 'Hasil Koreksi & Rekap')}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'results'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4 shrink-0" />
              <span>Hasil Koreksi & Rekap</span>
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ml-0.5 ${
                  activeTab === 'results'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {results.length}
              </span>
            </button>

            <button
              id="tab-guru-profile"
              onClick={() => handleTabChange('profile', 'Profil Guru & Sekolah')}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <School className="w-4 h-4 shrink-0" />
              <span>Profil Guru & Sekolah</span>
            </button>

            <button
              id="tab-guru-password"
              onClick={() => handleTabChange('password', 'Ubah Password')}
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'password'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Ubah Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MATA PELAJARAN */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Daftar Mata Pelajaran Saya</h3>
              <p className="text-xs text-slate-500">
                Kelola mata pelajaran pengajaran Anda (Matematika, Bahasa Indonesia, IPAS, PPKn, PAI, dll)
              </p>
            </div>

            <button
              id="btn-add-subject"
              onClick={() => {
                if (isExpired) {
                  notify.warning('Paket Expired', 'Paket Anda sudah Expired. Silakan perpanjang untuk menambah mata pelajaran.');
                  return;
                }
                setIsAddSubjectOpen(true);
                notify.info('Tambah Mata Pelajaran', 'Silakan lengkapi kode dan nama mata pelajaran.');
              }}
              disabled={isExpired}
              className={`inline-flex items-center gap-2 px-4 py-2 font-semibold text-xs rounded-xl shadow-xs transition ${
                isExpired
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isExpired ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Tambah Mata Pelajaran
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {subjects.map((sub) => {
              const countExams = exams.filter((e) => e.subjectId === sub.id).length;
              return (
                <div
                  key={sub.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                        {sub.kode}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {sub.tingkat}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-base">{sub.nama}</h4>
                    <p className="text-xs text-slate-500 mt-1">{countExams} Ujian Dibuat</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleDeleteSubject(sub.id, sub.nama)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                      title="Hapus Mapel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {subjects.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                Belum ada mata pelajaran. Klik tombol "Tambah Mata Pelajaran" di atas.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: UJIAN & KUNCI JAWABAN */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Ujian & Kunci Jawaban</h3>
              <p className="text-xs text-slate-500">
                Buat ujian baru, atur konfigurasi soal (PG, PGK, Isian, Uraian), dan tentukan kunci jawaban
              </p>
            </div>

            <button
              id="btn-create-exam"
              onClick={handleOpenCreateExam}
              disabled={isExpired}
              className={`inline-flex items-center gap-2 px-4 py-2 font-semibold text-xs rounded-xl shadow-xs transition ${
                isExpired
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isExpired ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              Buat Ujian Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exams.map((ex) => {
              const sub = subjects.find((s) => s.id === ex.subjectId);
              const resultCount = results.filter((r) => r.examId === ex.id).length;
              return (
                <div
                  key={ex.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
                        {sub?.nama || 'Mapel'}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {ex.kelas} • {ex.tanggal}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-base">{ex.judul}</h4>
                    <p className="text-xs text-slate-600">{ex.keterangan}</p>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md">
                        Total: {ex.jumlahSoal} Soal
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-md">
                        PG: {ex.tipeSoalCounts.pg}
                      </span>
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-semibold rounded-md">
                        PGK: {ex.tipeSoalCounts.pgk}
                      </span>
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[11px] font-semibold rounded-md">
                        Isian: {ex.tipeSoalCounts.isian}
                      </span>
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-[11px] font-semibold rounded-md">
                        Uraian: {ex.tipeSoalCounts.uraian}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewKeysExamId(previewKeysExamId === ex.id ? null : ex.id)}
                      className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 font-semibold transition"
                    >
                      {previewKeysExamId === ex.id ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          Tutup Kunci ({ex.questions?.length || 0})
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          Pratinjau Kunci Jawaban ({ex.questions?.length || 0})
                        </>
                      )}
                    </button>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {resultCount} lembar telah discan
                    </span>
                  </div>

                  {/* Accordion Pratinjau Kunci Jawaban */}
                  {previewKeysExamId === ex.id && (
                    <div className="mt-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <KeyRound className="w-3 h-3 text-amber-600" />
                          Kunci Jawaban Tersimpan:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditExam(ex)}
                          className="text-amber-700 hover:text-amber-900 font-bold underline inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit Kunci Sekarang
                        </button>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-slate-200">
                        {ex.questions?.map((q) => (
                          <div
                            key={q.nomor}
                            className="bg-slate-50 border border-slate-200 rounded-md p-1 text-center"
                          >
                            <div className="text-[9px] text-slate-400 font-semibold leading-none">
                              #{q.nomor}
                            </div>
                            <div className="text-xs font-black text-slate-800 truncate mt-0.5">
                              {Array.isArray(q.kunci) ? q.kunci.join(',') : q.kunci || '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenEditExam(ex)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold rounded-lg transition shadow-2xs"
                      title="Edit Kunci Jawaban & Pengaturan Ujian"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                      Edit Kunci & Ujian
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedExamForSheet(ex.id);
                          handleTabChange('sheet', 'Download Lembar A4');
                          notify.info('Download Template LJK', `Menyiapkan master lembar jawaban untuk ${ex.judul}.`);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-semibold rounded-lg transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Template LJK
                      </button>
                      <button
                        onClick={() => handleDeleteExam(ex.id, ex.judul)}
                        title="Hapus Ujian"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {exams.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">
                <FileCheck2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                Belum ada ujian. Klik tombol "Buat Ujian Baru" untuk memulai.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DOWNLOAD TEMPLATE LEMBAR A4 */}
      {activeTab === 'sheet' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pilih Ujian untuk Download Template LJK:
              </span>
              <select
                value={selectedExamForSheet}
                onChange={(e) => {
                  setSelectedExamForSheet(e.target.value);
                  const chosen = exams.find((x) => x.id === e.target.value);
                  notify.info('Ujian Dipilih', `Menyiapkan master template LJK untuk ${chosen?.judul || 'ujian terpilih'}.`);
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.judul} ({ex.jumlahSoal} Soal)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentExamObj && currentSubjectObj ? (
            <PrintableOMRSheet
              exam={currentExamObj}
              guru={currentUser}
              subject={currentSubjectObj}
            />
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-500">
              Silakan buat mata pelajaran dan ujian terlebih dahulu sebelum mencetak lembar jawaban.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SCAN OMR (KAMERA CONTINUOUS) */}
      {activeTab === 'scan' && (
        <div className="space-y-4">
          {isExpired ? (
            <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center space-y-3">
              <Lock className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="text-lg font-bold text-slate-900">Fitur Continuous Scan Terkunci</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Masa aktif paket Anda telah habis. Perpanjang paket sekarang untuk membuka kembali scanner kamera real-time KORIX OMR.
              </p>
              <a
                href={`https://wa.me/${landing.nomorWhatsApp.replace(/[^0-9]/g, '')}?text=Halo%20Super%20Admin,%20saya%20guru%20${encodeURIComponent(currentUser.nama)}%20ingin%20memperpanjang%20paket%20KORIX%20OMR.`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                <MessageSquare className="w-4 h-4" />
                Hubungi WhatsApp Super Admin
              </a>
            </div>
          ) : (
            <ContinuousScanner
              exams={exams}
              subjects={subjects}
              onResultSaved={handleResultSaved}
            />
          )}
        </div>
      )}

      {/* TAB 5: HASIL KOREKSI & REKAP NILAI */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase">Filter Ujian:</span>
              <select
                value={resultsFilterExam}
                onChange={(e) => {
                  setResultsFilterExam(e.target.value);
                  const chosen = exams.find((x) => x.id === e.target.value);
                  notify.info(
                    'Filter Hasil Ujian',
                    e.target.value === 'all'
                      ? 'Menampilkan semua hasil koreksi ujian'
                      : `Memfilter hasil untuk ujian "${chosen?.judul || ''}"`
                  );
                }}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="all">Semua Ujian ({results.length} lembar)</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.judul}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-export-pdf-landscape"
                onClick={handleExportPDFLandscape}
                disabled={isExportingPDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50"
                title="Download Rekap Hasil Ujian Format PDF Landscape (A4)"
              >
                <FileText className="w-4 h-4" />
                {isExportingPDF ? 'Menyusun PDF...' : 'Download Rekap PDF (Landscape)'}
              </button>

              <button
                id="btn-export-csv"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-semibold text-xs rounded-xl transition"
                title="Ekspor rekap lembar koreksi ke format spreadsheet CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Ekspor CSV
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 w-12 text-center">No</th>
                    <th className="px-4 py-3.5">Nama Siswa (Klik untuk Edit)</th>
                    <th className="px-4 py-3.5">Mata Pelajaran & Ujian</th>
                    <th className="px-4 py-3.5 text-center">Benar</th>
                    <th className="px-4 py-3.5 text-center">Salah</th>
                    <th className="px-4 py-3.5 text-center">Kosong</th>
                    <th className="px-4 py-3.5 text-center">Nilai</th>
                    <th className="px-4 py-3.5 text-center">Ket</th>
                    <th className="px-4 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {results
                    .filter(
                      (r) => resultsFilterExam === 'all' || r.examId === resultsFilterExam
                    )
                    .map((res, index) => (
                      <tr key={res.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-4 py-3 text-center text-slate-400 font-mono">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          {editingStudentId === res.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editStudentNameValue}
                                onChange={(e) => setEditStudentNameValue(e.target.value)}
                                className="px-2 py-1 text-xs border border-blue-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveStudentName(res.id)}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-bold"
                              >
                                OK
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingStudentId(res.id);
                                setEditStudentNameValue(res.namaSiswa === 'Nama belum dikenali' ? '' : res.namaSiswa);
                                notify.info('Edit Nama Siswa', 'Ketik nama siswa lalu klik OK untuk menyimpan.');
                              }}
                              className="group cursor-pointer flex items-center gap-1.5"
                              title="Klik untuk mengisi / mengedit nama siswa"
                            >
                              <span
                                className={`font-semibold ${
                                  res.namaSiswa === 'Nama belum dikenali'
                                    ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 italic'
                                    : 'text-slate-900'
                                }`}
                              >
                                {res.namaSiswa}
                              </span>
                              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Lembar: {res.sheetCode}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">{res.mapelNama}</div>
                          <div className="text-slate-500 text-[11px]">{res.examJudul}</div>
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-emerald-600 font-mono">
                          {res.benar}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {res.salah > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDetailResultItem(res);
                                setDetailFilterTab('wrong');
                                notify.info(
                                  'Jawaban Salah Siswa',
                                  `Membuka daftar ${res.salah} nomor salah untuk ${res.namaSiswa}.`
                                );
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-full font-bold text-xs border border-rose-200 transition cursor-pointer"
                              title="Klik untuk melihat nomor-nomor yang salah"
                            >
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              {res.salah} Salah
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full">
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-400 font-mono">
                          {res.kosong}
                        </td>
                        <td className="px-4 py-3 text-center font-black text-sm text-blue-700 font-mono">
                          {res.nilai}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {res.nilai >= 75 ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                              TUNTAS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                              REMEDIAL
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => {
                                setDetailResultItem(res);
                                setDetailFilterTab(res.salah > 0 ? 'wrong' : 'all');
                                notify.info(
                                  'Detail Hasil Koreksi',
                                  `Melihat rincian koreksi untuk ${res.namaSiswa}.`
                                );
                              }}
                              className={`px-2.5 py-1 text-xs rounded-lg transition inline-flex items-center gap-1.5 font-semibold ${
                                res.salah > 0
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700'
                              }`}
                              title={res.salah > 0 ? 'Lihat nomor dan jawaban salah' : 'Lihat rincian lembar jawaban'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {res.salah > 0 ? `Lihat ${res.salah} Salah` : 'Detail Jawaban'}
                            </button>
                            <button
                              onClick={() => handleDeleteResult(res.id, res.namaSiswa)}
                              title="Hapus Hasil Koreksi"
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-500">
                        Belum ada hasil koreksi scan. Buka tab "Scan OMR (Kamera)" untuk mulai memindai lembar ujian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: PROFIL GURU & SEKOLAH */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {profileSavedAlert && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Profil Guru dan Profil Sekolah berhasil disimpan dan diperbarui!
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <School className="w-5 h-5 text-blue-600" />
              Profil Guru & Identitas Sekolah Pengajar
            </h3>
            <p className="text-xs text-slate-500">
              Data sekolah ini akan otomatis muncul pada kop lembar jawaban A4 yang Anda buat dan cetak.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Guru Lengkap
                </label>
                <input
                  type="text"
                  value={profileNama}
                  onChange={(e) => setProfileNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Sekolah
                </label>
                <input
                  type="text"
                  value={profileSekolah}
                  onChange={(e) => setProfileSekolah(e.target.value)}
                  placeholder="Contoh: SMA Negeri 1 Nusantara"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alamat Sekolah
                </label>
                <input
                  type="text"
                  value={profileAlamat}
                  onChange={(e) => setProfileAlamat(e.target.value)}
                  placeholder="Jl. Merdeka No. 45, Jakarta Pusat"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Telepon / Kontak Sekolah
                </label>
                <input
                  type="text"
                  value={profileTelepon}
                  onChange={(e) => setProfileTelepon(e.target.value)}
                  placeholder="(021) 555-0192"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Logo Sekolah
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/75">
                  {/* Kotak Preview Logo */}
                  <div className="w-20 h-20 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                    {profileLogo ? (
                      <img
                        src={profileLogo}
                        alt="Logo Sekolah"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <School className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                        <span className="text-[10px] block font-medium mt-0.5">Tanpa Logo</span>
                      </div>
                    )}
                  </div>

                  {/* Input File & Aksi */}
                  <div className="flex-1 space-y-2">
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                      id="upload-logo-sekolah"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        id="btn-upload-logo-perangkat"
                        onClick={() => {
                          logoFileInputRef.current?.click();
                          notify.info('Pilih File Gambar', 'Membuka dialog file dari perangkat...');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition"
                      >
                        <Upload className="w-4 h-4" />
                        {profileLogo ? 'Ganti Logo dari Perangkat' : 'Pilih Logo dari Perangkat'}
                      </button>

                      {profileLogo && (
                        <button
                          type="button"
                          id="btn-hapus-logo"
                          onClick={handleRemoveLogo}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-xl border border-rose-200 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus Logo
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Pilih file gambar langsung dari penyimpanan perangkat Anda (PNG, JPG, JPEG, atau WEBP). Logo otomatis dioptimasi dan akan dicetak pada kop lembar jawaban OMR A4.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Card Link ke Ubah Password */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Keamanan & Kata Sandi Akun</div>
                  <div className="text-[11px] text-slate-500">
                    Ingin mengubah password lama akun guru Anda ke password baru?
                  </div>
                </div>
              </div>
              <button
                type="button"
                id="btn-goto-ubah-password"
                onClick={() => handleTabChange('password', 'Ubah Password')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 text-xs font-semibold rounded-xl border border-slate-200 hover:border-blue-200 transition shadow-2xs shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Buka Menu Ubah Password
              </button>
            </div>

            <div className="flex justify-end pt-3">
              <button
                id="btn-save-profile-guru"
                type="submit"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                Simpan Profil Saya
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 7: UBAH PASSWORD AKUN GURU */}
      {activeTab === 'password' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ubah Kata Sandi Akun Guru
                </h3>
                <p className="text-xs text-slate-500">
                  Perbarui kata sandi akun Anda secara berkala dari password lama ke password baru.
                </p>
              </div>
            </div>

            {/* Info Akun Saat Ini */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px] block">Username Login:</span>
                <span className="font-mono font-bold text-slate-900">
                  @{currentUser.username}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px] block">Email Terdaftar:</span>
                <span className="font-semibold text-slate-800">
                  {currentUser.email}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[11px] block">Nama Guru:</span>
                <span className="font-bold text-slate-900">
                  {currentUser.nama}
                </span>
              </div>
            </div>

            {/* Notifikasi Sukses */}
            {passwordChangeSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Password Berhasil Diperbarui!</div>
                  <div className="text-emerald-700 text-xs mt-0.5">
                    Kata sandi baru Anda telah aktif. Gunakan password baru ini untuk login berikutnya ke sistem KORIX OMR.
                  </div>
                </div>
              </div>
            )}

            {/* Notifikasi Error */}
            {passwordError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs sm:text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Gagal Mengubah Password</div>
                  <div className="text-rose-700 text-xs mt-0.5">{passwordError}</div>
                </div>
              </div>
            )}

            {/* Form Ubah Password */}
            <form onSubmit={handleChangePassword} className="space-y-4 pt-1">
              {/* Password Lama */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password Lama Saat Ini
                </label>
                <div className="relative">
                  <input
                    id="input-password-lama"
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    required
                    placeholder="Masukkan password lama Anda saat ini"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showOldPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan password yang biasa Anda gunakan untuk masuk ke akun ini.
                </p>
              </div>

              {/* Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    id="input-password-baru"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    required
                    minLength={6}
                    placeholder="Masukkan minimal 6 karakter password baru"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showNewPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span className={newPassword.length >= 6 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                    ✓ Minimal 6 karakter
                  </span>
                  <span>·</span>
                  <span className={newPassword && newPassword !== oldPassword ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                    ✓ Tidak sama dengan password lama
                  </span>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    id="input-konfirmasi-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    required
                    placeholder="Ketik ulang password baru Anda"
                    className={`w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:bg-white transition ${
                      confirmPassword && newPassword !== confirmPassword
                        ? 'border-rose-300 focus:ring-rose-500'
                        : confirmPassword && newPassword === confirmPassword
                        ? 'border-emerald-300 focus:ring-emerald-500'
                        : 'border-slate-200 focus:ring-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title={showConfirmPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-[11px] mt-1 font-medium ${
                    newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {newPassword === confirmPassword
                      ? '✓ Konfirmasi password cocok'
                      : '✗ Konfirmasi password belum cocok'}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setOldPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError(null);
                    notify.info('Form Direset', 'Input form ubah password telah dikosongkan.');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Reset Form
                </button>

                <button
                  id="btn-submit-ubah-password"
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                >
                  <KeyRound className="w-4 h-4" />
                  Simpan Password Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH MATA PELAJARAN */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Tambah Mata Pelajaran</h3>
            <form onSubmit={handleAddSubject} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Mapel</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: MAT-X, IPAS-X, PAI-X"
                  value={subKode}
                  onChange={(e) => setSubKode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika Wajib, IPAS, Bahasa Jawa"
                  value={subNama}
                  onChange={(e) => setSubNama(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat / Sasaran Kelas</label>
                <select
                  value={subTingkat}
                  onChange={(e) => setSubTingkat(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50"
                >
                  <option value="Kelas X">Kelas X</option>
                  <option value="Kelas XI">Kelas XI</option>
                  <option value="Kelas XII">Kelas XII</option>
                  <option value="Umum / Semua Tingkat">Umum / Semua Tingkat</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSubjectOpen(false);
                    notify.info('Batal', 'Penambahan mata pelajaran dibatalkan.');
                  }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow"
                >
                  Simpan Mapel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BUAT / EDIT UJIAN & KUNCI JAWABAN */}
      {isCreateExamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingExamId ? 'Edit Ujian & Kunci Jawaban' : 'Buat Ujian & Atur Kunci Jawaban'}
                  </h3>
                  {editingExamId && (
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                      Mode Edit Kunci
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingExamId
                    ? 'Ubah rincian ujian atau edit kunci jawaban di bawah ini. Hasil koreksi siswa yang tersimpan akan otomatis disinkronkan.'
                    : 'Tentukan detail ujian, jenis soal, dan tentukan kunci jawaban master.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateExamOpen(false);
                  setEditingExamId(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ujian</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Penilaian Harian 1: Aljabar"
                    value={examJudul}
                    onChange={(e) => setExamJudul(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                  <select
                    value={examSubjectId}
                    onChange={(e) => setExamSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kelas X-A"
                    value={examKelas}
                    onChange={(e) => setExamKelas(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={examTanggal}
                      onChange={(e) => setExamTanggal(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi (Menit)</label>
                    <input
                      type="number"
                      required
                      value={examDurasi}
                      onChange={(e) => setExamDurasi(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Tipe Soal Counts */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-800 block mb-2">
                  Komposisi Jenis Soal (Total: {countPG + countPGK + countIsian + countUraian} Soal)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block">Pilihan Ganda (PG)</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={countPG}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCountPG(val);
                        regenerateQuestions(val, countPGK, countIsian, countUraian);
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block">PG Kompleks (PGK)</label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={countPGK}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCountPGK(val);
                        regenerateQuestions(countPG, val, countIsian, countUraian);
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block">Isian Singkat</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={countIsian}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCountIsian(val);
                        regenerateQuestions(countPG, countPGK, val, countUraian);
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block">Uraian</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={countUraian}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCountUraian(val);
                        regenerateQuestions(countPG, countPGK, countIsian, val);
                      }}
                      className="w-full px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Kunci Jawaban Editor */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Kunci Jawaban Soal (PG: 1 opsi; PGK: multiple opsi)
                  </span>
                  {countPG > 0 && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-slate-500 font-medium">Set Cepat PG:</span>
                      {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setExamQuestions((prev) =>
                              prev.map((q) => (q.tipe === 'pg' ? { ...q, kunci: opt } : q))
                            );
                            notify.info('Set Cepat Kunci PG', `Semua soal PG diatur ke kunci ${opt}.`);
                          }}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 rounded text-[10px] font-bold border border-slate-200 transition"
                        >
                          Semua {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 text-xs bg-white">
                  {examQuestions.map((q, idx) => (
                    <div key={q.nomor} className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold w-16">
                        No. {q.nomor} ({q.tipe.toUpperCase()}):
                      </span>

                      {q.tipe === 'pg' && (
                        <div className="flex gap-1">
                          {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                const copy = [...examQuestions];
                                copy[idx].kunci = opt;
                                setExamQuestions(copy);
                              }}
                              className={`w-6 h-6 rounded-full text-xs font-bold border transition ${
                                q.kunci === opt
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {q.tipe === 'pgk' && (
                        <div className="flex gap-1 items-center">
                          {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                            const selected = Array.isArray(q.kunci) && q.kunci.includes(opt);
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  const copy = [...examQuestions];
                                  const currentArr = Array.isArray(copy[idx].kunci)
                                    ? (copy[idx].kunci as string[])
                                    : [];
                                  if (selected) {
                                    copy[idx].kunci = currentArr.filter((k) => k !== opt);
                                  } else {
                                    copy[idx].kunci = [...currentArr, opt];
                                  }
                                  setExamQuestions(copy);
                                }}
                                className={`w-6 h-6 rounded-sm text-xs font-bold border transition ${
                                  selected
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {(q.tipe === 'isian' || q.tipe === 'uraian') && (
                        <input
                          type="text"
                          value={typeof q.kunci === 'string' ? q.kunci : ''}
                          onChange={(e) => {
                            const copy = [...examQuestions];
                            copy[idx].kunci = e.target.value;
                            setExamQuestions(copy);
                          }}
                          placeholder={`Pedoman ${q.tipe}`}
                          className="px-2 py-1 text-xs border border-slate-200 rounded-lg flex-1 ml-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Total: <span className="font-bold text-slate-800">{examQuestions.length} Soal</span>
                  {editingExamId && (
                    <span className="hidden sm:inline-block ml-2 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                      Nilai siswa otomatis disinkronkan
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateExamOpen(false);
                      setEditingExamId(null);
                      notify.info('Batal', editingExamId ? 'Perubahan ujian dibatalkan.' : 'Pembuatan ujian baru dibatalkan.');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {editingExamId ? 'Simpan Perubahan Kunci & Ujian' : 'Simpan Ujian'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL JAWABAN SISWA */}
      {/* MODAL: DETAIL JAWABAN SISWA & IDENTIFIKASI JAWABAN SALAH */}
      {detailResultItem && (() => {
        const detailExam = exams.find((e) => e.id === detailResultItem.examId);
        const gradeResult = detailExam
          ? OMREngine.gradeExam(detailExam, detailResultItem.jawabanTerdeteksi, detailResultItem.sheetCode)
          : null;

        const isBlankItem = (jawaban: any) => {
          if (!jawaban || jawaban === '-' || jawaban === '') return true;
          if (Array.isArray(jawaban) && jawaban.length === 0) return true;
          return false;
        };

        const rawDetails = gradeResult?.rawDetails || Object.entries(detailResultItem.jawabanTerdeteksi).map(([num, val]) => ({
          nomor: Number(num),
          tipe: 'pg' as const,
          kunci: '-',
          jawaban: val,
          isCorrect: false,
          bobot: 1,
        }));

        const formatVal = (v: any) => {
          if (Array.isArray(v)) return v.join(', ') || '-';
          if (v === null || v === undefined || v === '') return '-';
          return String(v);
        };

        const wrongList = rawDetails.filter((d) => !isBlankItem(d.jawaban) && !d.isCorrect);
        const correctList = rawDetails.filter((d) => d.isCorrect);
        const blankList = rawDetails.filter((d) => isBlankItem(d.jawaban));

        const displayedList =
          detailFilterTab === 'wrong'
            ? wrongList
            : detailFilterTab === 'correct'
            ? correctList
            : detailFilterTab === 'blank'
            ? blankList
            : rawDetails;

        const isTuntas = detailResultItem.nilai >= 75;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Hasil Koreksi & Analisis Jawaban Siswa
                    </h3>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        isTuntas ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isTuntas ? 'TUNTAS' : 'REMEDIAL'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    ID Lembar: <span className="font-bold text-slate-700">{detailResultItem.sheetCode}</span> • Waktu Scan: {detailResultItem.waktuScan}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDetailResultItem(null);
                    notify.info('Detail Ditutup');
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student and Score Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px] block">Nama Siswa:</span>
                  <span className="font-bold text-slate-900 text-sm truncate block">
                    {detailResultItem.namaSiswa}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Ujian & Mapel:</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {detailResultItem.examJudul}
                  </span>
                  <span className="text-[10px] text-slate-500 truncate block">
                    {detailResultItem.mapelNama}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Skor / Nilai:</span>
                  <span className="font-black text-blue-700 text-lg">
                    {detailResultItem.nilai}
                    <span className="text-xs font-normal text-slate-400"> / 100</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Rangkuman:</span>
                  <div className="flex items-center gap-1.5 font-bold text-xs mt-0.5">
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      B: {detailResultItem.benar}
                    </span>
                    <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      S: {detailResultItem.salah}
                    </span>
                    <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      K: {detailResultItem.kosong}
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs for Answers */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDetailFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      detailFilterTab === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua Soal
                    <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full">
                      {rawDetails.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailFilterTab('wrong')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      detailFilterTab === 'wrong'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : wrongList.length > 0
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Jawaban Salah
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        detailFilterTab === 'wrong'
                          ? 'bg-white/30 text-white'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {wrongList.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailFilterTab('correct')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      detailFilterTab === 'correct'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Benar
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                      {correctList.length}
                    </span>
                  </button>

                  {blankList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDetailFilterTab('blank')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        detailFilterTab === 'blank'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Kosong ({blankList.length})
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 hidden sm:block">
                  Menampilkan {displayedList.length} dari {rawDetails.length} soal
                </div>
              </div>

              {/* Questions List with Prominent Wrong Answer Markings */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
                {displayedList.map((item) => {
                  const isBlank = isBlankItem(item.jawaban);
                  const isWrong = !isBlank && !item.isCorrect;
                  const isCorrect = item.isCorrect;

                  if (isWrong) {
                    return (
                      <div
                        key={item.nomor}
                        className="p-3.5 rounded-xl border-2 border-rose-400 bg-rose-50/80 shadow-xs space-y-2 transition animate-in fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs">
                              Nomor {item.nomor}
                            </span>
                            <span className="px-1.5 py-0.5 bg-slate-200/90 text-slate-700 text-[10px] font-bold uppercase rounded">
                              {item.tipe}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Bobot: {item.bobot} poin
                            </span>
                          </div>

                          <span className="px-2.5 py-0.5 bg-rose-600 text-white font-black text-[11px] rounded-full inline-flex items-center gap-1 shadow-xs">
                            <XCircle className="w-3.5 h-3.5" />
                            JAWABAN SALAH
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                          <div className="p-2 bg-white rounded-lg border border-rose-200 flex flex-col justify-between">
                            <span className="text-slate-500 text-[11px] block">Jawaban Siswa:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-black text-rose-700 font-mono text-sm px-2 py-0.5 bg-rose-100 rounded border border-rose-300 line-through">
                                {formatVal(item.jawaban)}
                              </span>
                              <span className="text-[11px] font-semibold text-rose-600">
                                (Jawaban Keliru)
                              </span>
                            </div>
                          </div>

                          <div className="p-2 bg-white rounded-lg border border-emerald-200 flex flex-col justify-between">
                            <span className="text-slate-500 text-[11px] block">Kunci Jawaban yang Benar:</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-black text-white font-mono text-sm px-2.5 py-0.5 bg-emerald-600 rounded shadow-xs">
                                {formatVal(item.kunci)}
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-700">
                                (Kunci Resmi)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isCorrect) {
                    return (
                      <div
                        key={item.nomor}
                        className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5 text-xs transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">Nomor {item.nomor}</span>
                            <span className="px-1.5 py-0.5 bg-slate-200/80 text-slate-700 text-[10px] font-semibold uppercase rounded">
                              {item.tipe}
                            </span>
                            <span className="text-[10px] text-slate-500">Bobot: {item.bobot}</span>
                          </div>
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[11px] rounded-full inline-flex items-center gap-1 border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            BENAR (+{item.bobot})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-slate-700 pt-0.5">
                          <div>
                            Jawaban Siswa:{' '}
                            <strong className="text-emerald-700 font-mono text-sm px-1.5 py-0.5 bg-emerald-100 rounded">
                              {formatVal(item.jawaban)}
                            </strong>
                          </div>
                          <span className="text-slate-300">•</span>
                          <div>
                            Kunci:{' '}
                            <strong className="text-emerald-700 font-mono text-sm">
                              {formatVal(item.kunci)}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Blank / Empty
                  return (
                    <div
                      key={item.nomor}
                      className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5 text-xs transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Nomor {item.nomor}</span>
                          <span className="px-1.5 py-0.5 bg-slate-200/80 text-slate-700 text-[10px] font-semibold uppercase rounded">
                            {item.tipe}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[11px] rounded-full border border-amber-300">
                          TIDAK DIJAWAB (KOSONG)
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700 pt-0.5">
                        <span>Kunci Jawaban yang Benar:</span>
                        <strong className="text-slate-900 font-mono text-sm px-2 py-0.5 bg-white rounded border border-slate-200">
                          {formatVal(item.kunci)}
                        </strong>
                      </div>
                    </div>
                  );
                })}

                {displayedList.length === 0 && detailFilterTab === 'wrong' && (
                  <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-slate-900 text-sm">Tidak Ada Jawaban Salah!</h4>
                    <p className="text-xs text-slate-600">
                      Seluruh soal yang dijawab siswa ini cocok dengan kunci jawaban.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDetailFilterTab('all')}
                      className="mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Lihat Semua Soal
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {wrongList.length > 0 ? (
                    <span className="text-rose-600 font-bold inline-flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Terdapat {wrongList.length} soal salah yang perlu ditindaklanjuti
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">
                      Semua jawaban diperiksa sesuai kunci
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDetailResultItem(null);
                    notify.info('Detail Ditutup');
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
