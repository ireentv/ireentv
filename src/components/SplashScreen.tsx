import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  isVisible: boolean;
}

export default function SplashScreen({ isVisible }: SplashScreenProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="fixed inset-0 w-screen h-screen bg-black z-[99999] flex flex-col justify-center items-center"
        >
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-[55px] font-black tracking-wider flex items-center mb-2"
          >
            <span className="text-white">Ireen</span>
            <span className="text-[#00ffcc] drop-shadow-[0_0_20px_rgba(0,255,204,0.6)] ml-1">TV</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-gray-500 text-[11px] tracking-[5px] mb-12 uppercase font-bold"
          >
            The Home of Live TV
          </motion.div>
          
          <div className="w-[260px] h-1 bg-[#1a1a1a] rounded-sm overflow-hidden relative">
            <div className="splash-loading-fill w-[40%] h-full bg-[#00ffcc] shadow-[0_0_10px_#00ffcc] rounded-sm absolute" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
