import { useState, useRef, useEffect } from "react";
import { Activity } from "@/components/ActivityCard";

interface StatusCarouselProps {
  children: React.ReactNode[];
}

export const StatusCarousel = ({ children }: StatusCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalPages = children.length;

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollLeft = scrollContainer.scrollLeft;
      const pageWidth = scrollContainer.clientWidth;
      const newIndex = Math.round(scrollLeft / pageWidth);
      setActiveIndex(newIndex);
    };

    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="relative">
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children.map((child, index) => (
          <div
            key={index}
            className="w-full flex-shrink-0 snap-center"
          >
            {child}
          </div>
        ))}
      </div>

      {/* Pagination dots - Strava style */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 py-3 border-t border-border/30">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                scrollRef.current?.scrollTo({
                  left: index * (scrollRef.current?.clientWidth || 0),
                  behavior: "smooth",
                });
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                index === activeIndex
                  ? "bg-foreground"
                  : "bg-muted-foreground/30"
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
