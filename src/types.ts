export type UserRole = 'superadmin' | 'guru';

export type PaketType = 'Bulanan' | 'Tahunan' | 'Unlimited' | 'None';
export type PaketStatus = 'Aktif' | 'Expired' | 'Pending';
export type TeacherTab = 'subjects' | 'exams' | 'sheet' | 'scan' | 'results' | 'profile' | 'password';

export interface User {
  id: string;
  username: string;
  password?: string;
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  createdAt: string;

  // Paket & Masa Aktif
  paket: PaketType;
  paketStatus: PaketStatus;
  tanggalMulai: string; // YYYY-MM-DD
  tanggalBerakhir: string; // YYYY-MM-DD or 'Unlimited'

  // Profil Guru & Sekolah Guru (Guru mengelola profil sekolahnya sendiri)
  namaSekolah: string;
  alamatSekolah: string;
  teleponSekolah?: string;
  emailSekolah?: string;
  logoSekolahUrl: string;
}

export interface PaketPricingItem {
  id: string;
  nama: string;
  durasiHari: number; // 30, 365, 0 (unlimited)
  harga: string;
  periode: string;
  populer?: boolean;
  keterangan: string;
  fitur: string[];
}

export interface FaqItem {
  tanya: string;
  jawab: string;
}

export interface CaraKerjaItem {
  langkah: number;
  judul: string;
  deskripsi: string;
}

export interface LandingPageConfig {
  namaApp: string;
  judul: string;
  subjudul: string;
  deskripsi: string;
  logoUrl: string;
  fiturUtama: {
    icon: string;
    judul: string;
    deskripsi: string;
  }[];
  caraKerja: CaraKerjaItem[];
  paketList: PaketPricingItem[];
  faqList: FaqItem[];
  nomorWhatsApp: string; // Misal: 6281234567890
  teksTombolWhatsApp: string; // Misal: "Langganan via WhatsApp"
  footerText: string;
}

export interface Subject {
  id: string;
  kode: string;
  nama: string;
  tingkat: string;
  guruId: string;
}

export type QuestionType = 'pg' | 'pgk' | 'isian' | 'uraian';

export interface Question {
  nomor: number;
  tipe: QuestionType;
  bobot: number;
  pertanyaan?: string;
  kunci: string | string[]; // pg: "A", pgk: ["A", "C"], isian: "teks", uraian: "rubrik"
  opsiCount?: number; // usually 4 (A-D) or 5 (A-E)
}

export interface Exam {
  id: string;
  judul: string;
  subjectId: string;
  guruId: string;
  kelas: string;
  tanggal: string;
  durasiMenit: number;
  jumlahSoal: number;
  keterangan: string;
  tipeSoalCounts: {
    pg: number;
    pgk: number;
    isian: number;
    uraian: number;
  };
  questions: Question[];
  createdAt: string;
}

export interface ScanResultItem {
  id: string;
  examId: string;
  guruId: string;
  sheetCode: string; // QR code identifier on sheet
  namaSiswa: string; // default "Nama belum dikenali"
  noAbsen?: string;
  mapelNama: string;
  examJudul: string;
  benar: number;
  salah: number;
  kosong: number;
  nilai: number;
  jawabanTerdeteksi: {
    [key: number]: string | string[];
  };
  catatan?: string;
  waktuScan: string;
}
