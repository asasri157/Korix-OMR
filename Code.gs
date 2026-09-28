/**
 * KORIX OMR - Code.gs
 * Backend Google Apps Script untuk KORIX OMR
 * 
 * Mengelola seluruh logika backend, database Google Sheets, autentikasi,
 * evaluasi otomatis masa aktif paket (Bulanan/Tahunan/Unlimited),
 * manajemen guru, mata pelajaran, ujian, kunci jawaban, dan grading OMR.
 */

// 1. Web App Entry Point
function doGet(e) {
  var template;
  try {
    template = HtmlService.createTemplateFromFile('Index');
  } catch (err) {
    try {
      template = HtmlService.createTemplateFromFile('Index.html');
    } catch (e2) {
      return HtmlService.createHtmlOutput('<h3>Gagal memuat template Index. Pastikan file Index.html ada di Apps Script project.</h3>');
    }
  }
  return template.evaluate()
    .setTitle('KORIX OMR - Sistem Koreksi Lembar Jawaban')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

// 2. Helper Spreadsheet (Mendukung Container-Bound & Standalone Web App)
function getSpreadsheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
  } catch(e) {}
  
  var props = PropertiesService.getScriptProperties();
  var savedId = props.getProperty('KORIX_SPREADSHEET_ID');
  if (savedId) {
    try {
      var ssById = SpreadsheetApp.openById(savedId);
      if (ssById) return ssById;
    } catch(e2) {}
  }
  
  try {
    var newSs = SpreadsheetApp.create('KORIX OMR - Database');
    props.setProperty('KORIX_SPREADSHEET_ID', newSs.getId());
    return newSs;
  } catch(e3) {
    throw new Error('Gagal menghubungkan Google Spreadsheet. Pastikan skrip terhubung dengan spreadsheet (Extensions > Apps Script).');
  }
}

function getSheet(name) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function getRowsAsObjects(sheetName) {
  var sheet = getSheet(sheetName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var results = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    obj._rowIndex = i + 1; // simpan posisi baris untuk kemudahan update
    results.push(obj);
  }
  return results;
}

// 3. Evaluasi Otomatis Masa Aktif Paket
// Sistem mengecek masa aktif saat login, membuka aplikasi, dan sebelum fitur digunakan.
function evaluateAndSyncUserExpiry(user) {
  if (!user) return null;
  if (user.role === 'superadmin' || user.paket === 'Unlimited' || user.tanggalBerakhir === 'Unlimited') {
    user.paketStatus = 'Aktif';
    return user;
  }
  
  if (user.tanggalBerakhir) {
    var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
    var isExpired = String(todayStr) > String(user.tanggalBerakhir);
    var newStatus = isExpired ? 'Expired' : 'Aktif';
    
    if (user.paketStatus !== newStatus && user._rowIndex) {
      user.paketStatus = newStatus;
      var sheet = getSheet('Users');
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var statusCol = headers.indexOf('paketStatus') + 1;
      if (statusCol > 0) {
        sheet.getRange(user._rowIndex, statusCol).setValue(newStatus);
      }
    }
  }
  return user;
}

// 4. Autentikasi
function login(username, password) {
  try {
    var users = getRowsAsObjects('Users');
    var found = null;
    
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (String(u.username).trim().toLowerCase() === String(username).trim().toLowerCase() && 
          String(u.password).trim() === String(password).trim() &&
          (u.aktif === true || u.aktif === 'TRUE' || u.aktif === 1 || u.aktif === 'true')) {
        found = u;
        break;
      }
    }

    if (found) {
      found = evaluateAndSyncUserExpiry(found);
      delete found.password;
      delete found._rowIndex;
      return { success: true, user: found };
    } else {
      return { success: false, message: 'Username atau password tidak sesuai, atau akun dinonaktifkan.' };
    }
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// 5. Manajemen Guru & Paket (Super Admin)
function getUsers() {
  var users = getRowsAsObjects('Users');
  return users.map(function(u) {
    u = evaluateAndSyncUserExpiry(u);
    delete u.password;
    delete u._rowIndex;
    return u;
  });
}

function addUser(userData) {
  var sheet = getSheet('Users');
  var newId = 'usr-' + new Date().getTime();
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  
  var paket = userData.paket || 'Bulanan';
  var end = '';
  if (paket === 'Unlimited') {
    end = 'Unlimited';
  } else {
    var d = new Date();
    d.setDate(d.getDate() + (paket === 'Bulanan' ? 30 : 365));
    end = Utilities.formatDate(d, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  }

  sheet.appendRow([
    newId,
    userData.username,
    userData.password || 'Guru@12345',
    userData.nama,
    userData.email || '',
    'guru',
    true,
    today,
    paket,
    'Aktif',
    today,
    end,
    userData.namaSekolah || '',
    userData.alamatSekolah || '',
    userData.teleponSekolah || '',
    userData.logoSekolahUrl || ''
  ]);
  
  return { success: true, id: newId };
}

function toggleUserActive(userId, currentStatus) {
  var users = getRowsAsObjects('Users');
  var target = users.find(function(u) { return u.id === userId; });
  if (!target) return { success: false, message: 'User tidak ditemukan' };

  var newStatus = !currentStatus;
  var sheet = getSheet('Users');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colAktif = headers.indexOf('aktif') + 1;
  sheet.getRange(target._rowIndex, colAktif).setValue(newStatus);
  return { success: true, aktif: newStatus };
}

function extendPackage(userId, paketType) {
  var users = getRowsAsObjects('Users');
  var target = users.find(function(u) { return u.id === userId; });
  if (!target) return { success: false, message: 'User tidak ditemukan' };

  var today = new Date();
  var todayStr = Utilities.formatDate(today, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  var newStart = target.tanggalMulai || todayStr;
  var newEnd = '';

  if (paketType === 'Unlimited') {
    newEnd = 'Unlimited';
  } else {
    var daysToAdd = (paketType === 'Bulanan' ? 30 : 365);
    var baseDate = today;
    if (target.paketStatus === 'Aktif' && target.tanggalBerakhir && target.tanggalBerakhir !== 'Unlimited') {
      var prev = new Date(target.tanggalBerakhir);
      if (prev > today) baseDate = prev;
    }
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    newEnd = Utilities.formatDate(baseDate, Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  }

  var sheet = getSheet('Users');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colPaket = headers.indexOf('paket') + 1;
  var colStatus = headers.indexOf('paketStatus') + 1;
  var colMulai = headers.indexOf('tanggalMulai') + 1;
  var colAkhir = headers.indexOf('tanggalBerakhir') + 1;

  sheet.getRange(target._rowIndex, colPaket).setValue(paketType);
  sheet.getRange(target._rowIndex, colStatus).setValue('Aktif');
  sheet.getRange(target._rowIndex, colMulai).setValue(newStart);
  sheet.getRange(target._rowIndex, colAkhir).setValue(newEnd);

  return { success: true, paket: paketType, status: 'Aktif', tanggalBerakhir: newEnd };
}

function deleteUser(userId) {
  var users = getRowsAsObjects('Users');
  var target = users.find(function(u) { return u.id === userId; });
  if (target) {
    var sheet = getSheet('Users');
    sheet.deleteRow(target._rowIndex);
    return { success: true };
  }
  return { success: false, message: 'User tidak ditemukan' };
}

// 6. Profil Guru & Sekolah
function updateTeacherProfile(userId, profile) {
  var users = getRowsAsObjects('Users');
  var target = users.find(function(u) { return u.id === userId; });
  if (!target) return { success: false, message: 'User tidak ditemukan' };

  var sheet = getSheet('Users');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (profile.nama !== undefined) sheet.getRange(target._rowIndex, headers.indexOf('nama') + 1).setValue(profile.nama);
  if (profile.namaSekolah !== undefined) sheet.getRange(target._rowIndex, headers.indexOf('namaSekolah') + 1).setValue(profile.namaSekolah);
  if (profile.alamatSekolah !== undefined) sheet.getRange(target._rowIndex, headers.indexOf('alamatSekolah') + 1).setValue(profile.alamatSekolah);
  if (profile.teleponSekolah !== undefined) sheet.getRange(target._rowIndex, headers.indexOf('teleponSekolah') + 1).setValue(profile.teleponSekolah);
  if (profile.logoSekolahUrl !== undefined) sheet.getRange(target._rowIndex, headers.indexOf('logoSekolahUrl') + 1).setValue(profile.logoSekolahUrl);

  return { success: true };
}

// 6b. Ubah Password Guru (Lama ke Baru)
function changePassword(userId, oldPassword, newPassword) {
  try {
    var users = getRowsAsObjects('Users');
    var target = users.find(function(u) { return u.id === userId; });
    if (!target) {
      return { success: false, message: 'Akun pengguna tidak ditemukan.' };
    }

    if (String(target.password).trim() !== String(oldPassword).trim()) {
      return { success: false, message: 'Password lama yang Anda masukkan tidak sesuai.' };
    }

    if (!newPassword || String(newPassword).trim().length < 6) {
      return { success: false, message: 'Password baru harus memiliki minimal 6 karakter.' };
    }

    if (String(newPassword).trim() === String(oldPassword).trim()) {
      return { success: false, message: 'Password baru tidak boleh sama dengan password lama.' };
    }

    var sheet = getSheet('Users');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colPass = headers.indexOf('password') + 1;
    if (colPass <= 0) {
      return { success: false, message: 'Kolom password tidak ditemukan pada sheet Users.' };
    }

    sheet.getRange(target._rowIndex, colPass).setValue(String(newPassword).trim());
    return { success: true, message: 'Password berhasil diperbarui!' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// 6c. Hapus Hasil Koreksi
function deleteResult(resultId) {
  try {
    var list = getRowsAsObjects('ScanResults');
    var target = list.find(function(r) { return r.id === resultId; });
    if (target) {
      getSheet('ScanResults').deleteRow(target._rowIndex);
      return { success: true };
    }
    return { success: false, message: 'Data hasil koreksi tidak ditemukan.' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

// 7. Landing Page Config
function getLandingConfig() {
  var sheet = getSheet('LandingPage');
  var values = sheet.getDataRange().getValues();
  var config = {};
  for (var i = 1; i < values.length; i++) {
    config[values[i][0]] = values[i][1];
  }
  return config;
}

function saveLandingConfig(configObj) {
  var sheet = getSheet('LandingPage');
  var existing = sheet.getDataRange().getValues();
  var keys = Object.keys(configObj);
  
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var val = configObj[key];
    var found = false;
    for (var r = 1; r < existing.length; r++) {
      if (existing[r][0] === key) {
        sheet.getRange(r + 1, 2).setValue(val);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, val, 'Custom']);
    }
  }
  return { success: true };
}

// 8. Mata Pelajaran (Guru Specific)
function getSubjects(guruId) {
  var list = getRowsAsObjects('Subjects');
  if (!guruId) return list;
  return list.filter(function(s) { return s.guruId === guruId; });
}

function addSubject(sub) {
  var sheet = getSheet('Subjects');
  var newId = sub.id || ('sub-' + new Date().getTime());
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');
  sheet.appendRow([newId, sub.kode, sub.nama, sub.tingkat, sub.guruId, today]);
  return { success: true, id: newId };
}

function deleteSubject(id) {
  var list = getRowsAsObjects('Subjects');
  var target = list.find(function(s) { return s.id === id; });
  if (target) {
    getSheet('Subjects').deleteRow(target._rowIndex);
    return { success: true };
  }
  return { success: false };
}

// 9. Ujian & Kunci Jawaban (Guru Specific)
function getExams(guruId) {
  var exams = getRowsAsObjects('Exams');
  if (guruId) {
    exams = exams.filter(function(e) { return e.guruId === guruId; });
  }
  var questions = getRowsAsObjects('Questions');
  
  return exams.map(function(e) {
    var qList = questions.filter(function(q) { return q.examId === e.id; });
    qList.sort(function(a, b) { return Number(a.nomor) - Number(b.nomor); });
    
    // Parse kunci jika JSON
    e.questions = qList.map(function(q) {
      try {
        if (typeof q.kunci === 'string' && q.kunci.indexOf('[') === 0) {
          q.kunci = JSON.parse(q.kunci);
        }
      } catch(err) {}
      return q;
    });

    try {
      e.tipeSoalCounts = JSON.parse(e.tipeCounts || '{}');
    } catch(err) {
      e.tipeSoalCounts = { pg: e.jumlahSoal || 10, pgk: 0, isian: 0, uraian: 0 };
    }
    return e;
  });
}

function saveExamWithQuestions(exam) {
  var examSheet = getSheet('Exams');
  var qSheet = getSheet('Questions');
  var keySheet = getSheet('AnswerKeys');
  
  var newId = exam.id || ('exam-' + new Date().getTime());
  var today = exam.tanggal || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd');

  // Cek apakah exam sudah ada (mode edit)
  var allExams = getRowsAsObjects('Exams');
  var existing = allExams.find(function(e) { return e.id === newId; });
  
  if (existing) {
    // Update baris exam
    var headers = examSheet.getRange(1, 1, 1, examSheet.getLastColumn()).getValues()[0];
    examSheet.getRange(existing._rowIndex, headers.indexOf('judul') + 1).setValue(exam.judul);
    examSheet.getRange(existing._rowIndex, headers.indexOf('subjectId') + 1).setValue(exam.subjectId);
    examSheet.getRange(existing._rowIndex, headers.indexOf('kelas') + 1).setValue(exam.kelas || 'Kelas X');
    examSheet.getRange(existing._rowIndex, headers.indexOf('tanggal') + 1).setValue(today);
    examSheet.getRange(existing._rowIndex, headers.indexOf('durasiMenit') + 1).setValue(exam.durasiMenit || 90);
    examSheet.getRange(existing._rowIndex, headers.indexOf('jumlahSoal') + 1).setValue(exam.jumlahSoal || (exam.questions ? exam.questions.length : 10));
    examSheet.getRange(existing._rowIndex, headers.indexOf('keterangan') + 1).setValue(exam.keterangan || '');
    examSheet.getRange(existing._rowIndex, headers.indexOf('tipeCounts') + 1).setValue(JSON.stringify(exam.tipeSoalCounts || {}));

    // Hapus questions lama untuk exam ini
    var qRows = getRowsAsObjects('Questions');
    for (var i = qRows.length - 1; i >= 0; i--) {
      if (qRows[i].examId === newId) {
        qSheet.deleteRow(qRows[i]._rowIndex);
      }
    }

    // Hapus answer keys lama
    var kRows = getRowsAsObjects('AnswerKeys');
    for (var k = kRows.length - 1; k >= 0; k--) {
      if (kRows[k].examId === newId) {
        keySheet.deleteRow(kRows[k]._rowIndex);
      }
    }
  } else {
    // Tambah baru
    examSheet.appendRow([
      newId,
      exam.judul,
      exam.subjectId,
      exam.guruId,
      exam.kelas || 'Kelas X',
      today,
      exam.durasiMenit || 90,
      exam.jumlahSoal || (exam.questions ? exam.questions.length : 10),
      exam.keterangan || '',
      JSON.stringify(exam.tipeSoalCounts || {}),
      today
    ]);
  }

  // Masukkan questions baru
  if (exam.questions && exam.questions.length > 0) {
    exam.questions.forEach(function(q) {
      var kunciVal = typeof q.kunci === 'object' ? JSON.stringify(q.kunci) : String(q.kunci);
      qSheet.appendRow([
        'q-' + newId + '-' + q.nomor,
        newId,
        q.nomor,
        q.tipe,
        q.bobot || 5,
        kunciVal,
        q.opsiCount || 5
      ]);

      keySheet.appendRow([
        'key-' + newId + '-' + q.nomor,
        newId,
        q.nomor,
        kunciVal,
        q.bobot || 5
      ]);
    });
  }

  return { success: true, id: newId };
}

function deleteExam(examId) {
  var exams = getRowsAsObjects('Exams');
  var target = exams.find(function(e) { return e.id === examId; });
  if (target) {
    getSheet('Exams').deleteRow(target._rowIndex);
    
    // Hapus questions & keys terkait
    var qSheet = getSheet('Questions');
    var qRows = getRowsAsObjects('Questions');
    for (var i = qRows.length - 1; i >= 0; i--) {
      if (qRows[i].examId === examId) {
        qSheet.deleteRow(qRows[i]._rowIndex);
      }
    }

    var kSheet = getSheet('AnswerKeys');
    var kRows = getRowsAsObjects('AnswerKeys');
    for (var k = kRows.length - 1; k >= 0; k--) {
      if (kRows[k].examId === examId) {
        kSheet.deleteRow(kRows[k]._rowIndex);
      }
    }

    return { success: true };
  }
  return { success: false };
}

// 10. OMR Grading & Scan Results
function gradeAndSaveOMR(scanData) {
  var keySheet = getRowsAsObjects('AnswerKeys');
  var keys = keySheet.filter(function(k) { return k.examId === scanData.examId; });

  var benar = 0;
  var salah = 0;
  var kosong = 0;
  var totalBobot = 0;
  var perolehanBobot = 0;

  var detected = scanData.jawabanTerdeteksi || {};

  keys.forEach(function(k) {
    var bobot = Number(k.bobot) || 5;
    totalBobot += bobot;

    var num = k.nomor;
    var userAns = detected[num];
    var correctAns = k.kunciJawaban || k.kunci;

    if (!userAns || userAns === '' || (Array.isArray(userAns) && userAns.length === 0)) {
      kosong++;
    } else {
      var isCorrect = false;
      try {
        if (typeof correctAns === 'string' && correctAns.indexOf('[') === 0) {
          var correctArr = JSON.parse(correctAns).sort();
          var userArr = (Array.isArray(userAns) ? userAns : [userAns]).sort();
          isCorrect = JSON.stringify(correctArr) === JSON.stringify(userArr);
        } else {
          isCorrect = String(userAns).toUpperCase().trim() === String(correctAns).toUpperCase().trim();
        }
      } catch (e) {
        isCorrect = String(userAns).toUpperCase().trim() === String(correctAns).toUpperCase().trim();
      }

      if (isCorrect) {
        benar++;
        perolehanBobot += bobot;
      } else {
        salah++;
      }
    }
  });

  var nilai = totalBobot > 0 ? Math.round((perolehanBobot / totalBobot) * 100) : 0;

  var resultSheet = getSheet('ScanResults');
  var resId = 'res-' + new Date().getTime();
  var timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');

  resultSheet.appendRow([
    resId,
    scanData.examId,
    scanData.guruId,
    scanData.sheetCode || 'SHT-001',
    scanData.namaSiswa || 'Nama belum dikenali',
    scanData.mapelNama || '',
    scanData.examJudul || '',
    benar,
    salah,
    kosong,
    nilai,
    JSON.stringify(detected),
    timeStr
  ]);

  return {
    success: true,
    result: {
      id: resId,
      examId: scanData.examId,
      guruId: scanData.guruId,
      sheetCode: scanData.sheetCode,
      namaSiswa: scanData.namaSiswa || 'Nama belum dikenali',
      mapelNama: scanData.mapelNama,
      examJudul: scanData.examJudul,
      benar: benar,
      salah: salah,
      kosong: kosong,
      nilai: nilai,
      waktuScan: timeStr
    }
  };
}

function getScanResults(guruId) {
  var list = getRowsAsObjects('ScanResults');
  if (guruId) {
    list = list.filter(function(r) { return r.guruId === guruId; });
  }
  return list.map(function(r) {
    try {
      r.jawabanTerdeteksi = JSON.parse(r.jawabanJson || '{}');
    } catch(e) {
      r.jawabanTerdeteksi = {};
    }
    return r;
  });
}

function updateStudentName(resultId, newName) {
  var list = getRowsAsObjects('ScanResults');
  var target = list.find(function(r) { return r.id === resultId; });
  if (target) {
    var sheet = getSheet('ScanResults');
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colName = headers.indexOf('namaSiswa') + 1;
    sheet.getRange(target._rowIndex, colName).setValue(newName);
    return { success: true };
  }
  return { success: false, message: 'Data hasil scan tidak ditemukan' };
}
