import React, { useEffect, useState, useRef } from 'react';
import { Exam, Subject, User } from '../types';
import { OMREngine } from '../utils/omrEngine';
import { useNotification } from '../context/NotificationContext';
import { Download, Eye, CheckCircle2, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface PrintableOMRSheetProps {
  exam: Exam;
  guru: User;
  subject: Subject;
}

export const PrintableOMRSheet: React.FC<PrintableOMRSheetProps> = ({ exam, guru, subject }) => {
  const { notify } = useNotification();
  const [templateQrUrl, setTemplateQrUrl] = useState<string>('');
  const [safeLogoUrl, setSafeLogoUrl] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  // Generate Master Template QR (without individual serial numbers so 1 template can be photocopied)
  useEffect(() => {
    let isMounted = true;
    OMREngine.generateTemplateQR(exam.id).then((url) => {
      if (isMounted) {
        setTemplateQrUrl(url);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [exam.id]);

  // Pre-load school logo safely as DataURL to prevent canvas/PDF issues
  useEffect(() => {
    let isMounted = true;
    if (!guru.logoSekolahUrl) {
      setSafeLogoUrl('');
      return;
    }

    if (guru.logoSekolahUrl.startsWith('data:')) {
      setSafeLogoUrl(guru.logoSekolahUrl);
      return;
    }

    fetch(guru.logoSekolahUrl, { mode: 'cors' })
      .then((res) => res.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted && typeof reader.result === 'string') {
            setSafeLogoUrl(reader.result);
          }
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        if (isMounted) {
          setSafeLogoUrl(guru.logoSekolahUrl);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [guru.logoSekolahUrl]);

  // Pure Vector jsPDF Generator (100% Reliable, zero dependency on CSS parsers/html2canvas)
  const handleDownloadPDF = async () => {
    if (isGeneratingPDF) return;

    setIsGeneratingPDF(true);
    notify.info(
      'Menyiapkan Dokumen PDF...',
      'Sedang menyusun template A4 master berkualitas tinggi untuk diunduh.'
    );

    try {
      // 1. Ensure QR Code is generated
      let qrDataUrl = templateQrUrl;
      if (!qrDataUrl) {
        qrDataUrl = await OMREngine.generateTemplateQR(exam.id);
      }

      // 2. Initialize A4 PDF (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      // 4 Solid Corner Detection Markers for Camera Alignment
      pdf.setFillColor(0, 0, 0);
      pdf.rect(7, 7, 6, 6, 'F');
      pdf.rect(197, 7, 6, 6, 'F');
      pdf.rect(7, 284, 6, 6, 'F');
      pdf.rect(197, 284, 6, 6, 'F');

      let currentY = 14;

      // School Logo (Optional)
      const logoUrl = safeLogoUrl || guru.logoSekolahUrl;
      if (logoUrl) {
        try {
          pdf.addImage(logoUrl, 'JPEG', 18, currentY - 3, 13, 13);
        } catch {
          // Gracefully continue without logo if format is not supported by jsPDF
        }
      }

      // School Kop
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(0, 0, 0);
      pdf.text(guru.namaSekolah || 'NAMA SEKOLAH / INSTANSI', 105, currentY, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text(guru.alamatSekolah || 'Alamat Sekolah / Instansi Pendidikan', 105, currentY + 4.5, { align: 'center' });
      currentY += 8.5;

      // Header Separator Line
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.line(16, currentY, 194, currentY);
      currentY += 3.5;

      // Title & Subtitle
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.text('LEMBAR JAWABAN KOMPUTER (LJK)', 105, currentY, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(70, 70, 70);
      pdf.text(exam.judul.toUpperCase(), 105, currentY + 4, { align: 'center' });
      currentY += 6.5;

      // Student Identity Box
      pdf.setDrawColor(180, 180, 180);
      pdf.setFillColor(248, 250, 252);
      pdf.rect(16, currentY, 178, 15, 'FD');
      pdf.setDrawColor(210, 210, 210);
      pdf.line(116, currentY, 116, currentY + 15);

      // Student Identity (Left)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(30, 30, 30);
      pdf.text('NAMA SISWA', 19, currentY + 5.5);
      pdf.text(':', 40, currentY + 5.5);
      pdf.setLineDashPattern([0.5, 0.8], 0);
      pdf.line(42, currentY + 6, 113, currentY + 6);

      pdf.text('NO. ABSEN', 19, currentY + 11.5);
      pdf.text(':', 40, currentY + 11.5);
      pdf.line(42, currentY + 12, 65, currentY + 12);
      pdf.text('KELAS :', 69, currentY + 11.5);
      pdf.line(82, currentY + 12, 113, currentY + 12);
      pdf.setLineDashPattern([], 0);

      // Exam Details (Right)
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(80, 80, 80);
      pdf.text('Mata Pelajaran:', 119, currentY + 5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(subject.nama, 142, currentY + 5);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Tanggal:', 119, currentY + 10.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(exam.tanggal || '-', 133, currentY + 10.5);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('Waktu:', 156, currentY + 10.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`${exam.durasiMenit} Menit`, 167, currentY + 10.5);
      currentY += 17.5;

      // QR Code & Petunjuk Pengisian
      if (qrDataUrl) {
        try {
          pdf.addImage(qrDataUrl, 'PNG', 16, currentY, 14, 14);
        } catch (e) {
          console.warn('QR addImage fallback:', e);
        }
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(20, 20, 20);
      pdf.text('MASTER TEMPLATE RESMI', 32, currentY + 4);
      pdf.setFont('courier', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`ID Ujian: ${exam.id}`, 32, currentY + 8);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(6.5);
      pdf.setTextColor(110, 110, 110);
      pdf.text('Gunakan pensil 2B atau pulpen hitam tebal', 32, currentY + 12);

      // Petunjuk Pengisian (Right)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(30, 30, 30);
      pdf.text('Petunjuk Pengisian:', 194, currentY + 3.5, { align: 'right' });
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(90, 90, 90);
      pdf.text('Hitamkan bulatan secara penuh:', 194, currentY + 7.5, { align: 'right' });

      // Example bubble filled (A)
      pdf.setFillColor(0, 0, 0);
      pdf.circle(162, currentY + 11.5, 1.8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(5);
      pdf.setTextColor(255, 255, 255);
      pdf.text('A', 162, currentY + 12.2, { align: 'center' });
      pdf.setTextColor(20, 120, 40);
      pdf.text('Benar', 166, currentY + 12.2);

      // Example bubble empty (B)
      pdf.setDrawColor(0, 0, 0);
      pdf.circle(180, currentY + 11.5, 1.8, 'S');
      pdf.setTextColor(0, 0, 0);
      pdf.text('B', 180, currentY + 12.2, { align: 'center' });
      pdf.setTextColor(130, 130, 130);
      pdf.text('Kosong', 184, currentY + 12.2);
      currentY += 17;

      // SECTION A: PILIHAN GANDA (PG)
      const pgQuestionsList = exam.questions.filter((q) => q.tipe === 'pg');
      if (pgQuestionsList.length > 0) {
        pdf.setFillColor(40, 40, 40);
        pdf.rect(16, currentY, 178, 4.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text('A. PILIHAN GANDA (PILIH SATU JAWABAN BENAR)', 18, currentY + 3.2);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${pgQuestionsList.length} Soal`, 192, currentY + 3.2, { align: 'right' });
        currentY += 5.5;

        const numCols = pgQuestionsList.length > 30 ? 4 : (pgQuestionsList.length > 15 ? 3 : 2);
        const colWidth = 178 / numCols;
        const numRows = Math.ceil(pgQuestionsList.length / numCols);
        const rowHeight = pgQuestionsList.length > 40 ? 4.8 : 5.2;

        for (let i = 0; i < pgQuestionsList.length; i++) {
          const q = pgQuestionsList[i];
          const col = Math.floor(i / numRows);
          const row = i % numRows;
          const qx = 16 + col * colWidth;
          const qy = currentY + row * rowHeight;

          pdf.setDrawColor(230, 230, 230);
          pdf.line(qx, qy + rowHeight - 0.5, qx + colWidth - 2, qy + rowHeight - 0.5);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6.5);
          pdf.setTextColor(20, 20, 20);
          pdf.text(`${q.nomor}.`, qx + 1, qy + 3.3);

          const opts = ['A', 'B', 'C', 'D', 'E'].slice(0, q.opsiCount || 5);
          const bubbleSpacing = numCols === 4 ? 4.6 : 5.6;
          const bubbleStartX = qx + (numCols === 4 ? 8 : 10);
          for (let o = 0; o < opts.length; o++) {
            const bx = bubbleStartX + o * bubbleSpacing;
            const by = qy + 2.8;
            pdf.setDrawColor(0, 0, 0);
            pdf.circle(bx, by, 1.8, 'S');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(5);
            pdf.setTextColor(0, 0, 0);
            pdf.text(opts[o], bx, by + 0.8, { align: 'center' });
          }
        }
        currentY += numRows * rowHeight + 3.5;
      }

      // SECTION B: PILIHAN GANDA KOMPLEKS (PGK)
      const pgkQuestionsList = exam.questions.filter((q) => q.tipe === 'pgk');
      if (pgkQuestionsList.length > 0) {
        pdf.setFillColor(40, 40, 40);
        pdf.rect(16, currentY, 178, 4.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text('B. PILIHAN GANDA KOMPLEKS (BISA LEBIH DARI SATU JAWABAN)', 18, currentY + 3.2);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${pgkQuestionsList.length} Soal`, 192, currentY + 3.2, { align: 'right' });
        currentY += 5.5;

        const numCols = 2;
        const colWidth = 178 / 2;
        const numRows = Math.ceil(pgkQuestionsList.length / 2);
        const rowHeight = 5.4;

        for (let i = 0; i < pgkQuestionsList.length; i++) {
          const q = pgkQuestionsList[i];
          const col = Math.floor(i / numRows);
          const row = i % numRows;
          const qx = 16 + col * colWidth;
          const qy = currentY + row * rowHeight;

          pdf.setDrawColor(230, 230, 230);
          pdf.line(qx, qy + rowHeight - 0.5, qx + colWidth - 2, qy + rowHeight - 0.5);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6.5);
          pdf.setTextColor(20, 20, 20);
          pdf.text(`${q.nomor}.`, qx + 1, qy + 3.3);

          const opts = ['A', 'B', 'C', 'D', 'E'].slice(0, q.opsiCount || 5);
          const boxSpacing = 6.2;
          const boxStartX = qx + 12;
          for (let o = 0; o < opts.length; o++) {
            const bx = boxStartX + o * boxSpacing;
            const by = qy + 1.2;
            pdf.setDrawColor(0, 0, 0);
            pdf.rect(bx, by, 3.4, 3.4, 'S');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(5);
            pdf.setTextColor(0, 0, 0);
            pdf.text(opts[o], bx + 1.7, by + 2.5, { align: 'center' });
          }
        }
        currentY += numRows * rowHeight + 3.5;
      }

      // SECTION C: ISIAN SINGKAT
      const isianQuestionsList = exam.questions.filter((q) => q.tipe === 'isian');
      if (isianQuestionsList.length > 0) {
        pdf.setFillColor(40, 40, 40);
        pdf.rect(16, currentY, 178, 4.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text('C. ISIAN SINGKAT', 18, currentY + 3.2);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${isianQuestionsList.length} Soal`, 192, currentY + 3.2, { align: 'right' });
        currentY += 5.5;

        const colWidth = (178 - 4) / 2;
        for (let i = 0; i < isianQuestionsList.length; i++) {
          const q = isianQuestionsList[i];
          const col = i % 2;
          const row = Math.floor(i / 2);
          const bx = 16 + col * (colWidth + 4);
          const by = currentY + row * 10;

          pdf.setDrawColor(210, 210, 210);
          pdf.setFillColor(252, 252, 252);
          pdf.rect(bx, by, colWidth, 8, 'FD');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6.5);
          pdf.setTextColor(40, 40, 40);
          pdf.text(`Soal Nomor ${q.nomor}:`, bx + 2, by + 3.2);

          pdf.setDrawColor(160, 160, 160);
          pdf.setLineDashPattern([0.8, 0.8], 0);
          pdf.line(bx + 2, by + 6.5, bx + colWidth - 2, by + 6.5);
          pdf.setLineDashPattern([], 0);
        }
        currentY += Math.ceil(isianQuestionsList.length / 2) * 10 + 3;
      }

      // SECTION D: URAIAN
      const uraianQuestionsList = exam.questions.filter((q) => q.tipe === 'uraian');
      if (uraianQuestionsList.length > 0) {
        pdf.setFillColor(40, 40, 40);
        pdf.rect(16, currentY, 178, 4.5, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255);
        pdf.text('D. URAIAN', 18, currentY + 3.2);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${uraianQuestionsList.length} Soal`, 192, currentY + 3.2, { align: 'right' });
        currentY += 5.5;

        for (let i = 0; i < uraianQuestionsList.length; i++) {
          const q = uraianQuestionsList[i];
          pdf.setDrawColor(210, 210, 210);
          pdf.setFillColor(252, 252, 252);
          pdf.rect(16, currentY, 178, 15, 'FD');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6.5);
          pdf.setTextColor(40, 40, 40);
          pdf.text(`Jawaban Uraian Soal Nomor ${q.nomor}:`, 18, currentY + 3.5);

          pdf.setDrawColor(220, 220, 220);
          pdf.setFillColor(255, 255, 255);
          pdf.rect(18, currentY + 4.5, 174, 9.5, 'FD');
          currentY += 17;
        }
      }

      // Footer Resmi
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(16, 280, 194, 280);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(120, 120, 120);
      pdf.text('Template Master LJK A4 • Siap Diperbanyak', 16, 283.5);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`${subject.nama} (${exam.jumlahSoal} Soal)`, 105, 283.5, { align: 'center' });

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text('KORIX OMR Correction System', 194, 283.5, { align: 'right' });

      // File Name
      const sanitizedTitle = exam.judul.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `Template_LJK_${subject.kode}_${sanitizedTitle}.pdf`;

      // Direct Download Execution via Blob URL
      try {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          if (link.parentNode) {
            link.parentNode.removeChild(link);
          }
          URL.revokeObjectURL(url);
        }, 4000);
      } catch (blobErr) {
        console.warn('Blob download error, falling back to pdf.save:', blobErr);
        pdf.save(fileName);
      }

      notify.success(
        'Template PDF Berhasil Diunduh!',
        `File "${fileName}" telah berhasil disimpan ke perangkat Anda dan siap dicetak/difotokopi.`
      );
    } catch (error) {
      console.error('PDF generation error:', error);
      notify.error(
        'Gagal Mengunduh PDF',
        'Terjadi kendala teknis saat menyusun file PDF. Silakan coba kembali.'
      );
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Group questions by type
  const pgQuestions = exam.questions.filter((q) => q.tipe === 'pg');
  const pgkQuestions = exam.questions.filter((q) => q.tipe === 'pgk');
  const isianQuestions = exam.questions.filter((q) => q.tipe === 'isian');
  const uraianQuestions = exam.questions.filter((q) => q.tipe === 'uraian');

  return (
    <div className="space-y-4">
      {/* Control Toolbar: Master Template Direct Download */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Download className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Download Master Template LJK A4
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cukup unduh 1 lembar template master ini untuk difotokopi / diperbanyak bebas sesuai jumlah siswa di kelas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          {/* Main Primary Download Button: REAL PDF FILE (.pdf) */}
          <button
            id="btn-download-pdf-template"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            title="Download file PDF A4 langsung ke perangkat Anda"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Membuat PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download File PDF (.pdf)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Banner for Teacher */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900 print:hidden">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold">Format Master Siap Fotokopi & Diperbanyak Bebas</p>
          <p className="text-blue-700 text-[11px] leading-relaxed">
            File yang terunduh berisi 1 lembar template A4 standar dengan kolom <b>NAMA SISWA</b>, <b>NO. ABSEN</b>, dan <b>KELAS</b> yang dapat diisi manual oleh siswa. Kode seri individu (seperti QRSHT-001) telah dihapus sehingga 1 lembar master ini dapat difotokopi sebanyak apa pun dan tetap dapat dipindai dengan akurat oleh kamera scanner KORIX.
          </p>
        </div>
      </div>

      {/* Mobile Hint for A4 Sheet Viewing */}
      <div className="sm:hidden px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-700 flex items-center gap-2 print:hidden">
        <Eye className="w-4 h-4 text-slate-500 shrink-0" />
        <span>Geser ke samping untuk melihat tampilan lembar A4 secara utuh.</span>
      </div>

      {/* Single Master Sheet Rendering Container */}
      <div
        ref={sheetContainerRef}
        className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100/60 p-2 sm:p-6 print:p-0 print:border-none print:bg-white print:overflow-visible flex justify-center"
      >
        <div
          className="korix-single-sheet bg-white text-black p-8 sm:p-10 mx-auto w-[794px] min-w-[794px] min-h-[1123px] border border-slate-300 shadow-lg relative font-sans select-none print:m-0 print:p-8 print:border-none print:shadow-none print:w-full shrink-0"
          style={{ width: '794px', minWidth: '794px', minHeight: '1123px', boxSizing: 'border-box' }}
        >
          {/* 4 SOLID CORNER DETECTION MARKS FOR CAMERA ALIGNMENT */}
          <div className="absolute top-4 left-4 w-6 h-6 bg-black" />
          <div className="absolute top-4 right-4 w-6 h-6 bg-black" />
          <div className="absolute bottom-4 left-4 w-6 h-6 bg-black" />
          <div className="absolute bottom-4 right-4 w-6 h-6 bg-black" />

          {/* KOP LEMBAR JAWABAN KOMPUTER (LJK) DENGAN NAMA DAN ABSEN */}
          <div className="border-b-2 border-black pb-2 text-center">
            {/* Header Sekolah & Logo */}
            <div className="flex items-center justify-center gap-3 mb-1.5">
              {(safeLogoUrl || guru.logoSekolahUrl) && (
                <img
                  src={safeLogoUrl || guru.logoSekolahUrl}
                  alt="Logo Sekolah"
                  className="w-12 h-12 object-contain"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
              <div>
                <h2 className="text-lg font-extrabold uppercase tracking-wide leading-tight text-black">
                  {guru.namaSekolah || 'NAMA SEKOLAH / INSTANSI'}
                </h2>
                <p className="text-[11px] text-neutral-700">
                  {guru.alamatSekolah || 'Alamat Sekolah / Instansi Pendidikan'}
                </p>
              </div>
            </div>

            <div className="border-t border-black pt-1.5 mt-1">
              <h1 className="text-base font-black tracking-wider uppercase text-black">
                LEMBAR JAWABAN KOMPUTER (LJK)
              </h1>
              <p className="text-[10px] text-neutral-600 font-semibold uppercase tracking-wider -mt-0.5">
                {exam.judul}
              </p>
            </div>

            {/* KOLOM IDENTITAS SISWA (NAMA & ABSEN) & INFORMASI UJIAN */}
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold mt-2.5 p-2 bg-neutral-50 border border-neutral-400 text-left">
              {/* Kolom Kiri: Nama Siswa & No. Absen */}
              <div className="col-span-7 space-y-1.5 border-r border-neutral-300 pr-3">
                <div className="flex items-center">
                  <span className="w-24 text-neutral-800 font-bold text-[11px]">NAMA SISWA</span>
                  <span className="mr-2 font-bold">:</span>
                  <div className="flex-1 border-b border-black border-dashed h-4"></div>
                </div>
                <div className="flex items-center">
                  <span className="w-24 text-neutral-800 font-bold text-[11px]">NO. ABSEN</span>
                  <span className="mr-2 font-bold">:</span>
                  <div className="w-20 border-b border-black border-dashed h-4"></div>
                  <span className="ml-3 mr-2 text-neutral-800 font-bold text-[11px]">KELAS :</span>
                  <div className="flex-1 border-b border-black border-dashed h-4"></div>
                </div>
              </div>

              {/* Kolom Kanan: Detail Ujian */}
              <div className="col-span-5 space-y-1 pl-2 text-[11px]">
                <div className="truncate">
                  <span className="text-neutral-600 font-normal">Mata Pelajaran: </span>
                  <span className="font-bold text-black">{subject.nama}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    <span className="text-neutral-600 font-normal">Tanggal: </span>
                    <span className="font-bold text-black">{exam.tanggal || '______'}</span>
                  </span>
                  <span>
                    <span className="text-neutral-600 font-normal">Waktu: </span>
                    <span className="font-bold text-black">{exam.durasiMenit} Menit</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QR CODE & PETUNJUK PENGISIAN (MASTER TEMPLATE, BEBAS SERIAL SHT) */}
          <div className="flex items-center justify-between mt-2.5 mb-2 px-1 pb-2 border-b border-dashed border-neutral-300 text-xs">
            <div className="flex items-center gap-2.5">
              {templateQrUrl ? (
                <img
                  src={templateQrUrl}
                  alt={`QR Kode Ujian ${exam.id}`}
                  className="w-13 h-13 border border-black p-0.5 bg-white"
                />
              ) : (
                <div className="w-13 h-13 border border-black flex items-center justify-center text-[10px] font-mono">
                  QR...
                </div>
              )}
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-neutral-900 tracking-wide">
                  MASTER TEMPLATE RESMI
                </div>
                <div className="text-neutral-600 text-[10px] font-mono">
                  ID Ujian: {exam.id}
                </div>
                <div className="text-neutral-500 italic text-[10px]">
                  Gunakan pensil 2B atau pulpen hitam tebal
                </div>
              </div>
            </div>

            <div className="text-right text-[11px]">
              <div className="font-bold text-neutral-800">Petunjuk Pengisian:</div>
              <div className="text-neutral-600 text-[10px]">Hitamkan bulatan secara penuh:</div>
              <div className="inline-flex items-center gap-2 mt-0.5">
                <span className="w-4 h-4 rounded-full bg-black text-white text-[9px] flex items-center justify-center font-bold">
                  A
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Benar</span>
                <span className="w-4 h-4 rounded-full border border-black text-[9px] flex items-center justify-center">
                  B
                </span>
                <span className="text-[10px] text-neutral-400">Kosong</span>
              </div>
            </div>
          </div>

          {/* BODY SOAL */}
          <div className="space-y-3.5 text-xs mt-2">
            {/* BAGIAN A: PILIHAN GANDA (PG) */}
            {pgQuestions.length > 0 && (
              <div>
                <div className="font-bold text-xs uppercase bg-neutral-800 text-white px-2 py-0.5 mb-1.5 flex justify-between">
                  <span>A. PILIHAN GANDA (PILIH SATU JAWABAN BENAR)</span>
                  <span className="text-[11px] font-normal">{pgQuestions.length} Soal</span>
                </div>
                <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                  {pgQuestions.map((q) => (
                    <div
                      key={q.nomor}
                      className="flex items-center justify-between border-b border-neutral-200 py-0.5 px-1"
                    >
                      <span className="w-6 font-bold text-neutral-800 text-[11px]">
                        {q.nomor}.
                      </span>
                      <div className="flex gap-1">
                        {['A', 'B', 'C', 'D', 'E'].slice(0, q.opsiCount || 5).map((opt) => (
                          <div
                            key={opt}
                            className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] font-bold"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BAGIAN B: PILIHAN GANDA KOMPLEKS (PGK) */}
            {pgkQuestions.length > 0 && (
              <div>
                <div className="font-bold text-xs uppercase bg-neutral-800 text-white px-2 py-0.5 mb-1.5 flex justify-between">
                  <span>B. PILIHAN GANDA KOMPLEKS (BISA LEBIH DARI SATU JAWABAN)</span>
                  <span className="text-[11px] font-normal">{pgkQuestions.length} Soal</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {pgkQuestions.map((q) => (
                    <div
                      key={q.nomor}
                      className="flex items-center justify-between border-b border-neutral-200 py-0.5 px-1"
                    >
                      <span className="w-6 font-bold text-neutral-800 text-[11px]">
                        {q.nomor}.
                      </span>
                      <div className="flex gap-1.5">
                        {['A', 'B', 'C', 'D', 'E'].slice(0, q.opsiCount || 5).map((opt) => (
                          <div
                            key={opt}
                            className="w-4 h-4 rounded-sm border border-black flex items-center justify-center text-[9px] font-bold"
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BAGIAN C: ISIAN SINGKAT */}
            {isianQuestions.length > 0 && (
              <div>
                <div className="font-bold text-xs uppercase bg-neutral-800 text-white px-2 py-0.5 mb-1.5 flex justify-between">
                  <span>C. ISIAN SINGKAT</span>
                  <span className="text-[11px] font-normal">{isianQuestions.length} Soal</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {isianQuestions.map((q) => (
                    <div
                      key={q.nomor}
                      className="border border-neutral-300 p-1.5 rounded-xs bg-neutral-50/50"
                    >
                      <div className="font-bold text-[11px] mb-0.5">Soal Nomor {q.nomor}:</div>
                      <div className="h-6 border-b border-neutral-400 border-dashed" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BAGIAN D: URAIAN */}
            {uraianQuestions.length > 0 && (
              <div>
                <div className="font-bold text-xs uppercase bg-neutral-800 text-white px-2 py-0.5 mb-1.5 flex justify-between">
                  <span>D. URAIAN</span>
                  <span className="text-[11px] font-normal">{uraianQuestions.length} Soal</span>
                </div>
                <div className="space-y-2">
                  {uraianQuestions.map((q) => (
                    <div
                      key={q.nomor}
                      className="border border-neutral-300 p-2 rounded-xs bg-neutral-50/50"
                    >
                      <div className="font-bold text-[11px] mb-1">
                        Jawaban Uraian Soal Nomor {q.nomor}:
                      </div>
                      <div className="h-14 border border-neutral-300 bg-white" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* FOOTER LEMBAR RESMI (BEBAS SERIAL SHT) */}
          <div className="absolute bottom-6 left-12 right-12 flex justify-between text-[10px] text-neutral-500 border-t border-neutral-300 pt-1">
            <span>Template Master LJK A4 • Siap Diperbanyak</span>
            <span className="font-semibold text-neutral-700">
              {subject.nama} ({exam.jumlahSoal} Soal)
            </span>
            <span>KORIX OMR Correction System</span>
          </div>
        </div>
      </div>
    </div>
  );
};
