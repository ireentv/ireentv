import { useEffect, useState } from 'react';
import { X, Shield, Globe, HelpCircle, Check } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [proxyUrl, setProxyUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('custom_proxy_base') || '';
    setProxyUrl(saved);
  }, []);

  const handleSave = () => {
    let cleanUrl = proxyUrl.trim();
    if (cleanUrl) {
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      cleanUrl = cleanUrl.replace(/\/$/, ''); // Remove trailing slash
    }
    localStorage.setItem('custom_proxy_base', cleanUrl);
    setProxyUrl(cleanUrl);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all duration-300">
      <div 
        id="settings-container"
        className="bg-[#0b0b0b] border border-[#222] rounded-xl max-w-lg w-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-fade-in text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222] bg-[#0d0d0d]">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#00ffcc]" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">
              Proxy Server Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors cursor-pointer"
            aria-label="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
              Custom Proxy Backend URL (ঐচ্ছিক)
            </label>
            <div className="relative">
              <input
                type="text"
                value={proxyUrl}
                onChange={(e) => setProxyUrl(e.target.value)}
                placeholder="https://your-cloud-run-url.run.app"
                className="w-full bg-[#111] border border-[#333] rounded-lg py-3 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ffcc] focus:shadow-[0_0_10px_rgba(0,255,204,0.15)] transition-all"
              />
              <Globe className="w-4 h-4 text-gray-500 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Quick Clear */}
          {proxyUrl && (
            <button
              onClick={() => {
                setProxyUrl('');
                localStorage.removeItem('custom_proxy_base');
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2000);
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear Custom Proxy (Use Default Pages Proxy)
            </button>
          )}

          {/* Explanation Box */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="flex gap-2 items-start text-xs font-semibold text-[#00ffcc]">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>এটি কেন প্রয়োজন? (Why is this needed?)</span>
            </div>
            <div className="text-xs text-gray-400 space-y-2 leading-relaxed">
              <p>
                ১. <strong>Cloudflare লিমিটেশন:</strong> আপনি যখন সাইটটি <strong>Cloudflare Pages</strong>-এ হোস্ট করেন, তখন এর ক্লাউড সিকিউরিটির কারণে <code>8097</code> ইত্যাদি কাস্টম পোর্ট থেকে সরাসরি স্ট্রিম লোড হতে পারে না।
              </p>
              <p>
                ২. <strong>সমাধান:</strong> এই সমস্যা এড়াতে, আপনি আপনার Google AI Studio-এর <strong>Cloud Run Backend URL</strong> (প্রাক-রিলিজ/শেয়ার লিংক বা ডেপ্লয়মেন্ট URL) কপি করে উপরে সেট করুন। 
              </p>
              <p>
                ৩. ক্লাউড রান সার্ভারটি সম্পূর্ণ স্বাধীন এবং এটি যে কোনো পোর্টের লাইভ চ্যানেল সহজেই প্রক্সি করতে সক্ষম।
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#222] bg-[#0d0d0d] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#333] hover:bg-white/5 text-gray-300 hover:text-white rounded-lg text-sm transition-all duration-200"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="bg-[#00ffcc] text-black hover:shadow-[0_0_15px_#00ffcc] hover:scale-[1.02] active:scale-95 px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-all duration-200"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
