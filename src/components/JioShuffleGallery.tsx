'use client';

import { useState } from 'react';
import { motion, PanInfo } from 'framer-motion';
import Image from 'next/image';

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string;
  property_type: 'residency' | 'lake-inn';
};

export default function JioShuffleGallery({ initialItems }: { initialItems: GalleryItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [isCoolingDown, setIsCoolingDown] = useState(false);

  if (items.length === 0) {
    return (
      <div className="w-full flex items-center justify-center min-h-[400px] border border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
        <p className="text-slate-400 font-light">No images uploaded yet.</p>
      </div>
    );
  }

  const handleShuffle = (direction: 'next' | 'prev' = 'next') => {
    setItems((prev) => {
      const newItems = [...prev];
      if (direction === 'next') {
        const topCard = newItems.shift();
        if (topCard) newItems.push(topCard);
      } else {
        const bottomCard = newItems.pop();
        if (bottomCard) newItems.unshift(bottomCard);
      }
      return newItems;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (isCoolingDown) return;
    
    // Prevent default scrolling behavior
    if (Math.abs(e.deltaY) > 30 || Math.abs(e.deltaX) > 30) {
      if (e.deltaY > 0 || e.deltaX > 0) {
        handleShuffle('next');
      } else {
        handleShuffle('prev');
      }
      
      setIsCoolingDown(true);
      setTimeout(() => setIsCoolingDown(false), 800); // Cooldown to prevent rapid spinning
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -100) {
      handleShuffle('next');
    } else if (info.offset.x > 100) {
      handleShuffle('prev');
    }
  };

  return (
    <div 
      className="relative w-full flex flex-col items-center justify-center h-full max-h-[80vh] perspective-[1500px]"
      onWheel={handleWheel}
    >
      
      {/* The Stack */}
      <div className="relative w-full max-w-5xl aspect-[4/3] md:aspect-video flex items-center justify-center">
        {items.map((item, index) => {
          // Calculate visibility and styles based on position in array
          const isTop = index === 0;
          const scale = isTop ? 1 : index === 1 ? 0.9 : index === 2 ? 0.8 : 0.7;
          const yOffset = isTop ? 0 : index === 1 ? -40 : index === 2 ? -80 : -100;
          const opacity = isTop ? 1 : index === 1 ? 0.8 : index === 2 ? 0.5 : 0;
          const zIndex = items.length - index;

          return (
            <motion.div
              key={item.id}
              initial={false}
              animate={{
                scale,
                y: yOffset,
                opacity,
                zIndex,
                rotateY: isTop ? 0 : index * 5, // Slight 3D rotation for background cards
              }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              drag={isTop ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={isTop ? handleDragEnd : undefined}
              onClick={isTop ? () => handleShuffle('next') : undefined}
              className={`absolute w-full h-full rounded-3xl overflow-hidden backdrop-blur-md bg-white/5 border border-white/20 shadow-2xl ${isTop ? 'cursor-pointer active:cursor-grabbing' : 'pointer-events-none'}`}
            >
              <div className="relative w-full h-full">
                {/* Blurred background image to fill letterboxing gracefully */}
                <Image
                  src={item.image_url}
                  alt="Background blur"
                  fill
                  className="object-cover opacity-30 blur-2xl pointer-events-none"
                  sizes="(max-width: 768px) 100vw, 1024px"
                />
                {/* Main Image, fully contained */}
                <Image
                  src={item.image_url}
                  alt={item.caption || "Gallery Image"}
                  fill
                  className="object-contain pointer-events-none z-10"
                  sizes="(max-width: 768px) 100vw, 1024px"
                  priority={isTop}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-10 pointer-events-none z-20">
                  <span className={`px-3 py-1 mb-3 w-max text-xs font-medium uppercase tracking-wider rounded-full border backdrop-blur-md ${item.property_type === 'residency' ? 'text-amber-200 bg-amber-900/50 border-amber-500/30' : 'text-emerald-200 bg-emerald-900/50 border-emerald-500/30'}`}>
                    {item.property_type === 'residency' ? 'Quilion Residency' : 'Quilion Lake Inn'}
                  </span>
                  <h3 className="text-2xl font-light text-white drop-shadow-lg">
                    {item.caption || 'Luxury Suite'}
                  </h3>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Glowing Shuffle Button */}
      <button
        onClick={() => handleShuffle('next')}
        className="mt-8 px-6 py-3 rounded-full bg-slate-800/80 backdrop-blur-md border border-white/10 text-white font-medium tracking-wide transition-all duration-300 hover:bg-emerald-600 hover:border-emerald-400 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95 group z-50"
      >
        <span className="flex items-center gap-2">
          Shuffle Gallery
          <motion.span
            animate={{ x: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            →
          </motion.span>
        </span>
      </button>

    </div>
  );
}
