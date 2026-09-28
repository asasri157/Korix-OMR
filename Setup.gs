/**
 * KORIX OMR - Setup.gs
 * Skrip Inisialisasi Database Google Sheets untuk KORIX OMR
 * 
 * Jalankan fungsi setup() sekali saat pertama kali menghubungkan Google Spreadsheet.
 * Fungsi ini membuat seluruh sheet yang diperlukan dan memasang akun demo bawaan.
 */

function setup() {
  var ss = typeof getSpreadsheet === 'function' ? getSpreadsheet() : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    ss = SpreadsheetApp.create('KORIX OMR - Database');
    try { PropertiesService.getScriptProperties().setProperty('KORIX_SPREADSHEET_ID', ss.getId()); } catch(e) {}
  }
  
  // 1. Daftar 9 Sheet Utama sesuai spesifikasi KORIX OMR
  var requiredSheets = [
    'Users',
    'LandingPage',
    'Subjects',
    'Exams',
    'Questions',
    'AnswerKeys',
    'OMRTemplates',
    'ScanResults',
    'Settings'
  ];
  
  // Header kolom untuk masing-masing sheet
  var schemas = {
    'Users': [
      'id', 'username', 'password', 'nama', 'email', 'role', 'aktif', 'createdAt',
      'paket', 'paketStatus', 'tanggalMulai', 'tanggalBerakhir',
      'namaSekolah', 'alamatSekolah', 'teleponSekolah', 'logoSekolahUrl'
    ],
    'LandingPage': ['key', 'value', 'kategori'],
    'Subjects': ['id', 'kode', 'nama', 'tingkat', 'guruId', 'createdAt'],
    'Exams': ['id', 'judul', 'subjectId', 'guruId', 'kelas', 'tanggal', 'durasiMenit', 'jumlahSoal', 'keterangan', 'tipeCounts', 'createdAt'],
    'Questions': ['id', 'examId', 'nomor', 'tipe', 'bobot', 'kunci', 'opsiCount'],
    'AnswerKeys': ['id', 'examId', 'nomor', 'kunciJawaban', 'bobot'],
    'OMRTemplates': ['id', 'examId', 'templateName', 'configJson', 'createdAt'],
    'ScanResults': ['id', 'examId', 'guruId', 'sheetCode', 'namaSiswa', 'mapelNama', 'examJudul', 'benar', 'salah', 'kosong', 'nilai', 'jawabanJson', 'waktuScan'],
    'Settings': ['key', 'value', 'keterangan']
  };
  
  // Buat sheet jika belum ada & atur style header
  requiredSheets.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Pasang header bila sheet baru/kosong
    if (sheet.getLastRow() === 0) {
      var headers = schemas[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1e40af')
        .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });
  
  // 2. Isi Akun Demo Otomatis
  // Super Admin: superadmin / Korix@2026
  // Guru: guru.demo / Guru@12345 (Paket: Tahunan, Aktif, Berakhir: 2027-09-22)
  var userSheet = ss.getSheetByName('Users');
  if (userSheet.getLastRow() <= 1) {
    var demoUsers = [
      [
        'usr-01',
        'superadmin',
        'Korix@2026',
        'Super Admin KORIX',
        'superadmin@korix.sch.id',
        'superadmin',
        true,
        '2026-01-01',
        'Unlimited',
        'Aktif',
        '2026-01-01',
        'Unlimited',
        'KORIX OMR Central System',
        'Pusat Layanan KORIX OMR',
        '081234567890',
        'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80'
      ],
      [
        'usr-02',
        'guru.demo',
        'Guru@12345',
        'Budi Santoso, M.Pd.',
        'budi.santoso@guru.sch.id',
        'guru',
        true,
        '2026-09-01',
        'Tahunan',
        'Aktif',
        '2026-09-22',
        '2027-09-22',
        'SMA NEGERI 1 NUSANTARA',
        'Jl. Merdeka No. 45, Jakarta Pusat, DKI Jakarta',
        '(021) 555-0192',
        'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=160&auto=format&fit=crop&q=80'
      ]
    ];
    userSheet.getRange(2, 1, demoUsers.length, demoUsers[0].length).setValues(demoUsers);
  }
  
  // 3. Isi Konfigurasi Landing Page Awal (Dapat diedit oleh Super Admin)
  var landingSheet = ss.getSheetByName('LandingPage');
  if (landingSheet.getLastRow() <= 1) {
    var landingData = [
      ['namaApp', 'KORIX OMR', 'Brand'],
      ['judul', 'KORIX OMR - Solusi Cerdas Koreksi Lembar Jawaban', 'Hero'],
      ['subjudul', 'Scan Berkelanjutan Cepat, Akurat, Terintegrasi Google Sheets', 'Hero'],
      ['deskripsi', 'Aplikasi OMR modern untuk guru dan pendidik. Memeriksa lembar jawaban A4 dengan continuous camera scan secara otomatis tanpa scanner mahal, tersinkronisasi langsung ke Google Spreadsheet Anda.', 'Hero'],
      ['logoUrl', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=160&auto=format&fit=crop&q=80', 'Brand'],
      ['nomorWhatsApp', '6281234567890', 'Kontak'],
      ['teksTombolWhatsApp', 'Konsultasi & Langganan via WhatsApp', 'Kontak'],
      ['footerText', '© 2026 KORIX OMR. Sistem Koreksi Lembar Jawaban Berbasis Google Apps Script & Google Sheets.', 'Footer'],
      ['paketBulananHarga', 'Rp 49.000', 'Paket'],
      ['paketBulananKeterangan', 'Masa aktif 30 hari otomatis', 'Paket'],
      ['paketTahunanHarga', 'Rp 299.000', 'Paket'],
      ['paketTahunanKeterangan', 'Masa aktif 365 hari (paling hemat)', 'Paket'],
      ['paketUnlimitedHarga', 'Rp 699.000', 'Paket'],
      ['paketUnlimitedKeterangan', 'Sekali bayar aktif selamanya', 'Paket']
    ];
    landingSheet.getRange(2, 1, landingData.length, 3).setValues(landingData);
  }
  
  // 4. Isi Contoh Mata Pelajaran Awal
  var subSheet = ss.getSheetByName('Subjects');
  if (subSheet.getLastRow() <= 1) {
    var initialSubjects = [
      ['sub-01', 'MAT-X', 'Matematika Wajib', 'Kelas X', 'usr-02', '2026-09-01'],
      ['sub-02', 'BIND-X', 'Bahasa Indonesia', 'Kelas X', 'usr-02', '2026-09-01'],
      ['sub-03', 'IPAS-X', 'IPAS (Ilmu Pengetahuan Alam & Sosial)', 'Kelas X', 'usr-02', '2026-09-01'],
      ['sub-04', 'PPKN-X', 'PPKn', 'Kelas X', 'usr-02', '2026-09-01']
    ];
    subSheet.getRange(2, 1, initialSubjects.length, initialSubjects[0].length).setValues(initialSubjects);
  }

  // 5. Isi Contoh Ujian & Kunci Jawaban Awal
  var examSheet = ss.getSheetByName('Exams');
  if (examSheet.getLastRow() <= 1) {
    var initialExams = [
      [
        'exam-01',
        'Penilaian Harian 1: Aljabar & Fungsi',
        'sub-01',
        'usr-02',
        'Kelas X-A',
        '2026-09-22',
        90,
        15,
        'Materi Persamaan dan Pertidaksamaan Nilai Mutlak',
        JSON.stringify({ pg: 10, pgk: 2, isian: 2, uraian: 1 }),
        '2026-09-01'
      ]
    ];
    examSheet.getRange(2, 1, initialExams.length, initialExams[0].length).setValues(initialExams);

    // Soal & Kunci Jawaban
    var qSheet = ss.getSheetByName('Questions');
    var keySheet = ss.getSheetByName('AnswerKeys');
    var demoQuestions = [
      ['q-1', 'exam-01', 1, 'pg', 5, 'A', 5],
      ['q-2', 'exam-01', 2, 'pg', 5, 'C', 5],
      ['q-3', 'exam-01', 3, 'pg', 5, 'B', 5],
      ['q-4', 'exam-01', 4, 'pg', 5, 'D', 5],
      ['q-5', 'exam-01', 5, 'pg', 5, 'A', 5],
      ['q-6', 'exam-01', 6, 'pg', 5, 'E', 5],
      ['q-7', 'exam-01', 7, 'pg', 5, 'C', 5],
      ['q-8', 'exam-01', 8, 'pg', 5, 'B', 5],
      ['q-9', 'exam-01', 9, 'pg', 5, 'D', 5],
      ['q-10', 'exam-01', 10, 'pg', 5, 'A', 5],
      ['q-11', 'exam-01', 11, 'pgk', 10, JSON.stringify(['A', 'C']), 5],
      ['q-12', 'exam-01', 12, 'pgk', 10, JSON.stringify(['B', 'D']), 5],
      ['q-13', 'exam-01', 13, 'isian', 10, '12', 0],
      ['q-14', 'exam-01', 14, 'isian', 10, '25', 0],
      ['q-15', 'exam-01', 15, 'uraian', 10, 'Pembuktian grafik', 0]
    ];
    qSheet.getRange(2, 1, demoQuestions.length, demoQuestions[0].length).setValues(demoQuestions);

    var demoKeys = demoQuestions.map(function(q) {
      return ['key-' + q[0], q[1], q[2], q[5], q[4]];
    });
    keySheet.getRange(2, 1, demoKeys.length, demoKeys[0].length).setValues(demoKeys);
  }

  // 6. Isi Contoh Hasil Scan Siswa
  var resSheet = ss.getSheetByName('ScanResults');
  if (resSheet.getLastRow() <= 1) {
    var demoResults = [
      [
        'res-01',
        'exam-01',
        'usr-02',
        'KORIX-EXAM-01-001',
        'Ahmad Faiz Al-Habsyi',
        'Matematika Wajib',
        'Penilaian Harian 1: Aljabar & Fungsi',
        12,
        2,
        1,
        88,
        JSON.stringify({
          '1': 'A', '2': 'C', '3': 'B', '4': 'D', '5': 'A',
          '6': 'E', '7': 'C', '8': 'B', '9': 'D', '10': 'A',
          '11': ['A', 'C'], '12': ['B'], '13': '12', '14': '25', '15': ''
        }),
        '2026-09-22 09:30:15'
      ],
      [
        'res-02',
        'exam-01',
        'usr-02',
        'KORIX-EXAM-01-002',
        'Siti Rahmawati',
        'Matematika Wajib',
        'Penilaian Harian 1: Aljabar & Fungsi',
        10,
        4,
        1,
        74,
        JSON.stringify({
          '1': 'A', '2': 'B', '3': 'B', '4': 'D', '5': 'C',
          '6': 'E', '7': 'C', '8': 'B', '9': 'C', '10': 'A',
          '11': ['A', 'C'], '12': ['B', 'D'], '13': '12', '14': '20', '15': ''
        }),
        '2026-09-22 09:31:02'
      ]
    ];
    resSheet.getRange(2, 1, demoResults.length, demoResults[0].length).setValues(demoResults);
  }
  
  // 7. Isi Settings
  var setSheet = ss.getSheetByName('Settings');
  if (setSheet.getLastRow() <= 1) {
    var initialSettings = [
      ['APP_NAME', 'KORIX OMR', 'Nama Aplikasi'],
      ['VERSION', '2.0.0', 'Versi Sistem'],
      ['CORNER_DETECTION_THRESHOLD', '0.65', 'Sensitivitas deteksi sudut lembar A4'],
      ['OMR_BLACK_THRESHOLD', '110', 'Ambang kehitaman pensil/pulpen pada bulatan']
    ];
    setSheet.getRange(2, 1, initialSettings.length, initialSettings[0].length).setValues(initialSettings);
  }

  return { success: true, message: 'Setup Google Sheets KORIX OMR berhasil dijalankan!' };
}
