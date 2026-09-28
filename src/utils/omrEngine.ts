import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { Exam, Question } from '../types';

export interface DecodedQRInfo {
  app: string;
  examId: string;
  sheetId: string;
  timestamp?: number;
}

export interface OMRGradingResult {
  sheetCode: string;
  examId: string;
  benar: number;
  salah: number;
  kosong: number;
  nilai: number;
  jawabanTerdeteksi: { [nomor: number]: string | string[] };
  isianTerdeteksi?: { [nomor: number]: string };
  uraianTerdeteksi?: { [nomor: number]: string };
  rawDetails: {
    nomor: number;
    tipe: string;
    kunci: string | string[];
    jawaban: string | string[];
    isCorrect: boolean;
    bobot: number;
  }[];
}

export const OMREngine = {
  // Generate QR Code data URL for the printable sheet
  async generateSheetQR(examId: string, sheetNum: number): Promise<string> {
    const payload = JSON.stringify({
      app: 'KORIX-OMR',
      examId: examId,
      sheetId: `SHT-${sheetNum.toString().padStart(3, '0')}`,
      v: 1
    });
    try {
      return await QRCode.toDataURL(payload, {
        width: 160,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Failed to generate QR code', err);
      return '';
    }
  },

  // Generate Master Template QR Code (single template to photocopy, without per-sheet serialization)
  async generateTemplateQR(examId: string): Promise<string> {
    const payload = JSON.stringify({
      app: 'KORIX-OMR',
      examId: examId,
      template: 'MASTER-A4',
      v: 1
    });
    try {
      return await QRCode.toDataURL(payload, {
        width: 160,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
    } catch (err) {
      console.error('Failed to generate QR code', err);
      return '';
    }
  },

  // Parse QR text
  parseQR(qrString: string): DecodedQRInfo | null {
    try {
      const data = JSON.parse(qrString);
      if (data.app === 'KORIX-OMR' && data.examId) {
        return data as DecodedQRInfo;
      }
      return null;
    } catch {
      // Fallback format: KORIX|examId|sheetId
      if (qrString.startsWith('KORIX|')) {
        const parts = qrString.split('|');
        return {
          app: 'KORIX-OMR',
          examId: parts[1],
          sheetId: parts[2] || 'SHT-001'
        };
      }
      return null;
    }
  },

  // Scan video frame using jsQR
  scanFrameForQR(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): { code: DecodedQRInfo | null; rawData: string | null; location: any } {
    const imageData = ctx.getImageData(0, 0, width, height);
    const qrCode = jsQR(imageData.data, width, height, {
      inversionAttempts: 'dontInvert'
    });

    if (qrCode && qrCode.data) {
      const parsed = this.parseQR(qrCode.data);
      return {
        code: parsed,
        rawData: qrCode.data,
        location: qrCode.location
      };
    }

    return { code: null, rawData: null, location: null };
  },

  // Evaluate answers based on exam questions & detected student answers
  gradeExam(
    exam: Exam,
    detectedAnswers: { [nomor: number]: string | string[] },
    sheetCode: string
  ): OMRGradingResult {
    let benar = 0;
    let salah = 0;
    let kosong = 0;
    let totalScore = 0;
    let maxPossibleScore = 0;

    const rawDetails: OMRGradingResult['rawDetails'] = [];

    exam.questions.forEach((q) => {
      maxPossibleScore += q.bobot;
      const ans = detectedAnswers[q.nomor];

      if (q.tipe === 'pg') {
        const studentAns = (typeof ans === 'string' ? ans : ans?.[0]) || '';
        if (!studentAns) {
          kosong++;
          rawDetails.push({
            nomor: q.nomor,
            tipe: 'pg',
            kunci: q.kunci,
            jawaban: '-',
            isCorrect: false,
            bobot: q.bobot
          });
        } else if (studentAns.toUpperCase() === String(q.kunci).toUpperCase()) {
          benar++;
          totalScore += q.bobot;
          rawDetails.push({
            nomor: q.nomor,
            tipe: 'pg',
            kunci: q.kunci,
            jawaban: studentAns,
            isCorrect: true,
            bobot: q.bobot
          });
        } else {
          salah++;
          rawDetails.push({
            nomor: q.nomor,
            tipe: 'pg',
            kunci: q.kunci,
            jawaban: studentAns,
            isCorrect: false,
            bobot: q.bobot
          });
        }
      } else if (q.tipe === 'pgk') {
        // Pilihan Ganda Kompleks: array comparison
        const keyArr = Array.isArray(q.kunci) ? q.kunci.map((k) => k.toUpperCase()).sort() : [String(q.kunci).toUpperCase()];
        const studentArr = Array.isArray(ans)
          ? ans.map((a) => a.toUpperCase()).sort()
          : ans
          ? [String(ans).toUpperCase()]
          : [];

        if (studentArr.length === 0) {
          kosong++;
          rawDetails.push({
            nomor: q.nomor,
            tipe: 'pgk',
            kunci: keyArr,
            jawaban: [],
            isCorrect: false,
            bobot: q.bobot
          });
        } else {
          // Check full or proportional match
          const isExact =
            keyArr.length === studentArr.length &&
            keyArr.every((val, idx) => val === studentArr[idx]);

          if (isExact) {
            benar++;
            totalScore += q.bobot;
            rawDetails.push({
              nomor: q.nomor,
              tipe: 'pgk',
              kunci: keyArr,
              jawaban: studentArr,
              isCorrect: true,
              bobot: q.bobot
            });
          } else {
            // Check partial credit if subset
            const matchCount = studentArr.filter((k) => keyArr.includes(k)).length;
            const wrongCount = studentArr.filter((k) => !keyArr.includes(k)).length;
            if (matchCount > 0 && wrongCount === 0) {
              const partial = Math.round((matchCount / keyArr.length) * q.bobot);
              totalScore += partial;
              benar += 0.5;
            } else {
              salah++;
            }
            rawDetails.push({
              nomor: q.nomor,
              tipe: 'pgk',
              kunci: keyArr,
              jawaban: studentArr,
              isCorrect: isExact,
              bobot: q.bobot
            });
          }
        }
      } else if (q.tipe === 'isian') {
        // Isian disimpan
        const studentText = typeof ans === 'string' ? ans : '';
        rawDetails.push({
          nomor: q.nomor,
          tipe: 'isian',
          kunci: q.kunci,
          jawaban: studentText || '[Tersimpan untuk dicek]',
          isCorrect: studentText ? studentText.toLowerCase().trim() === String(q.kunci).toLowerCase().trim() : false,
          bobot: q.bobot
        });
        if (studentText && studentText.toLowerCase().trim() === String(q.kunci).toLowerCase().trim()) {
          totalScore += q.bobot;
          benar++;
        }
      } else {
        // Uraian disimpan untuk penilaian manual
        const studentEssay = typeof ans === 'string' ? ans : '';
        rawDetails.push({
          nomor: q.nomor,
          tipe: 'uraian',
          kunci: q.kunci,
          jawaban: studentEssay || '[Tersimpan untuk penilaian guru]',
          isCorrect: false,
          bobot: q.bobot
        });
      }
    });

    const scaledScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

    return {
      sheetCode,
      examId: exam.id,
      benar: Math.floor(benar),
      salah,
      kosong,
      nilai: scaledScore,
      jawabanTerdeteksi: detectedAnswers,
      rawDetails
    };
  },

  // Simulates or processes real test sheet detection
  generateSimulatedAnswers(exam: Exam): { [nomor: number]: string | string[] } {
    const answers: { [nomor: number]: string | string[] } = {};
    exam.questions.forEach((q) => {
      const isRandomWrong = Math.random() < 0.2; // 80% accuracy for realistic scan simulation
      if (q.tipe === 'pg') {
        if (isRandomWrong) {
          const letters = ['A', 'B', 'C', 'D', 'E'];
          answers[q.nomor] = letters[Math.floor(Math.random() * (q.opsiCount || 5))];
        } else {
          answers[q.nomor] = String(q.kunci);
        }
      } else if (q.tipe === 'pgk') {
        if (isRandomWrong) {
          answers[q.nomor] = ['A', 'B'];
        } else {
          answers[q.nomor] = Array.isArray(q.kunci) ? q.kunci : [String(q.kunci)];
        }
      } else if (q.tipe === 'isian') {
        answers[q.nomor] = String(q.kunci);
      } else {
        answers[q.nomor] = 'Jawaban uraian telah ditulis rapi pada lembar';
      }
    });
    return answers;
  }
};
