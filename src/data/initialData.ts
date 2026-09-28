import { User, LandingPageConfig, Subject, Exam, ScanResultItem } from '../types';

export const INITIAL_LANDING_PAGE: LandingPageConfig = {
  namaApp: 'KORIX OMR',
  judul: 'KORIX OMR - Solusi Cerdas Koreksi Lembar Jawaban',
  subjudul: 'Scan Berkelanjutan Cepat, Akurat, Terintegrasi Google Sheets',
  deskripsi: 'Aplikasi OMR modern untuk guru dan pendidik. Memeriksa lembar jawaban A4 dengan continuous camera scan secara otomatis tanpa scanner mahal, tersinkronisasi langsung ke Google Spreadsheet Anda.',
  logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80',
  fiturUtama: [
    {
      icon: 'Camera',
      judul: 'Continuous Camera Scan',
      deskripsi: 'Kamera tetap aktif terus-menerus. Cukup arahkan lembar jawaban satu per satu tanpa menekan tombol scan berulang kali.'
    },
    {
      icon: 'QrCode',
      judul: 'QR Code & Corner Detection',
      deskripsi: 'Dilengkapi tanda sudut hitam presisi dan QR Code unik pada setiap lembar untuk membaca identitas soal secara instan.'
    },
    {
      icon: 'FileSpreadsheet',
      judul: 'Google Sheets Database',
      deskripsi: 'Seluruh data ujian, kunci, rekap nilai, dan akun tersimpan rapi langsung di Google Spreadsheet Anda.'
    },
    {
      icon: 'Layers',
      judul: '4 Jenis Soal Fleksibel',
      deskripsi: 'Mendukung Pilihan Ganda (PG), Pilihan Ganda Kompleks (PGK), Isian Singkat, dan Uraian dalam satu lembar A4 terpadu.'
    }
  ],
  caraKerja: [
    {
      langkah: 1,
      judul: 'Buat Mapel & Ujian',
      deskripsi: 'Guru membuat mata pelajaran, mengatur soal, dan menentukan kunci jawaban PG serta PGK.'
    },
    {
      langkah: 2,
      judul: 'Cetak Lembar Jawaban A4',
      deskripsi: 'Tentukan jumlah lembar siswa, cetak sekaligus dengan QR Code unik dan tanda deteksi sudut.'
    },
    {
      langkah: 3,
      judul: 'Arahkan Lembar ke Kamera',
      deskripsi: 'Buka scanner OMR, arahkan lembar satu per satu. Sistem langsung menilai dan menyimpan ke Google Sheets!'
    }
  ],
  paketList: [
    {
      id: 'bulanan',
      nama: 'Paket Bulanan',
      durasiHari: 30,
      harga: 'Rp 49.000',
      periode: 'per bulan (30 hari)',
      keterangan: 'Pilihan fleksibel untuk evaluasi berkala dan ujian bulanan.',
      fitur: [
        'Masa aktif 30 hari otomatis',
        'Semua jenis soal (PG, PGK, Isian, Uraian)',
        'Continuous scan kamera smartphone & laptop',
        'Cetak lembar A4 & batch generator',
        'Ekspor rekap nilai ke CSV & Google Sheets'
      ]
    },
    {
      id: 'tahunan',
      nama: 'Paket Tahunan',
      durasiHari: 365,
      harga: 'Rp 299.000',
      periode: 'per tahun (365 hari)',
      populer: true,
      keterangan: 'Paling hemat untuk 2 semester tahun ajaran penuh.',
      fitur: [
        'Masa aktif 365 hari otomatis',
        'Semua jenis soal (PG, PGK, Isian, Uraian)',
        'Continuous scan tanpa batas lembar',
        'Custom profil sekolah & logo per guru',
        'Ekspor rekap nilai ke CSV & Google Sheets',
        'Dukungan prioritas WhatsApp Super Admin'
      ]
    },
    {
      id: 'unlimited',
      nama: 'Paket Unlimited',
      durasiHari: 0,
      harga: 'Rp 699.000',
      periode: 'sekali bayar selamanya',
      keterangan: 'Akses seumur hidup tanpa masa kedaluwarsa.',
      fitur: [
        'Masa aktif selamanya (tanpa expired)',
        'Akses tak terbatas seluruh fitur',
        'Continuous scan tanpa batas lembar',
        'Dapat digunakan untuk semua tahun ajaran',
        'Free update template dan fitur baru'
      ]
    }
  ],
  faqList: [
    {
      tanya: 'Bagaimana cara kerja Continuous Scan pada kamera?',
      jawab: 'Setelah guru mengklik "Mulai Scan Kamera", kamera akan menyala terus. Guru cukup meletakkan lembar jawaban siswa di depan kamera bergantian. Suara konfirmasi (beep) akan berbunyi saat lembar berhasil terbaca dan tersimpan otomatis.'
    },
    {
      tanya: 'Apakah lembar ujian mencantumkan nama siswa?',
      jawab: 'Tidak. Lembar jawaban A4 KORIX OMR bersih tanpa kolom nama, nomor peserta, maupun kelas. Setiap lembar memiliki nomor token QR unik. Guru dapat mengisikan atau mengedit nama siswa langsung di hasil scan atau tabel rekap.'
    },
    {
      tanya: 'Bagaimana cara pembayaran dan aktivasi paket?',
      jawab: 'Pembayaran dilakukan di luar web melalui transfer langsung. Guru menghubungi Super Admin via tombol WhatsApp resmi yang tersedia di web untuk konfirmasi dan aktivasi instan.'
    },
    {
      tanya: 'Apa yang terjadi jika masa aktif paket berakhir?',
      jawab: 'Sistem secara otomatis mengubah status menjadi Expired. Fitur utama guru (membuat ujian, mencetak lembar, dan scan OMR) akan terkunci hingga Super Admin memperpanjang paket.'
    }
  ],
  nomorWhatsApp: '6281234567890',
  teksTombolWhatsApp: 'Hubungi Super Admin via WhatsApp',
  footerText: '© 2026 KORIX OMR. Sistem Koreksi Lembar Jawaban Otomatis & Cerdas.'
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user-superadmin',
    username: 'superadmin',
    password: 'Korix@2026',
    nama: 'Super Admin KORIX',
    email: 'superadmin@korix.sch.id',
    role: 'superadmin',
    aktif: true,
    createdAt: '2026-01-01',
    paket: 'Unlimited',
    paketStatus: 'Aktif',
    tanggalMulai: '2026-01-01',
    tanggalBerakhir: 'Unlimited',
    namaSekolah: 'KORIX OMR Central System',
    alamatSekolah: 'Jl. Pendidikan No. 1',
    logoSekolahUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-guru-demo',
    username: 'guru.demo',
    password: 'Guru@12345',
    nama: 'Budi Santoso, M.Pd.',
    email: 'budi.santoso@guru.sch.id',
    role: 'guru',
    aktif: true,
    createdAt: '2026-09-01',
    paket: 'Tahunan',
    paketStatus: 'Aktif',
    tanggalMulai: '2026-09-22',
    tanggalBerakhir: '2027-09-22', // As example: 22 September 2027
    namaSekolah: 'SMA NEGERI 1 NUSANTARA',
    alamatSekolah: 'Jl. Merdeka No. 45, Jakarta Pusat, DKI Jakarta',
    teleponSekolah: '(021) 555-0192',
    emailSekolah: 'info@sman1nusantara.sch.id',
    logoSekolahUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=160&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-guru-siti',
    username: 'guru.siti',
    password: 'Guru@12345',
    nama: 'Siti Rahmawati, S.Si.',
    email: 'siti.rahma@guru.sch.id',
    role: 'guru',
    aktif: true,
    createdAt: '2026-08-01',
    paket: 'Bulanan',
    paketStatus: 'Expired', // Demo expired account
    tanggalMulai: '2026-08-01',
    tanggalBerakhir: '2026-08-31',
    namaSekolah: 'SMP BINA BANGSA',
    alamatSekolah: 'Jl. Kartini No. 12, Bandung',
    teleponSekolah: '(022) 777-1234',
    logoSekolahUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=160&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-01',
    kode: 'MAT-X',
    nama: 'Matematika Wajib',
    tingkat: 'Kelas X',
    guruId: 'user-guru-demo'
  },
  {
    id: 'sub-02',
    kode: 'BIND-X',
    nama: 'Bahasa Indonesia',
    tingkat: 'Kelas X',
    guruId: 'user-guru-demo'
  },
  {
    id: 'sub-03',
    kode: 'IPAS-X',
    nama: 'IPAS (Ilmu Pengetahuan Alam & Sosial)',
    tingkat: 'Kelas X',
    guruId: 'user-guru-demo'
  },
  {
    id: 'sub-04',
    kode: 'PPKN-X',
    nama: 'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
    tingkat: 'Kelas X',
    guruId: 'user-guru-demo'
  },
  {
    id: 'sub-05',
    kode: 'PAI-X',
    nama: 'Pendidikan Agama Islam (PAI)',
    tingkat: 'Kelas X',
    guruId: 'user-guru-demo'
  },
  {
    id: 'sub-06',
    kode: 'BJAW-X',
    nama: 'Bahasa Jawa',
    tingkat: 'Kelas X',
    guruId: 'user-guru-demo'
  }
];

export const INITIAL_EXAMS: Exam[] = [
  {
    id: 'exam-mat-01',
    judul: 'Penilaian Harian 1: Aljabar & Fungsi',
    subjectId: 'sub-01',
    guruId: 'user-guru-demo',
    kelas: 'Kelas X-A',
    tanggal: '2026-09-22',
    durasiMenit: 90,
    jumlahSoal: 15,
    keterangan: 'Materi Persamaan Kuadrat dan Sistem Persamaan Linier',
    tipeSoalCounts: {
      pg: 10,
      pgk: 2,
      isian: 2,
      uraian: 1
    },
    questions: [
      { nomor: 1, tipe: 'pg', bobot: 5, kunci: 'A', opsiCount: 5 },
      { nomor: 2, tipe: 'pg', bobot: 5, kunci: 'C', opsiCount: 5 },
      { nomor: 3, tipe: 'pg', bobot: 5, kunci: 'B', opsiCount: 5 },
      { nomor: 4, tipe: 'pg', bobot: 5, kunci: 'D', opsiCount: 5 },
      { nomor: 5, tipe: 'pg', bobot: 5, kunci: 'E', opsiCount: 5 },
      { nomor: 6, tipe: 'pg', bobot: 5, kunci: 'A', opsiCount: 5 },
      { nomor: 7, tipe: 'pg', bobot: 5, kunci: 'C', opsiCount: 5 },
      { nomor: 8, tipe: 'pg', bobot: 5, kunci: 'B', opsiCount: 5 },
      { nomor: 9, tipe: 'pg', bobot: 5, kunci: 'D', opsiCount: 5 },
      { nomor: 10, tipe: 'pg', bobot: 5, kunci: 'A', opsiCount: 5 },
      { nomor: 11, tipe: 'pgk', bobot: 10, kunci: ['A', 'C'], opsiCount: 5 },
      { nomor: 12, tipe: 'pgk', bobot: 10, kunci: ['B', 'D', 'E'], opsiCount: 5 },
      { nomor: 13, tipe: 'isian', bobot: 10, kunci: 'x = 4 atau x = -2' },
      { nomor: 14, tipe: 'isian', bobot: 10, kunci: 'f(x) = 2x + 5' },
      { nomor: 15, tipe: 'uraian', bobot: 10, kunci: 'Langkah pemfaktoran aljabar' }
    ],
    createdAt: '2026-09-20'
  }
];

export const INITIAL_RESULTS: ScanResultItem[] = [
  {
    id: 'res-101',
    examId: 'exam-mat-01',
    guruId: 'user-guru-demo',
    sheetCode: 'SHT-001',
    namaSiswa: 'Ahmad Fauzi',
    mapelNama: 'Matematika Wajib',
    examJudul: 'Penilaian Harian 1: Aljabar & Fungsi',
    benar: 11,
    salah: 1,
    kosong: 0,
    nilai: 92,
    jawabanTerdeteksi: { 1: 'A', 2: 'C', 3: 'B', 4: 'D', 5: 'E', 6: 'A', 7: 'C', 8: 'B', 9: 'D', 10: 'A', 11: ['A', 'C'], 12: ['B', 'D'] },
    catatan: 'Terdeteksi via Continuous Camera Scan',
    waktuScan: '2026-09-22 08:30:15'
  },
  {
    id: 'res-102',
    examId: 'exam-mat-01',
    guruId: 'user-guru-demo',
    sheetCode: 'SHT-002',
    namaSiswa: 'Nama belum dikenali',
    mapelNama: 'Matematika Wajib',
    examJudul: 'Penilaian Harian 1: Aljabar & Fungsi',
    benar: 9,
    salah: 3,
    kosong: 0,
    nilai: 78,
    jawabanTerdeteksi: { 1: 'A', 2: 'B', 3: 'B', 4: 'D', 5: 'A', 6: 'A', 7: 'C', 8: 'B', 9: 'D', 10: 'C', 11: ['A', 'C'], 12: ['B', 'D', 'E'] },
    catatan: 'Terdeteksi via Continuous Camera Scan',
    waktuScan: '2026-09-22 08:31:02'
  }
];
