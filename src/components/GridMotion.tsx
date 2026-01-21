import { useEffect, useRef, FC, ReactNode } from 'react';
import { gsap } from 'gsap';

interface GridMotionProps {
  items?: (string | ReactNode)[];
  gradientColor?: string;
}

const GridMotion: FC<GridMotionProps> = ({ items = [], gradientColor = 'rgba(255, 255, 255, 0.3)' }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const rows = 8; // Increase rows to 8
  const cols = 10; // Increase cols to 10
  const totalItems = rows * cols; // 80 items total
  const defaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);

  // If items provided, duplicate them to fill all slots
  let combinedItems: (string | ReactNode)[] = defaultItems;
  if (items.length > 0) {
    combinedItems = Array.from({ length: totalItems }, (_, index) => items[index % items.length]);
  }

  useEffect(() => {
    gsap.ticker.lagSmoothing(0);

    // Continuous auto-scroll animation for each row
    rowRefs.current.forEach((row, index) => {
      if (row) {
        const direction = index % 2 === 0 ? 1 : -1;
        const duration = 15 + (index * 2); // Different speeds for each row

        gsap.to(row, {
          x: direction * 400,
          duration: duration,
          ease: 'none',
          repeat: -1,
          yoyo: true
        });
      }
    });

    return () => {
      // Cleanup animations
      rowRefs.current.forEach((row) => {
        if (row) {
          gsap.killTweensOf(row);
        }
      });
    };
  }, []);

  return (
    <div ref={gridRef} className="h-full w-full overflow-hidden">
      <section
        className="w-full h-screen overflow-hidden relative flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${gradientColor} 0%, transparent 70%)`
        }}
      >
        <div className="absolute inset-0 pointer-events-none z-[4]"></div>
        <div className={`gap-4 flex-none relative w-[200vw] h-[200vh] grid grid-cols-1 rotate-[-12deg] origin-center z-[2]`}
          style={{ gridTemplateRows: `repeat(${rows}, 1fr)` }}>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className={`grid gap-4`}
              style={{
                willChange: 'transform',
                gridTemplateColumns: `repeat(${cols}, 1fr)`
              }}
              ref={el => {
                if (el) rowRefs.current[rowIndex] = el;
              }}
            >
              {Array.from({ length: cols }, (_, itemIndex) => {
                const content = combinedItems[rowIndex * cols + itemIndex];
                return (
                  <div key={itemIndex} className="relative flex items-center justify-center">
                    {typeof content === 'string' && content.startsWith('http') ? (
                      <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${content})` }}
                      ></div>
                    ) : (
                      <div className="flex items-center justify-center">{content}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="relative w-full h-full top-0 left-0 pointer-events-none"></div>
      </section>
    </div>
  );
};

export default GridMotion;
