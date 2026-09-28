import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Exam, ScanResultItem, User } from '../types';

interface ExportLandscapeOptions {
  results: ScanResultItem[];
  selectedExam?: Exam | null;
  guru: User;
  kkm?: number;
  safeLogoUrl?: string;
}

export const exportResultsLandscapePDF = async ({
  results,
  selectedExam,
  guru,
  kkm = 75,
  safeLogoUrl,
}: ExportLandscapeOptions): Promise<void> => {
  if (!results || results.length === 0) {
    throw new Error('Tidak ada data hasil koreksi untuk diunduh.');
  }

  // 1. Initialize Landscape A4 PDF (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 14;
  let currentY = 12;

  // 2. School Header (Kop Surat Sekolah)
  const logo = safeLogoUrl || guru.logoSekolahUrl;
  let textStartX = marginX;
  let textWidth = pageWidth - marginX * 2;

  if (logo) {
    try {
      doc.addImage(logo, 'PNG', marginX, currentY, 16, 16);
      textStartX = marginX + 18;
      textWidth = pageWidth - marginX * 2 - 18;
    } catch {
      // Ignore if image format not supported
    }
  }

  // School Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text((guru.namaSekolah || 'NAMA SEKOLAH / INSTANSI').toUpperCase(), pageWidth / 2, currentY + 3, {
    align: 'center',
  });

  // School Address & Contact
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600
  const subAddress = [guru.alamatSekolah, guru.teleponSekolah ? `Telp: ${guru.teleponSekolah}` : '']
    .filter(Boolean)
    .join(' • ');
  doc.text(subAddress || 'Alamat Satuan Pendidikan', pageWidth / 2, currentY + 8, {
    align: 'center',
  });

  doc.setFontSize(8);
  doc.text(`Guru Pengampu: ${guru.nama} | Email: ${guru.email}`, pageWidth / 2, currentY + 12.5, {
    align: 'center',
  });

  currentY += 17;

  // Double separator line
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  doc.setLineWidth(0.2);
  doc.line(marginX, currentY + 1, pageWidth - marginX, currentY + 1);

  currentY += 6;

  // 3. Document Title & Info Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('REKAPITULASI HASIL KOREKSI UJIAN (LJK OMR)', pageWidth / 2, currentY, {
    align: 'center',
  });

  currentY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const examTitle = selectedExam ? selectedExam.judul : 'Semua Ujian';
  const mapelTitle = selectedExam
    ? results[0]?.mapelNama || 'Mata Pelajaran'
    : 'Semua Mata Pelajaran';
  const kelasTitle = selectedExam ? selectedExam.kelas : '-';
  const totalSoal = selectedExam ? `${selectedExam.jumlahSoal} Soal` : '-';

  doc.text(
    `Ujian: ${examTitle}   |   Mapel: ${mapelTitle}   |   Kelas: ${kelasTitle}   |   Jml Soal: ${totalSoal}   |   KKM: ${kkm}`,
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );

  currentY += 5;

  // 4. Statistics Summary Box
  const scores = results.map((r) => r.nilai);
  const totalSiswa = results.length;
  const avgScore = (scores.reduce((a, b) => a + b, 0) / (totalSiswa || 1)).toFixed(1);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const countTuntas = results.filter((r) => r.nilai >= kkm).length;
  const countRemedial = totalSiswa - countTuntas;
  const pctTuntas = Math.round((countTuntas / (totalSiswa || 1)) * 100);

  // Background for stats box
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 10, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  const statsY = currentY + 6.2;
  const colW = (pageWidth - marginX * 2) / 6;

  doc.text(`Total Peserta: ${totalSiswa} Siswa`, marginX + colW * 0.15, statsY);
  doc.text(`Rata-rata: ${avgScore}`, marginX + colW * 1.8, statsY);
  doc.text(`Tertinggi: ${maxScore}`, marginX + colW * 2.8, statsY);
  doc.text(`Terendah: ${minScore}`, marginX + colW * 3.7, statsY);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text(`Tuntas: ${countTuntas} (${pctTuntas}%)`, marginX + colW * 4.6, statsY);
  doc.setTextColor(185, 28, 28); // red-700
  doc.text(`Remedial: ${countRemedial}`, marginX + colW * 5.4, statsY);

  currentY += 13;

  // 5. Data Table
  const tableData = results.map((r, idx) => {
    const isTuntas = r.nilai >= kkm;
    return [
      idx + 1,
      r.sheetCode || '-',
      r.namaSiswa || 'Nama belum dikenali',
      r.examJudul || '-',
      r.mapelNama || '-',
      r.benar,
      r.salah,
      r.kosong,
      r.nilai,
      isTuntas ? 'TUNTAS' : 'REMEDIAL',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'No',
        'ID Lembar',
        'Nama Siswa',
        'Ujian / Kelas',
        'Mata Pelajaran',
        'Benar (B)',
        'Salah (S)',
        'Kosong (K)',
        'Nilai',
        'Keterangan',
      ],
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 41, 59], // Dark slate navy
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 26, font: 'courier' },
      2: { halign: 'left', cellWidth: 54, fontStyle: 'bold' },
      3: { halign: 'left', cellWidth: 46 },
      4: { halign: 'left', cellWidth: 42 },
      5: { halign: 'center', cellWidth: 18, textColor: [22, 101, 52], fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 18, textColor: [185, 28, 28], fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 18, textColor: [100, 116, 139] },
      8: { halign: 'center', cellWidth: 18, fontStyle: 'bold', fontSize: 9 },
      9: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Highlight Remedial vs Tuntas
      if (data.section === 'body' && data.column.index === 9) {
        if (data.cell.raw === 'TUNTAS') {
          data.cell.styles.textColor = [22, 101, 52]; // Green
          data.cell.styles.fillColor = [240, 253, 244];
        } else {
          data.cell.styles.textColor = [185, 28, 28]; // Red
          data.cell.styles.fillColor = [254, 242, 242];
        }
      }
      // Highlight high score
      if (data.section === 'body' && data.column.index === 8) {
        const val = Number(data.cell.raw);
        if (val >= 90) {
          data.cell.styles.textColor = [29, 78, 216]; // Blue
        } else if (val < kkm) {
          data.cell.styles.textColor = [185, 28, 28]; // Red
        }
      }
      // Highlight wrong column if > 0
      if (data.section === 'body' && data.column.index === 6) {
        const wrongVal = Number(data.cell.raw);
        if (wrongVal > 0) {
          data.cell.styles.textColor = [225, 29, 72];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = data.pageNumber;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `KORIX OMR Scanner • Dicetak pada ${new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })} • Halaman ${currentPage} dari ${totalPages}`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    },
    margin: { left: marginX, right: marginX, bottom: 16 },
  });

  // 6. Signatures Section on Final Page
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 40;
  let sigY = finalY + 12;

  // If remaining space on page is too small, add a new page for signatures
  if (sigY + 35 > pageHeight - 14) {
    doc.addPage();
    sigY = 25;
  }

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const city = guru.alamatSekolah ? guru.alamatSekolah.split(',')[0].trim() : 'Indonesia';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Left Signature: Kepala Sekolah
  const leftX = marginX + 25;
  doc.text('Mengetahui,', leftX, sigY, { align: 'center' });
  doc.text('Kepala Sekolah', leftX, sigY + 5, { align: 'center' });
  doc.line(leftX - 25, sigY + 24, leftX + 25, sigY + 24);
  doc.setFont('helvetica', 'bold');
  doc.text('( ................................................. )', leftX, sigY + 28, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('NIP. ........................................', leftX, sigY + 32, { align: 'center' });

  // Right Signature: Guru Mata Pelajaran
  const rightX = pageWidth - marginX - 35;
  doc.setFontSize(8.5);
  doc.text(`${city}, ${todayStr}`, rightX, sigY, { align: 'center' });
  doc.text('Guru Mata Pelajaran', rightX, sigY + 5, { align: 'center' });
  doc.line(rightX - 25, sigY + 24, rightX + 25, sigY + 24);
  doc.setFont('helvetica', 'bold');
  doc.text(guru.nama || '( ................................................. )', rightX, sigY + 28, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`NIP. ${guru.teleponSekolah ? 'Pengajar Terdaftar' : '........................................'}`, rightX, sigY + 32, {
    align: 'center',
  });

  // 7. Save / Trigger Download
  const cleanTitle = (selectedExam?.judul || 'semua_ujian').toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `rekap_nilai_landscape_${cleanTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
