export default function PrinterSettings() {
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
        <h2 className="text-sm font-bold text-black mb-1">Pengaturan Printer</h2>
        <p className="text-[10px] text-gray-600">
          Koneksi printer Epson EP5859 untuk semua perangkat
        </p>
      </div>

      {/* Universal Instructions */}
      <div className="backdrop-blur-3xl bg-blue-50/90 rounded-2xl border border-blue-200 shadow-lg shadow-black/5 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-blue-700 mb-2">📱 Cara Print di Semua Perangkat</h3>
            <p className="text-xs text-blue-600 mb-3 leading-relaxed">
              Printer Epson EP5859 menggunakan sistem print bawaan perangkat Anda. Ikuti langkah berikut:
            </p>

            <div className="bg-white/50 rounded-lg p-3 border border-blue-200 mb-3">
              <p className="text-[10px] font-semibold text-blue-700 mb-2">🔧 Langkah Persiapan (Sekali Saja):</p>
              <ol className="text-[10px] text-blue-600 space-y-2 list-decimal list-inside">
                <li>
                  <strong>Nyalakan Printer Epson EP5859</strong>
                  <div className="ml-5 mt-1 text-[9px]">Pastikan printer dalam keadaan hidup dan siap</div>
                </li>
                <li>
                  <strong>Sambungkan Bluetooth di Pengaturan</strong>
                  <div className="ml-5 mt-1 text-[9px] space-y-1">
                    <p><strong>iPhone/iPad:</strong> Settings → Bluetooth → Tap "EP5859"</p>
                    <p><strong>Android:</strong> Pengaturan → Bluetooth → Tap "EP5859"</p>
                    <p><strong>Windows:</strong> Settings → Devices → Bluetooth → Pair "EP5859"</p>
                    <p><strong>macOS:</strong> System Preferences → Bluetooth → Connect "EP5859"</p>
                  </div>
                </li>
                <li>
                  <strong>Kembali ke Good Ways POS</strong>
                  <div className="ml-5 mt-1 text-[9px]">Printer sudah siap digunakan!</div>
                </li>
              </ol>
            </div>

            <div className="bg-green-50/50 rounded-lg p-3 border border-green-200">
              <p className="text-[10px] font-semibold text-green-700 mb-2">✅ Cara Mencetak Struk:</p>
              <ol className="text-[10px] text-green-600 space-y-1 list-decimal list-inside">
                <li>Lakukan transaksi seperti biasa</li>
                <li>Klik <strong>"Proses Pembayaran"</strong></li>
                <li>Di preview struk, klik <strong>"Print Struk"</strong></li>
                <li>Print dialog perangkat akan terbuka</li>
                <li>Pilih printer <strong>"EP5859"</strong> atau <strong>"EPPOS"</strong></li>
                <li>Klik <strong>"Print"</strong></li>
                <li>✅ Struk tercetak!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting Card */}
      <div className="backdrop-blur-3xl bg-yellow-50/90 rounded-2xl border border-yellow-200 shadow-lg shadow-black/5 p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-xs font-bold text-yellow-700 mb-2">⚠️ Troubleshooting</h3>
            <div className="text-[10px] text-yellow-600 space-y-2">
              <div>
                <p className="font-semibold mb-1">Printer tidak muncul di print dialog:</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5 text-[9px]">
                  <li>Pastikan printer sudah paired di pengaturan Bluetooth perangkat</li>
                  <li>Pastikan printer dalam keadaan hidup</li>
                  <li>Coba restart printer (matikan, lalu nyalakan lagi)</li>
                  <li>Coba unpair dan pair ulang</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Format struk tidak pas:</p>
                <ul className="list-disc list-inside ml-2 space-y-0.5 text-[9px]">
                  <li>Pastikan menggunakan kertas thermal 58mm</li>
                  <li>Pilih ukuran kertas yang sesuai di print dialog</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Printer Info Card */}
      <div className="backdrop-blur-3xl bg-white/70 rounded-2xl border border-black/10 shadow-lg shadow-black/5 p-4">
        <h3 className="text-xs font-semibold text-black mb-3">Informasi Printer</h3>
        <div className="space-y-2 text-[10px]">
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-gray-600">Model</span>
            <span className="font-semibold text-black">Epson EP5859</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-gray-600">Tipe</span>
            <span className="font-semibold text-black">Thermal Bluetooth</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-gray-600">Ukuran Kertas</span>
            <span className="font-semibold text-black">58mm</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-gray-600">Lebar Karakter</span>
            <span className="font-semibold text-black">32 karakter</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Koneksi</span>
            <span className="font-semibold text-black">Bluetooth (Sistem)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
