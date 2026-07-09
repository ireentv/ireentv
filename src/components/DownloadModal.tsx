import { X, Smartphone, Tv, Download } from 'lucide-react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadModal({ isOpen, onClose }: DownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Modal Container */}
      <div 
        id="download-modal"
        className="relative w-full max-w-md bg-[#0a0a0a] border border-[#1f1f1f] hover:border-[#00ffcc]/30 rounded-2xl p-6 md:p-8 text-center shadow-[0_10px_50px_rgba(0,0,0,0.8)] transition-all duration-300"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-[#00ffcc] hover:scale-110 active:scale-95 p-1 rounded-full hover:bg-white/5 transition-all duration-200 outline-none"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-[#00ffcc]/10 text-[#00ffcc] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,255,204,0.15)] mb-3">
            <Download className="w-8 h-8" />
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase">
            Download <span className="rgb-text">IreenTV</span>
          </h2>
          <p className="text-gray-400 text-xs md:text-sm mt-1">
            আপনার ডিভাইসের জন্য সঠিক অ্যাপটি বেছে নিন
          </p>
        </div>

        {/* Buttons List */}
        <div className="space-y-4">
          {/* Mobile App Button */}
          <a
            href="https://github.com/ireentv/Ireen-TV-Mobile/raw/refs/heads/main/IreenTV%20Mobile.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 w-full bg-[#111] hover:bg-[#00ffcc] text-white hover:text-black border border-[#222] hover:border-white p-4 rounded-xl text-left font-bold cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,255,204,0.3)] group select-none outline-none"
          >
            <div className="bg-white/5 group-hover:bg-black/10 p-3 rounded-lg text-[#00ffcc] group-hover:text-black transition-colors duration-300">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm md:text-base font-black">Download Mobile App</div>
              <div className="text-[10px] md:text-xs opacity-75 font-normal mt-0.5">Android ফোনের জন্য APK ডাউনলোড করুন</div>
            </div>
          </a>

          {/* Android TV App Button */}
          <a
            href="https://github.com/ireentv/Smart-TV/raw/refs/heads/main/Smart%20TV%20HD.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 w-full bg-[#111] hover:bg-[#00ffcc] text-white hover:text-black border border-[#222] hover:border-white p-4 rounded-xl text-left font-bold cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(0,255,204,0.3)] group select-none outline-none"
          >
            <div className="bg-white/5 group-hover:bg-black/10 p-3 rounded-lg text-[#00ffcc] group-hover:text-black transition-colors duration-300">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm md:text-base font-black">Download Android TV App</div>
              <div className="text-[10px] md:text-xs opacity-75 font-normal mt-0.5">Smart TV / Android Box এর জন্য APK ডাউনলোড করুন</div>
            </div>
          </a>
        </div>

        {/* Footer info */}
        <p className="text-gray-500 text-[10px] md:text-xs mt-6 select-none">
          ইনস্টল করতে কোনো সমস্যা হলে ফোনের সেটিংস থেকে "Unknown Sources" চালু করুন।
        </p>
      </div>
    </div>
  );
}
