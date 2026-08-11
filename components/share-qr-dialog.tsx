"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Share2, Send, QrCode, X } from "lucide-react";

interface ShareQRDialogProps {
  opened: boolean;
  onClose: () => void;
  orderName: string;
  shareCode: string;
}

export default function ShareQRDialog({
  opened,
  onClose,
  orderName,
  shareCode,
}: ShareQRDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!opened) return null;

  const getFullUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/order/${shareCode}`;
    }

    return `/order/${shareCode}`;
  };

  const shareUrl = getFullUrl();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `🍔 Join Group Food Order: "${orderName}"!\n\nChoose your food here:\n${shareUrl}`,
    );

    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: orderName,
          text: `Join group food order "${orderName}"!`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled native share — no action needed.
        if ((error as Error)?.name !== "AbortError") {
          console.error("Share failed:", error);
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="
        fixed inset-0 z-[9999]
        bg-slate-900/60
        backdrop-blur-sm
        animate-fadeIn
        overflow-y-auto
        overscroll-contain
      "
      onClick={onClose}
    >
      <div
        className="
          min-h-full
          flex
          items-start
          sm:items-center
          justify-center
          p-3
          sm:p-6
          pt-[max(0.75rem,env(safe-area-inset-top))]
          pb-[max(0.75rem,env(safe-area-inset-bottom))]
        "
      >
        <div
          className="
            relative
            w-full
            max-w-md
            max-h-[calc(100dvh-1.5rem)]
            sm:max-h-[90dvh]
            overflow-y-auto
            overflow-x-hidden
            bg-white
            rounded-2xl
            sm:rounded-3xl
            border
            border-slate-200
            shadow-2xl
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close share dialog"
            className="
              absolute
              top-3
              right-3
              sm:top-4
              sm:right-4
              z-20
              p-2
              rounded-full
              text-slate-400
              hover:text-slate-700
              hover:bg-slate-100
              active:bg-slate-200
              transition-colors
              cursor-pointer
            "
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div
            className="
              sticky
              top-0
              z-10
              bg-white
              border-b
              border-slate-100
              px-4
              py-4
              sm:px-6
              sm:py-5
              pr-14
            "
          >
            <div className="flex items-center gap-2 font-bold text-slate-900 text-base sm:text-lg">
              <QrCode className="w-5 h-5 text-orange-600 shrink-0" />
              <span>Share Group Order</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-5">
            {/* Description */}
            <div className="text-center">
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Share this link or QR code with your team so everyone can select
                their food choices.
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div
                className="
                  bg-slate-50
                  p-4
                  sm:p-5
                  rounded-2xl
                  border
                  border-slate-200
                  shadow-inner
                  max-w-full
                  overflow-hidden
                "
              >
                <div className="flex justify-center">
                  <QRCodeSVG
                    value={shareUrl}
                    size={180}
                    level="M"
                    includeMargin
                    className="w-[160px] h-[160px] sm:w-[180px] sm:h-[180px]"
                  />
                </div>

                <p
                  className="
                    text-[10px]
                    sm:text-xs
                    text-slate-500
                    font-mono
                    mt-2
                    font-bold
                    tracking-wider
                    text-center
                    break-all
                  "
                >
                  SHARE CODE: #{shareCode}
                </p>
              </div>
            </div>

            {/* Copy Box */}
            <div
              className="
                flex
                items-center
                gap-2
                bg-slate-100
                p-1.5
                rounded-xl
                border
                border-slate-200
                min-w-0
              "
            >
              <input
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Order share link"
                className="
                  bg-transparent
                  text-xs
                  text-slate-800
                  font-mono
                  px-2
                  sm:px-3
                  py-1.5
                  flex-1
                  min-w-0
                  outline-none
                  truncate
                "
              />

              <button
                type="button"
                onClick={handleCopy}
                className={`
                  shrink-0
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  px-3
                  sm:px-3.5
                  py-2
                  rounded-lg
                  text-xs
                  font-bold
                  transition-all
                  cursor-pointer
                  ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                  }
                `}
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}

                <span className="hidden xs:inline">
                  {copied ? "Copied!" : "Copy"}
                </span>
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="
                  w-full
                  flex
                  items-center
                  justify-center
                  gap-2
                  bg-emerald-600
                  hover:bg-emerald-700
                  active:bg-emerald-800
                  text-white
                  font-bold
                  py-3
                  px-3
                  rounded-xl
                  text-xs
                  transition-colors
                  cursor-pointer
                "
              >
                <Send className="w-4 h-4" />
                WhatsApp
              </button>

              <button
                type="button"
                onClick={handleNativeShare}
                className="
                  w-full
                  flex
                  items-center
                  justify-center
                  gap-2
                  bg-slate-800
                  hover:bg-slate-900
                  active:bg-slate-950
                  text-white
                  font-bold
                  py-3
                  px-3
                  rounded-xl
                  text-xs
                  transition-colors
                  cursor-pointer
                "
              >
                <Share2 className="w-4 h-4" />
                Share Link
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
