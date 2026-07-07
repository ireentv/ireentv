import { X, Tv, Smartphone, Laptop, Download, Info, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess: () => void;
}

export default function DownloadModal({ isOpen, onClose, deferredPrompt, onInstallSuccess }: DownloadModalProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Reset local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setShowInstructions(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePwaInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
          setIsInstalled(true);
          onInstallSuccess();
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          console.log('User dismissed the PWA install prompt');
        }
      } catch (err) {
        console.error('Error prompting PWA install:', err);
        setShowInstructions(true);
      }
    } else {
      // No automatic prompt available - show manual instructions
      setShowInstructions(true);
    }
  };

  return (
    <div
      id="download-modal-overlay"
      className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === 'download-modal-overlay') onClose();
      }}
    >
      <div className="bg-[#0c0c0c] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_rgba(0,255,204,0.15)] relative animate-scale-up">
        {/* Header */}
        <div className="bg-[#111] px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Tv className="w-5 h-5 text-[#00ffcc]" />
            <h2 className="text-white text-base md:text-lg font-black tracking-wide uppercase">
              ডাউনলোড ও ইনস্টল (Download App)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#00ffcc] p-1.5 hover:bg-white/5 rounded-full transition-all"
            aria-label="Close download modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isInstalled ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle className="w-16 h-16 text-[#00ffcc] mx-auto animate-bounce" />
              <h3 className="text-[#00ffcc] text-xl font-bold">ইনস্টলেশন সফল হয়েছে!</h3>
              <p className="text-gray-400 text-sm">IreenTV অ্যাপটি এখন আপনার হোম স্ক্রিনে যুক্ত হয়েছে।</p>
            </div>
          ) : (
            <>
              {/* Option 1: Mobile & PC Installation (PWA) */}
              <div className="bg-[#141414] border border-white/5 hover:border-[#00ffcc]/30 rounded-xl p-5 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#00ffcc]/10 text-[#00ffcc] rounded-lg shrink-0">
                    <Laptop className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-white text-base font-bold flex items-center gap-2">
                      Install Mobile & PC (PWA)
                      <span className="text-[10px] bg-[#00ffcc]/20 text-[#00ffcc] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Recomended
                      </span>
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm">
                      ক্রোম বা সাফারি ব্রাউজার থেকে সরাসরি আপনার ফোন বা কম্পিউটারে ইনস্টল করুন। কোনো বাড়তি ফাইল ডাউনলোড করার ঝামেলা ছাড়াই অ্যাপের মতো চালান!
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={handlePwaInstall}
                    className="w-full bg-[#00ffcc] hover:bg-[#00e0b3] text-black font-black text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,204,0.3)] hover:shadow-[0_0_20px_rgba(0,255,204,0.5)] hover:scale-[1.02] active:scale-95 transition-all duration-300"
                  >
                    <Smartphone className="w-4 h-4" />
                    ইনস্টল করুন (Install on Device)
                  </button>

                  {/* Manual Instructions panel */}
                  {showInstructions && (
                    <div className="mt-4 bg-black/65 border border-white/10 rounded-lg p-4 text-xs md:text-sm text-gray-300 space-y-2.5 animate-slide-down">
                      <div className="flex items-center gap-1.5 text-[#00ffcc] font-bold">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>ম্যানুয়াল ইনস্টলেশন নির্দেশিকা (Manual Guide):</span>
                      </div>
                      <div className="space-y-2 font-medium">
                        <p className="text-[#00ffcc]/80 font-bold">মোবাইল অথবা পিসিতে অ্যাপটি ইনস্টল করতে নিচের নিয়ম অনুসরণ করুন:</p>
                        <div className="space-y-1 pl-1">
                          <p>
                            <span className="text-[#00ffcc] font-bold">১. গুগল ক্রোম (Google Chrome):</span> পিসিতে ব্রাউজারের উপরে ডান পাশে অ্যাড্রেস বারে ইনস্টল আইকনে (🖥️) ক্লিক করুন অথবা উপরে ডান পাশের ৩টি ডটে (⋮) ক্লিক করে <span className="text-white">"Save and share"</span> (সংরক্ষণ করুন) থেকে <span className="text-white">"Install page..."</span> নির্বাচন করুন।
                          </p>
                          <p>
                            <span className="text-[#00ffcc] font-bold">২. অ্যান্ড্রয়েড (Android Chrome):</span> উপরে ডান কোণায় ৩টি ডটে (⋮) ট্যাপ করুন এবং <span className="text-white">"Add to Home screen"</span> (হোম স্ক্রিনে যোগ করুন) নির্বাচন করুন।
                          </p>
                          <p>
                            <span className="text-[#00ffcc] font-bold">৩. আইফোন (iOS Safari):</span> নিচের <span className="text-white">"Share" (শেয়ার 📤)</span> বাটনে ট্যাপ করে স্ক্রোল ডাউন করুন এবং <span className="text-white">"Add to Home Screen"</span> নির্বাচন করুন।
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Option 2: Android TV & Mobile APK */}
              <div className="bg-[#141414] border border-white/5 hover:border-[#00ffcc]/30 rounded-xl p-5 transition-all duration-300">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#00ffcc]/10 text-[#00ffcc] rounded-lg shrink-0">
                    <Tv className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-white text-base font-bold">Download Android TV App (APK)</h3>
                    <p className="text-gray-400 text-xs md:text-sm">
                      অ্যান্ড্রয়েড স্মার্ট টিভি, টিভি বক্স বা টিভি স্টিকে সরাসরি ইনস্টল করার জন্য আমাদের অফিশিয়াল রিমোট-ফ্রেন্ডলি .APK ডাউনলোড করুন।
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <a
                    href="https://github.com/lotaji/Android-Smart-TV-App/raw/refs/heads/main/HD%20TV.apk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#111] hover:bg-[#1a1a1a] text-white border border-white/10 hover:border-[#00ffcc]/50 font-bold text-sm py-3 px-4 rounded-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all duration-300 group"
                  >
                    <Download className="w-4 h-4 text-[#00ffcc] group-hover:animate-bounce" />
                    Android TV অ্যাপ ডাউনলোড করুন
                  </a>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#080808] text-center py-3.5 border-t border-white/5 text-[11px] text-gray-500 font-medium">
          IreenTV &copy; 2026 - Optimized for high performance and live broadcasting
        </div>
      </div>
    </div>
  );
}
