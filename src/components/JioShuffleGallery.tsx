'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Maximize2, X, MapPin } from 'lucide-react';

export type PropertyItem = {
  id: string;
  name?: string; // name in properties
  slug?: string;
  cover_image_url?: string;
  location_url?: string;
  image_url?: string; // image_url in photos
  caption?: string; // caption in photos
  property_type?: string;
};

type JioShuffleGalleryProps = {
  initialItems: any[];
  mode?: 'folders' | 'photos';
};

const isVideoUrl = (url?: string) => url?.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i);

export default function JioShuffleGallery({ initialItems, mode = 'photos' }: JioShuffleGalleryProps) {
  const [items, setItems] = useState(initialItems);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const router = useRouter();
  const isDragging = useRef(false);

  if (items.length === 0) {
    return (
      <div className="w-full flex items-center justify-center min-h-[400px] border border-white/20 rounded-3xl bg-white/40 backdrop-blur-md shadow-sm">
        <p className="text-charcoal-700 font-light font-serif">No items found.</p>
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
    if (Math.abs(e.deltaY) > 20 || Math.abs(e.deltaX) > 20) {
      if (e.deltaY > 0 || e.deltaX > 0) {
        handleShuffle('next');
      } else {
        handleShuffle('prev');
      }
      setIsCoolingDown(true);
      setTimeout(() => setIsCoolingDown(false), 400);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocityThreshold = 400;

    if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
      handleShuffle('next');
    } else if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
      handleShuffle('prev');
    }
  };

  const handleTopClick = (item: any) => {
    if (mode === 'folders') {
      router.push(`/property/${item.slug}`);
    } else {
      setZoomedImage(item.image_url || item.cover_image_url);
    }
  };

  useEffect(() => {
    if (!zoomedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        setZoomedImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  return (
    <>
      <div 
        className="relative w-full flex flex-col items-center justify-center h-full max-h-[80vh] perspective-[1500px]"
        onWheel={handleWheel}
      >
        <div className="relative w-full max-w-5xl aspect-[4/3] md:aspect-video flex items-center justify-center">
          {items.map((item, index) => {
            const isTop = index === 0;
            const scale = isTop ? 1 : index === 1 ? 0.9 : index === 2 ? 0.8 : 0.7;
            const yOffset = isTop ? 0 : index === 1 ? -40 : index === 2 ? -80 : -100;
            const opacity = isTop ? 1 : index === 1 ? 0.8 : index === 2 ? 0.5 : 0;
            const zIndex = items.length - index;

            const imageUrl = mode === 'folders' ? item.cover_image_url : item.image_url;
            const title = mode === 'folders' ? item.name : item.caption;
            const badge = mode === 'folders' ? 'Gallery' : item.property_type;

            return (
              <motion.div
                key={item.id}
                initial={false}
                animate={{
                  scale,
                  y: yOffset,
                  opacity,
                  zIndex,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                className="absolute w-full h-full"
              >
                <motion.div
                  animate={{
                    x: 0,
                    y: isTop ? [0, -12, 0] : [0, -4, 0],
                    rotateY: isTop ? 0 : index * 5,
                  }}
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    rotateY: { type: 'spring', stiffness: 300, damping: 30 },
                    y: { repeat: Infinity, duration: 4 + (index % 3), ease: "easeInOut" }
                  }}
                  drag={isTop ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.6}
                  onDragStart={() => {
                    isDragging.current = true;
                  }}
                  onDragEnd={isTop ? (e, info) => {
                    setTimeout(() => { isDragging.current = false; }, 100);
                    handleDragEnd(e, info);
                  } : undefined}
                  className={`relative w-full h-full rounded-3xl overflow-hidden shadow-xl border transition-all duration-500 will-change-transform transform-gpu ${
                    mode === 'folders' ? 'bg-white/60 backdrop-blur-xl border-white/40' : 'bg-ivory-50 border-ivory-200'
                  } ${isTop ? 'cursor-pointer hover:border-emerald-500/30 hover:shadow-2xl hover:-translate-y-1' : ''}`}
                  onClick={isTop ? () => {
                    if (!isDragging.current) {
                      handleTopClick(item);
                    }
                  } : undefined}
                >
                {imageUrl ? (
                  isVideoUrl(imageUrl) ? (
                    <>
                      {mode === 'folders' && <video src={imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl pointer-events-none will-change-transform transform-gpu" />}
                      <video src={imageUrl} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10" />
                    </>
                  ) : (
                    <>
                      {mode === 'folders' && <Image src={imageUrl} alt="Blur" fill className="object-cover opacity-30 blur-xl pointer-events-none will-change-transform transform-gpu" sizes="(max-width: 768px) 100vw, 1024px" />}
                      <Image src={imageUrl} alt={title || 'Image'} fill className="object-contain pointer-events-none z-10" sizes="(max-width: 768px) 100vw, 1024px" priority={isTop} />
                    </>
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-ivory-100/80 backdrop-blur-md border border-white/40 rounded-3xl z-10">
                    <p className="text-charcoal-700 font-mono text-xs">NO COVER IMAGE</p>
                  </div>
                )}

                <div className={`absolute inset-0 bg-gradient-to-t ${mode === 'folders' ? 'from-white/95 via-white/40' : 'from-charcoal-900/80 via-transparent'} to-transparent flex flex-col justify-end p-6 md:p-10 pointer-events-none z-20`}>
                  <div className="flex items-center gap-3 mb-3">
                    {badge && (
                      <span className={`px-3 py-1 w-max text-xs font-semibold uppercase tracking-wider rounded-full border backdrop-blur-md shadow-sm font-sans ${
                        mode === 'folders' ? 'text-emerald-900 bg-emerald-100/50 border-emerald-500/30' : 'text-emerald-50 bg-emerald-900/50 border-emerald-500/50'
                      }`}>
                        {badge}
                      </span>
                    )}
                    {isTop && mode === 'folders' && item.location_url && (
                      <div 
                        className={`pointer-events-auto px-3 py-1 w-max text-xs font-semibold uppercase tracking-wider rounded-full border backdrop-blur-md flex items-center gap-1 cursor-pointer shadow-sm transition-all duration-300 font-sans ${
                          mode === 'folders' ? 'text-emerald-900 bg-emerald-100/50 border-emerald-500/30 hover:bg-emerald-200/50 hover:border-emerald-500/50 hover:text-emerald-950' : 'text-emerald-50 bg-emerald-900/50 border-emerald-500/50 hover:bg-emerald-800/80 hover:border-emerald-400'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(item.location_url, '_blank');
                        }}
                      >
                        <MapPin className="w-3 h-3" /> Map
                      </div>
                    )}
                  </div>
                  <h3 className={`text-2xl font-medium drop-shadow-sm flex items-center gap-4 font-serif ${
                    mode === 'folders' ? 'text-charcoal-900' : 'text-ivory-50'
                  }`}>
                    {title || (mode === 'folders' ? 'Untitled Property' : 'Untitled Photo')}
                  </h3>
                </div>

                {isTop && mode === 'photos' && (
                  <div className="absolute top-6 right-6 z-30 flex gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setZoomedImage(imageUrl); }}
                      className="p-3 rounded-full bg-white/80 hover:bg-emerald-700 border border-white/40 hover:border-emerald-500 text-emerald-900 hover:text-white shadow-md hover:shadow-lg hover:-translate-y-1 backdrop-blur-md transition-all duration-300 cursor-pointer pointer-events-auto"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
                </motion.div>
              </motion.div>
            );
          })}
        </div>

      </div>

      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ivory-100/95 backdrop-blur-xl p-4"
            onClick={() => setZoomedImage(null)}
            onWheel={() => setZoomedImage(null)}
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-charcoal-800/10 hover:bg-emerald-700/80 text-charcoal-800 hover:text-white transition-colors z-[110]"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-6xl h-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
              onPanEnd={(e, info) => {
                const swipeThreshold = 50;
                const velocityThreshold = 400;
                if (
                  Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold ||
                  Math.abs(info.offset.y) > swipeThreshold || Math.abs(info.velocity.y) > velocityThreshold
                ) {
                  setZoomedImage(null);
                }
              }}
            >
              {isVideoUrl(zoomedImage) ? (
                <video src={zoomedImage} controls autoPlay className="w-full h-full object-contain drop-shadow-2xl" />
              ) : (
                <Image src={zoomedImage} alt="Zoomed image" fill className="object-contain drop-shadow-2xl" sizes="100vw" quality={100} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
