import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const CancelLinkBox: React.FC<{ url: string }> = ({ url }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Pano izni yoksa kullanıcı metni seçebilir.
    }
  };

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
      <p className="text-[11px] font-semibold text-slate-700">Randevu linkin</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
        Bu linki sakla. Randevu detaylarını görmek veya iptal etmek için kullanacaksın.
      </p>
      <div className="mt-2 flex gap-2">
        <input
          readOnly
          value={url}
          aria-label="Randevu linki"
          onFocus={(event) => event.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-600"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Kopyalandı
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Kopyala
            </>
          )}
        </button>
      </div>
    </div>
  );
};
