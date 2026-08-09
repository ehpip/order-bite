'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Share2, Send, QrCode, X } from 'lucide-react';

interface ShareQRDialogProps {
  opened: boolean;
  onClose: () => void;
  orderName: string;
  shareCode: string;
}

export default function ShareQRDialog({ opened, onClose, orderName, shareCode }: ShareQRDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!opened) return null;

  const getFullUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/order/${shareCode}`;
    }
    return `/order/${shareCode}`;
  };

  const shareUrl = getFullUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🍔 Join Group Food Order: "${orderName}"!\n\nChoose your food here:\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: orderName,
        text: `Join group food order "${orderName}"!`,
        url: shareUrl,
      });
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">
          <QrCode className="w-5 h-5 text-orange-600" />
          Share Group Order
        </div>

        <div className="text-center space-y-4">
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Share this link or QR code with your team so everyone can select their food choices.
          </p>

          {/* QR Code */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 inline-block shadow-inner">
            <QRCodeSVG value={shareUrl} size={180} level="M" includeMargin />
            <p className="text-xs text-slate-500 font-mono mt-2 font-bold tracking-wider">
              SHARE CODE: #{shareCode}
            </p>
          </div>

          {/* Copy Box */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent text-xs text-slate-800 font-mono px-3 py-1 flex-1 outline-hidden select-all"
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-2xs'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
