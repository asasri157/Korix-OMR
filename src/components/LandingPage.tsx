import React from 'react';
import { LandingPageConfig } from '../types';
import {
  Camera,
  QrCode,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  Layers,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Clock,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  landing: LandingPageConfig;
  onOpenLogin: () => void;
  onQuickLogin?: (role: 'superadmin' | 'guru') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  landing,
  onOpenLogin,
}) => {
  const cleanWaNumber = landing.nomorWhatsApp.replace(/[^0-9]/g, '');

  return (
    <div className="space-y-20 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-6 sm:pt-16 pb-8 sm:pb-12 px-2 sm:px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
          {/* App Brand Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] sm:text-xs font-semibold shadow-xs max-w-full">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate">{landing.namaApp} • Sistem Koreksi Lembar Jawaban Cerdas</span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight">
            {landing.judul}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg lg:text-xl font-medium text-slate-600 max-w-2xl mx-auto leading-relaxed px-2">
            {landing.subjudul}
          </p>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto leading-relaxed px-2">
            {landing.deskripsi}
          </p>

          {/* Call to Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto sm:max-w-none">
            <button
              id="btn-hero-login"
              onClick={onOpenLogin}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition min-h-[44px]"
            >
              <span>Masuk Aplikasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              id="btn-hero-wa"
              href={`https://wa.me/${cleanWaNumber}?text=Halo%20Super%20Admin%20KORIX%20OMR,%20saya%20tertarik%20dengan%20aplikasi%20KORIX%20OMR`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition min-h-[44px]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{landing.teksTombolWhatsApp}</span>
            </a>
          </div>
        </div>
      </section>

      {/* 2. FITUR UTAMA */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8 sm:mb-10 space-y-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Keunggulan Utama</span>
          <h2 className="text-xl sm:text-3xl font-bold text-slate-900">Teknologi OMR Generasi Baru</h2>
          <p className="text-xs sm:text-sm text-slate-500">Koreksi lembar jawaban tanpa scanner mahal, cukup kamera laptop atau smartphone.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {landing.fiturUtama.map((feat, idx) => {
            const icons: Record<string, React.ReactNode> = {
              Camera: <Camera className="w-6 h-6 text-blue-600" />,
              QrCode: <QrCode className="w-6 h-6 text-indigo-600" />,
              FileSpreadsheet: <FileSpreadsheet className="w-6 h-6 text-emerald-600" />,
              Layers: <Layers className="w-6 h-6 text-purple-600" />,
            };
            return (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-bold mb-4">
                  {icons[feat.icon] || <Sparkles className="w-6 h-6 text-blue-600" />}
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{feat.judul}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feat.deskripsi}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. CARA KERJA (3 LANGKAH) */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Alur Sederhana</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Cara Kerja KORIX OMR</h2>
          <p className="text-xs sm:text-sm text-slate-500">Tiga langkah cepat dari persiapan ujian hingga penilaian tuntas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {landing.caraKerja.map((step) => (
            <div
              key={step.langkah}
              className="bg-white p-6 rounded-2xl border border-slate-200 relative shadow-xs"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm mb-4">
                {step.langkah}
              </div>
              <h3 className="font-bold text-slate-900 text-base mb-2">{step.judul}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{step.deskripsi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PAKET DAN HARGA */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Pilihan Langganan</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Paket Hemat untuk Guru & Sekolah</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Masa aktif otomatis diperbarui. Pembayaran praktis via WhatsApp Super Admin.
          </p>
        </div>

        {(!landing.paketList || landing.paketList.length === 0) ? (
          <div className="text-center py-10 px-4 bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
            Daftar paket saat ini sedang disesuaikan. Hubungi kami melalui WhatsApp untuk info langganan.
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${
              landing.paketList.length === 1
                ? 'max-w-md mx-auto'
                : landing.paketList.length === 2
                ? 'sm:grid-cols-2 max-w-2xl mx-auto'
                : 'sm:grid-cols-2 lg:grid-cols-3'
            } gap-6`}
          >
            {landing.paketList.map((pkt) => {
              const waMsg = `Halo%20Super%20Admin%20KORIX%20OMR,%20saya%20ingin%20berlangganan%20${encodeURIComponent(pkt.nama)}`;
              return (
                <div
                  key={pkt.id}
                  className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition relative ${
                    pkt.populer
                      ? 'border-blue-500 shadow-xl ring-2 ring-blue-500/20'
                      : 'border-slate-200 shadow-xs hover:border-slate-300'
                  }`}
                >
                  {pkt.populer && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                      Paling Populer
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{pkt.nama}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {pkt.durasiHari === 0 ? 'Unlimited' : `${pkt.durasiHari} Hari`}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-4">{pkt.keterangan}</p>

                    <div className="mb-6">
                      <span className="text-3xl font-extrabold text-slate-900">{pkt.harga}</span>
                      <span className="text-xs text-slate-500 ml-1">/ {pkt.periode}</span>
                    </div>

                    {(pkt.fitur && pkt.fitur.length > 0) && (
                      <div className="space-y-2.5 mb-6 text-xs text-slate-600 border-t border-slate-100 pt-4">
                        {pkt.fitur.map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <a
                    href={`https://wa.me/${cleanWaNumber}?text=${waMsg}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 transition ${
                      pkt.populer
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Beli via WhatsApp</span>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. FAQ SEDERHANA */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-10 space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
            <HelpCircle className="w-4 h-4 text-blue-600" />
            Tanya Jawab
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Pertanyaan yang Sering Diajukan</h2>
        </div>

        <div className="space-y-4">
          {landing.faqList.map((faq, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">{faq.tanya}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{faq.jawab}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. WHATSAPP CTA BANNER */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-8 sm:p-10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-2xl font-extrabold tracking-tight">Konsultasi & Aktivasi Instan</h3>
            <p className="text-emerald-100 text-xs sm:text-sm max-w-md">
              Hubungi Super Admin KORIX OMR langsung untuk demonstrasi, bantuan teknis, dan perpanjangan paket.
            </p>
          </div>

          <a
            href={`https://wa.me/${cleanWaNumber}?text=Halo%20Super%20Admin%20KORIX%20OMR,%20saya%20ingin%20berkonsultasi`}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 text-sm font-bold rounded-xl shadow-lg transition shrink-0 flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <span>{landing.teksTombolWhatsApp}</span>
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="text-center text-xs text-slate-400 pt-8 border-t border-slate-200">
        <p>{landing.footerText}</p>
      </footer>
    </div>
  );
};
