import React, { useRef, useState } from 'react';
import { AlertCircle, Check, Copy } from 'lucide-react';

type CopyStatus = 'idle' | 'copied' | 'failed';

export const CancelLinkBox: React.FC<{ url: string }> = ({ url }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<CopyStatus>('idle');

  const selectText = () => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
    input.setSelectionRange(0, url.length);
  };

  // Eski tarayıcı / izin kısıtı için senkron fallback.
  const copyFallback = () => {
    try {
      selectText();
      return document.execCommand('copy');
    } catch {
      return false;
    }
  };

  const copy = async () => {
    let copied = copyFallback();

    if (!copied) {
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        copied = false;
      }
    }

    setStatus(copied ? 'copied' : 'failed');

    if (!copied) selectText();
    window.setTimeout(() => setStatus('idle'), 2500);
  };

  return (
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
      <p className="text-[11px] font-semibold text-slate-700">Randevu linkin</p>
      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
        Bu linki sakla. Randevu detaylarını görmek veya iptal etmek için kullanacaksın.
      </p>

      <div className="mt-2 flex gap-2">
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label="Randevu linki"
          onFocus={selectText}
          onClick={selectText}
          className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] text-slate-600"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          {status === 'copied' ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              Kopyalandı
            </>
          ) : status === 'failed' ? (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-red-500" aria-hidden="true" />
              Seçip kopyala
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Kopyala
            </>
          )}
        </button>
      </div>

      <p aria-live="polite" className="mt-1 min-h-[14px] text-[10px] leading-snug">
        {status === 'copied' && (
          <span className="text-emerald-600">Link kopyalandı.</span>
        )}
        {status === 'failed' && (
          <span className="text-red-500">
            Otomatik kopyalanamadı; metin seçildi, Ctrl+C (veya uzun basıp Kopyala) ile alabilirsin.
          </span>
        )}
      </p>
    </div>
  );
};
