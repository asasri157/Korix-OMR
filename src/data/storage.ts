import { User, LandingPageConfig, Subject, Exam, ScanResultItem, PaketType } from '../types';
import {
  INITIAL_LANDING_PAGE,
  INITIAL_USERS,
  INITIAL_SUBJECTS,
  INITIAL_EXAMS,
  INITIAL_RESULTS,
} from './initialData';

const STORAGE_KEYS = {
  LANDING: 'korix_omr_landing_v2',
  USERS: 'korix_omr_users_v2',
  SUBJECTS: 'korix_omr_subjects_v2',
  EXAMS: 'korix_omr_exams_v2',
  RESULTS: 'korix_omr_results_v2',
  AUTH: 'korix_omr_auth_v2',
};

function getItem<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load storage key:', key, e);
    return defaultVal;
  }
}

function setItem<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Failed to set storage key:', key, e);
  }
}

/**
 * Otomatisasi Masa Aktif:
 * Mengecek apakah tanggalBerakhir sudah lewat. Jika ya, otomatis ubah status jadi Expired.
 */
function evaluateUserExpiration(u: User): User {
  if (u.role === 'superadmin' || u.paket === 'Unlimited' || u.tanggalBerakhir === 'Unlimited') {
    return { ...u, paketStatus: 'Aktif' };
  }

  if (u.tanggalBerakhir) {
    const today = new Date().toISOString().split('T')[0];
    if (today > u.tanggalBerakhir) {
      return { ...u, paketStatus: 'Expired' };
    } else {
      return { ...u, paketStatus: 'Aktif' };
    }
  }

  return u;
}

export const StorageService = {
  // Landing Page Config
  getLanding(): LandingPageConfig {
    return getItem<LandingPageConfig>(STORAGE_KEYS.LANDING, INITIAL_LANDING_PAGE);
  },
  saveLanding(landing: LandingPageConfig): void {
    setItem(STORAGE_KEYS.LANDING, landing);
  },

  // Users Management
  getUsers(): User[] {
    const raw = getItem<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
    // Evaluasi otomatis masa aktif setiap kali get
    const evaluated = raw.map(evaluateUserExpiration);
    return evaluated;
  },
  saveUsers(users: User[]): void {
    setItem(STORAGE_KEYS.USERS, users);
  },
  addUser(user: User): void {
    const users = this.getUsers();
    users.push(evaluateUserExpiration(user));
    this.saveUsers(users);
  },
  updateUser(id: string, updates: Partial<User>): void {
    const users = this.getUsers().map((u) => {
      if (u.id === id) {
        return evaluateUserExpiration({ ...u, ...updates });
      }
      return u;
    });
    this.saveUsers(users);

    // Update logged in user if match
    const current = this.getAuthUser();
    if (current && current.id === id) {
      const updatedUser = users.find((u) => u.id === id);
      if (updatedUser) this.setAuthUser(updatedUser);
    }
  },
  deleteUser(id: string): void {
    const users = this.getUsers().filter((u) => u.id !== id);
    this.saveUsers(users);
  },

  /**
   * Mengaktifkan atau memperpanjang paket Guru
   * Paket: Bulanan (30 hari), Tahunan (365 hari), Unlimited (tidak ada batas)
   */
  extendPackage(userId: string, paket: PaketType): void {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    let newStart = target.tanggalMulai || todayStr;
    let newEnd = '';

    if (paket === 'Unlimited') {
      newEnd = 'Unlimited';
    } else {
      const daysToAdd = paket === 'Bulanan' ? 30 : 365;

      // Jika masih aktif dan belum expired, tambahkan dari tanggal berakhir sebelumnya
      let baseDate = today;
      if (target.paketStatus === 'Aktif' && target.tanggalBerakhir && target.tanggalBerakhir !== 'Unlimited') {
        const prevEnd = new Date(target.tanggalBerakhir);
        if (prevEnd > today) {
          baseDate = prevEnd;
        }
      }

      const futureDate = new Date(baseDate);
      futureDate.setDate(futureDate.getDate() + daysToAdd);
      newEnd = futureDate.toISOString().split('T')[0];
    }

    this.updateUser(userId, {
      paket,
      paketStatus: 'Aktif',
      tanggalMulai: newStart,
      tanggalBerakhir: newEnd,
    });
  },

  // Subjects Management (Guru specific)
  getSubjects(guruId?: string): Subject[] {
    const all = getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    if (!guruId) return all;
    return all.filter((s) => s.guruId === guruId);
  },
  saveSubjects(subjects: Subject[]): void {
    setItem(STORAGE_KEYS.SUBJECTS, subjects);
  },
  addSubject(sub: Subject): void {
    const subs = getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    subs.push(sub);
    this.saveSubjects(subs);
  },
  deleteSubject(id: string): void {
    const subs = getItem<Subject[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS).filter((s) => s.id !== id);
    this.saveSubjects(subs);
  },

  // Exams Management (Guru specific)
  getExams(guruId?: string): Exam[] {
    const all = getItem<Exam[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMS);
    if (!guruId) return all;
    return all.filter((e) => e.guruId === guruId);
  },
  saveExams(exams: Exam[]): void {
    setItem(STORAGE_KEYS.EXAMS, exams);
  },
  addExam(exam: Exam): void {
    const exams = getItem<Exam[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMS);
    exams.push(exam);
    this.saveExams(exams);
  },
  updateExam(updatedExam: Exam): void {
    const exams = getItem<Exam[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMS);
    const index = exams.findIndex((e) => e.id === updatedExam.id);
    if (index !== -1) {
      exams[index] = updatedExam;
      this.saveExams(exams);
    }
  },
  deleteExam(id: string): void {
    const exams = getItem<Exam[]>(STORAGE_KEYS.EXAMS, INITIAL_EXAMS).filter((e) => e.id !== id);
    this.saveExams(exams);
  },

  // Scan Results Management (Guru specific)
  getResults(guruId?: string): ScanResultItem[] {
    const all = getItem<ScanResultItem[]>(STORAGE_KEYS.RESULTS, INITIAL_RESULTS);
    if (!guruId) return all;
    return all.filter((r) => r.guruId === guruId);
  },
  saveResults(results: ScanResultItem[]): void {
    setItem(STORAGE_KEYS.RESULTS, results);
  },
  addResult(result: ScanResultItem): void {
    const results = getItem<ScanResultItem[]>(STORAGE_KEYS.RESULTS, INITIAL_RESULTS);
    results.unshift(result);
    this.saveResults(results);
  },
  updateStudentName(resultId: string, newName: string): void {
    const results = getItem<ScanResultItem[]>(STORAGE_KEYS.RESULTS, INITIAL_RESULTS).map((r) =>
      r.id === resultId ? { ...r, namaSiswa: newName } : r
    );
    this.saveResults(results);
  },
  deleteResult(id: string): void {
    const results = getItem<ScanResultItem[]>(STORAGE_KEYS.RESULTS, INITIAL_RESULTS).filter((r) => r.id !== id);
    this.saveResults(results);
  },

  // Auth Session
  getAuthUser(): User | null {
    const u = getItem<User | null>(STORAGE_KEYS.AUTH, null);
    if (!u) return null;
    return evaluateUserExpiration(u);
  },
  setAuthUser(user: User | null): void {
    if (user) {
      setItem(STORAGE_KEYS.AUTH, evaluateUserExpiration(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.AUTH);
    }
  },
};
