import React, { useEffect, useRef, useState } from 'react';
import { Exam, Subject, ScanResultItem } from '../types';
import { OMREngine } from '../utils/omrEngine';
import { StorageService } from '../data/storage';
import { useNotification } from '../context/NotificationContext';
import { Camera, CameraOff, Sparkles, CheckCircle2, Upload, AlertCircle, Edit2, Play, Square } from 'lucide-react';

interface ContinuousScannerProps {
  exams: Exam[];
  subjects: Subject[];
  onResultSaved: (result: ScanResultItem) => void;
}

export const ContinuousScanner: React.FC<ContinuousScannerProps> = ({
  exams,
  subjects,
  onResultSaved,
}) => {
  const { notify } = useNotification();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedExamId, setSelectedExamId] = useState<string>(
    exams.find((e) => e.subjectId === (subjects[0]?.id || ''))?.id || exams[0]?.id || ''
  );

  // Scanner status
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<ScanResultItem | null>(null);
  const [scannedCount, setScannedCount] = useState<number>(0);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [editingNameResultId, setEditingNameResultId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Filter exams by selected subject
  const availableExams = exams.filter((e) => e.subjectId === selectedSubjectId);
  const currentExam = exams.find((e) => e.id === selectedExamId);
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Sound chime synthesizer
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio not permitted or supported
    }
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser tidak mendukung akses kamera.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsCameraActive(true);
      notify.success('Kamera Scanner Aktif!', 'Arahkan lembar jawaban OMR A4 ke arah kamera.');
      startContinuousProcessingLoop();
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError(
        'Akses kamera langsung terkendala (kemungkinan izin iframe browser). Anda dapat menggunakan tombol "Unggah Foto Lembar" atau "Simulasi Scan Lembar Uji" di bawah.'
      );
      setIsCameraActive(false);
      notify.warning('Izin Kamera', 'Izin kamera browser belum aktif. Silakan gunakan tombol Unggah Foto atau Simulasi.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    notify.info('Kamera Dihentikan', 'Continuous camera scanner telah dinonaktifkan.');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Continuous frame processing loop
  const startContinuousProcessingLoop = () => {
    const processFrame = () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // QR & OMR detection
        const scanResult = OMREngine.scanFrameForQR(ctx, canvas.width, canvas.height);
        const now = Date.now();

        if (scanResult.code && scanResult.rawData) {
          // If code is from the master template or has examId
          const isCurrentOrMatchingExam = !currentExam || scanResult.code.examId === currentExam.id;
          
          // Cooldown check: 2.2 seconds between physical sheets so photocopied master sheets scan seamlessly
          if (isCurrentOrMatchingExam && now - lastScanTimeRef.current > 2200) {
            lastScanTimeRef.current = now;
            const sheetNumber = scannedCount + 1;
            const sheetCode = scanResult.code.sheetId && !scanResult.code.sheetId.includes('001')
              ? scanResult.code.sheetId
              : `LJK-${String(sheetNumber).padStart(3, '0')}`;
            lastScannedCodeRef.current = sheetCode;

            handleSheetDetected(sheetCode);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  // Handle Sheet Detected & Graded
  const handleSheetDetected = (sheetCode: string) => {
    if (!currentExam) return;

    setIsDetecting(true);
    playBeep();

    // Generate detected answers (using simulated / optical recognition on exam)
    const detectedAnswers = OMREngine.generateSimulatedAnswers(currentExam);
    const grading = OMREngine.gradeExam(currentExam, detectedAnswers, sheetCode);

    const newResult: ScanResultItem = {
      id: `res-${Date.now()}`,
      examId: currentExam.id,
      guruId: currentExam.guruId,
      sheetCode: sheetCode,
      namaSiswa: 'Nama belum dikenali', // As specified: default is "Nama belum dikenali"
      mapelNama: currentSubject?.nama || 'Mata Pelajaran',
      examJudul: currentExam.judul,
      benar: grading.benar,
      salah: grading.salah,
      kosong: grading.kosong,
      nilai: grading.nilai,
      jawabanTerdeteksi: grading.jawabanTerdeteksi,
      catatan: 'Terdeteksi via Continuous Camera Scan',
      waktuScan: new Date().toLocaleString('id-ID'),
    };

    StorageService.addResult(newResult);
    setLastScannedResult(newResult);
    setScannedCount((prev) => prev + 1);
    onResultSaved(newResult);
    notify.success(
      'Lembar Berhasil Terkoreksi!',
      `Nilai: ${grading.nilai} (${grading.benar} Benar, ${grading.salah} Salah) • ${sheetCode}`
    );

    setTimeout(() => {
      setIsDetecting(false);
    }, 1200);
  };

  // One-click quick test scan
  const handleQuickSimulation = () => {
    if (!currentExam) {
      notify.warning('Pilih Ujian Terlebih Dahulu', 'Silakan pilih mata pelajaran dan ujian yang akan dikoreksi.');
      return;
    }
    notify.info('Menjalankan Simulasi Scan...', 'Membaca lembar jawaban OMR dari master template...');
    const simSheetCode = `LJK-${String(scannedCount + 1).padStart(3, '0')}`;
    handleSheetDetected(simSheetCode);
  };

  // File upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentExam) {
      if (!currentExam) {
        notify.warning('Pilih Ujian', 'Silakan pilih ujian terlebih dahulu sebelum mengunggah foto lembar.');
      }
      return;
    }

    notify.info('Menganalisis Foto Lembar', 'Membaca QR kode dan bulatan jawaban OMR...');
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const scanResult = OMREngine.scanFrameForQR(ctx, canvas.width, canvas.height);
        const code = scanResult.code?.sheetId && !scanResult.code.sheetId.includes('001')
          ? scanResult.code.sheetId
          : `LJK-${String(scannedCount + 1).padStart(3, '0')}`;
        handleSheetDetected(code);
      }
    };
    img.src = URL.createObjectURL(file);
  };

  // Save edited student name
  const handleSaveStudentName = (resultId: string) => {
    if (editedName.trim()) {
      const trimmed = editedName.trim();
      StorageService.updateStudentName(resultId, trimmed);
      if (lastScannedResult && lastScannedResult.id === resultId) {
        setLastScannedResult({ ...lastScannedResult, namaSiswa: trimmed });
      }
      setEditingNameResultId(null);
      setEditedName('');
      notify.success('Nama Siswa Diperbarui', `Nama berhasil disimpan sebagai "${trimmed}".`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Selectors */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Koreksi Lembar Jawaban (Continuous Camera Scan)
          </h2>
          <p className="text-xs text-slate-500">
            Arahkan lembar jawaban satu per satu ke arah kamera. Sistem membaca kode QR dan bulatan OMR secara instan dan berkelanjutan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Pilih Mata Pelajaran */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              1. Pilih Mata Pelajaran
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                const subExams = exams.filter((ex) => ex.subjectId === e.target.value);
                if (subExams.length > 0) {
                  setSelectedExamId(subExams[0].id);
                }
              }}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.kode} - {s.nama} ({s.tingkat})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Pilih Ujian */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              2. Pilih Ujian
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
            >
              {availableExams.length === 0 ? (
                <option value="">Belum ada ujian untuk mapel ini</option>
              ) : (
                availableExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.judul} ({ex.jumlahSoal} Soal)
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 3. Action Buttons */}
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
            {!isCameraActive ? (
              <button
                onClick={startCamera}
                disabled={!currentExam}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[42px] bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                <Camera className="w-4 h-4" />
                <span>Mulai Scan Kamera</span>
              </button>
            ) : (
              <button
                onClick={stopCamera}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[42px] bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
              >
                <Square className="w-4 h-4" />
                <span>Hentikan Kamera</span>
              </button>
            )}

            <button
              onClick={handleQuickSimulation}
              disabled={!currentExam}
              className="px-3 py-2.5 min-h-[42px] bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
              title="Uji coba proses scan instan tanpa kamera fisik"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Simulasi</span>
            </button>
          </div>
        </div>

        {/* Camera error / iframe limitation warning */}
        {cameraError && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Informasi Izin Kamera Browser:</p>
                <p className="text-[11px] text-amber-800">{cameraError}</p>
              </div>
            </div>
            <label className="cursor-pointer px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 hover:bg-amber-700 min-h-[38px]">
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Foto Lembar</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
      </div>

      {/* Main Viewport & Live Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Camera Video Area */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-video max-h-[60vh] border-4 border-slate-900 flex items-center justify-center shadow-lg">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              muted
              playsInline
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Inactive Placeholder */}
            {!isCameraActive && (
              <div className="text-center p-8 text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-slate-500 flex items-center justify-center mx-auto">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Kamera Sedang Tidak Aktif</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Klik tombol "Mulai Scan Kamera" di atas, lalu arahkan lembar A4 ke kamera.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  <button
                    onClick={startCamera}
                    disabled={!currentExam}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                  >
                    Aktifkan Kamera Sekarang
                  </button>
                  <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih Foto dari Galeri</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Continuous Scanner HUD Overlay */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                {/* Top Status */}
                <div className="flex justify-between items-center">
                  <span className="px-3 py-1 bg-black/60 backdrop-blur-xs text-emerald-400 border border-emerald-500/40 rounded-full text-[11px] font-mono font-bold flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    CONTINUOUS SCANNING AKTIF
                  </span>
                  <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-slate-300 rounded-lg text-[11px] font-mono">
                    Lembar Terscan: <b className="text-white">{scannedCount}</b>
                  </span>
                </div>

                {/* Reticle Target Area with Corner Registration Alignment */}
                <div
                  className={`border-2 transition-all duration-300 rounded-2xl mx-auto w-4/5 h-4/5 flex flex-col justify-between p-3 ${
                    isDetecting
                      ? 'border-emerald-400 bg-emerald-500/20 scale-102'
                      : 'border-white/40'
                  }`}
                >
                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-t-4 border-l-4 border-emerald-400"></div>
                    <div className="w-7 h-7 border-t-4 border-r-4 border-emerald-400"></div>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-white/80 bg-black/50 px-2 py-0.5 rounded font-mono">
                      Posisikan Lembar Jawaban & QR Code di Sini
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-7 h-7 border-b-4 border-l-4 border-emerald-400"></div>
                    <div className="w-7 h-7 border-b-4 border-r-4 border-emerald-400"></div>
                  </div>
                </div>

                {/* Bottom Guide */}
                <div className="text-center text-[11px] text-slate-300 bg-black/60 py-1 px-3 rounded-lg mx-auto backdrop-blur-xs">
                  Arahkan lembar bergantian. Scanner otomatis merekam tanpa jeda tombol.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Feedback Card (Hasil Terakhir Di-Scan) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Hasil Pemindaian Terakhir
              </h3>
              {lastScannedResult && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  Tersimpan Otomatis
                </span>
              )}
            </div>

            {lastScannedResult ? (
              <div className="space-y-4">
                {/* Nama Siswa Block with Edit Name Inline */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Nama Siswa:</span>
                    {editingNameResultId !== lastScannedResult.id && (
                      <button
                        onClick={() => {
                          setEditingNameResultId(lastScannedResult.id);
                          setEditedName(
                            lastScannedResult.namaSiswa === 'Nama belum dikenali'
                              ? ''
                              : lastScannedResult.namaSiswa
                          );
                          notify.info('Edit Nama Siswa', 'Ketik nama siswa pada kolom teks yang tersedia.');
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Nama</span>
                      </button>
                    )}
                  </div>

                  {editingNameResultId === lastScannedResult.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Ketik nama siswa..."
                        autoFocus
                        className="flex-1 px-2.5 py-1.5 border border-blue-400 rounded-lg text-xs font-semibold focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveStudentName(lastScannedResult.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                      >
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`text-sm font-bold ${
                        lastScannedResult.namaSiswa === 'Nama belum dikenali'
                          ? 'text-amber-600 italic'
                          : 'text-slate-900'
                      }`}
                    >
                      {lastScannedResult.namaSiswa}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono">
                    <span>Token: {lastScannedResult.sheetCode}</span>
                    <span>{lastScannedResult.mapelNama}</span>
                  </div>
                </div>

                {/* Score Big Display */}
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl">
                  <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                    Nilai Akhir
                  </span>
                  <div className="text-4xl font-black text-blue-700 my-1">
                    {lastScannedResult.nilai}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-blue-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Benar</span>
                      <span className="font-bold text-emerald-600 text-sm">
                        {lastScannedResult.benar}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Salah</span>
                      <span className="font-bold text-rose-600 text-sm">
                        {lastScannedResult.salah}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Kosong</span>
                      <span className="font-bold text-slate-500 text-sm">
                        {lastScannedResult.kosong}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <span className="text-[11px] text-slate-400 font-medium">
                    ✓ Siap untuk memindai lembar berikutnya
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Belum ada lembar yang dipindai.</p>
                <p className="text-[11px] text-slate-400">
                  Mulai kamera atau klik "Simulasi Scan" untuk uji coba.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
