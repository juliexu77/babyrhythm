import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Keyboard, Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TimePickerDrawerProps {
  value?: string;
  selectedDate?: Date;
  onChange: (time: string) => void;
  onDateChange?: (date: Date) => void;
  label?: string;
}

// Haptic feedback helper (uses Capacitor if available)
const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'light') => {
  try {
    if ('Capacitor' in window && (window as any).Capacitor?.Plugins?.Haptics) {
      (window as any).Capacitor.Plugins.Haptics.impact({ style });
    }
  } catch (e) {
    // Haptics not available
  }
};

export const TimePickerDrawer = ({ 
  value, 
  selectedDate, 
  onChange, 
  onDateChange, 
  label 
}: TimePickerDrawerProps) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState<'medium' | 'full'>('medium');
  const [showKeypad, setShowKeypad] = useState(false);
  
  // Current committed values
  const [committedTime, setCommittedTime] = useState(value || '');
  const [committedDate, setCommittedDate] = useState(selectedDate || new Date());

  // Staged values (preview only, not committed)
  const [stagedHour, setStagedHour] = useState(12);
  const [stagedMinute, setStagedMinute] = useState(0);
  const [stagedPeriod, setStagedPeriod] = useState<'AM' | 'PM'>('AM');
  const [stagedDateIndex, setStagedDateIndex] = useState(90); // today
  const [use24Hour, setUse24Hour] = useState(false);

  // Keypad input state
  const [keypadInput, setKeypadInput] = useState('');

  // Refs
  const drawerRef = useRef<HTMLDivElement>(null);
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Snap timers for scroll normalization
  const hourSnapTimeout = useRef<number | null>(null);
  const minuteSnapTimeout = useRef<number | null>(null);
  const dateSnapTimeout = useRef<number | null>(null);

  // Constants (use integer px to avoid sub-pixel rounding on iOS)
  const ITEM_HEIGHT = 48; // px (was 44)
  const VIEWPORT_HEIGHT = 240; // 5 items visible (5 * 48)
  const SPACER = (VIEWPORT_HEIGHT - ITEM_HEIGHT) / 2;
  const MINUTE_STEP = 1; // Can be changed to 5 for 5-minute intervals

  // Generate dates (90 days past, today, 3 days future)
  const generateDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (let i = -90; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };
  const dates = generateDates();

  // Generate looping lists
  const hours = use24Hour 
    ? Array.from({ length: 24 }, (_, i) => i)
    : Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

  // Parse initial value into staged state
  useEffect(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        const hour = parseInt(match[1]);
        const minute = parseInt(match[2]);
        const period = match[3]?.toUpperCase() as 'AM' | 'PM' | undefined;
        
        setStagedHour(hour);
        setStagedMinute(minute);
        if (period) setStagedPeriod(period);
      }
    }
    if (selectedDate) {
      const index = dates.findIndex(d => d.toDateString() === selectedDate.toDateString());
      if (index >= 0) setStagedDateIndex(index);
    }
  }, [value, selectedDate]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      triggerHaptic('medium');
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Scroll to staged values - force scroll all columns to their exact staged positions
  const scrollToStaged = () => {
    if (hourRef.current) {
      const index = hours.indexOf(stagedHour);
      if (index >= 0) {
        const targetTop = SPACER + index * ITEM_HEIGHT;
        hourRef.current.scrollTop = targetTop;
        console.log('📍 Scrolling Hour to:', { stagedHour, index, targetTop, actualScrollTop: hourRef.current.scrollTop });
      }
    }
    if (minuteRef.current) {
      const index = minutes.indexOf(stagedMinute);
      if (index >= 0) {
        const targetTop = SPACER + index * ITEM_HEIGHT;
        minuteRef.current.scrollTop = targetTop;
        console.log('📍 Scrolling Minute to:', { stagedMinute, index, targetTop, actualScrollTop: minuteRef.current.scrollTop });
      }
    }
    if (dateRef.current) {
      const targetTop = SPACER + stagedDateIndex * ITEM_HEIGHT;
      dateRef.current.scrollTop = targetTop;
      console.log('📍 Scrolling Date to:', { stagedDateIndex, targetTop, actualScrollTop: dateRef.current.scrollTop });
    }
  };

  // Initial scroll on mount - multiple attempts to ensure it sticks on iOS
  useEffect(() => {
    if (isOpen) {
      isProgrammaticScroll.current = true;
      
      // First attempt: immediate
      scrollToStaged();
      
      // Second attempt: next frame
      requestAnimationFrame(() => {
        scrollToStaged();
        
        // Third attempt: after layout
        requestAnimationFrame(() => {
          scrollToStaged();
          
          // Finally allow user scrolling after 150ms
          setTimeout(() => {
            isProgrammaticScroll.current = false;
            console.log('✅ Initial scroll complete, user scrolling enabled');
          }, 150);
        });
      });
    }
  }, [isOpen]);

  // Handle wheel scroll
  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    items: number[],
    setter: (val: number) => void,
    label: string,
    timeoutRef: React.MutableRefObject<number | null>
  ) => {
    if (!ref.current || isProgrammaticScroll.current) return;
    const scrollTop = ref.current.scrollTop;
    const rawIndex = Math.round((scrollTop - SPACER) / ITEM_HEIGHT);
    const index = Math.max(0, Math.min(rawIndex, items.length - 1));
    const value = items[index];

    console.log(`🎯 ${label} scroll:`, { scrollTop, SPACER, ITEM_HEIGHT, rawIndex, index, value, itemsLength: items.length });

    setter(value);
    triggerHaptic('light');

    // Debounced snap-to-row normalization to avoid fractional offsets on iOS
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      if (!ref.current || isProgrammaticScroll.current) return; // Don't snap during programmatic scroll
      const snapIndex = Math.max(0, Math.min(Math.round((ref.current.scrollTop - SPACER) / ITEM_HEIGHT), items.length - 1));
      const targetTop = SPACER + snapIndex * ITEM_HEIGHT;
      
      // Only snap if we're off by more than 2px (avoid infinite loops)
      if (Math.abs(ref.current.scrollTop - targetTop) > 2) {
        ref.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    }, 150);
  };

  // Format date label
  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return t('today');
    if (date.toDateString() === tomorrow.toDateString()) return t('tomorrow');
    if (date.toDateString() === yesterday.toDateString()) return t('yesterday');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get staged summary
  const getStagedSummary = () => {
    const dateLabel = formatDateLabel(dates[stagedDateIndex]);
    const hourDisplay = use24Hour 
      ? stagedHour.toString().padStart(2, '0')
      : stagedHour;
    const minuteDisplay = stagedMinute.toString().padStart(2, '0');
    const periodDisplay = use24Hour ? '' : ` ${stagedPeriod}`;
    return `${dateLabel}, ${hourDisplay}:${minuteDisplay}${periodDisplay}`;
  };

  // Check if staged differs from committed
  const hasChanges = () => {
    const stagedTime = `${stagedHour}:${stagedMinute.toString().padStart(2, '0')}${use24Hour ? '' : ' ' + stagedPeriod}`;
    const stagedDateStr = dates[stagedDateIndex].toDateString();
    const committedDateStr = committedDate.toDateString();
    return stagedTime !== committedTime || stagedDateStr !== committedDateStr;
  };

  // Apply changes
  const handleApply = () => {
    const timeString = `${stagedHour}:${stagedMinute.toString().padStart(2, '0')}${use24Hour ? '' : ' ' + stagedPeriod}`;
    const selectedDate = dates[stagedDateIndex];
    
    console.log('🎯 APPLY CLICKED:', {
      stagedHour,
      stagedMinute,
      stagedPeriod,
      stagedDateIndex,
      timeString,
      selectedDate: selectedDate.toISOString(),
      dateLabel: formatDateLabel(selectedDate),
    });
    
    setCommittedTime(timeString);
    setCommittedDate(selectedDate);
    
    console.log('📤 CALLING onChange:', timeString);
    onChange(timeString);
    
    if (onDateChange) {
      console.log('📅 CALLING onDateChange:', selectedDate.toISOString());
      onDateChange(selectedDate);
    }
    
    setIsOpen(false);
    triggerHaptic('medium');
  };

  // Cancel changes
  const handleCancel = () => {
    // Reset staged to committed
    if (committedTime) {
      const match = committedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (match) {
        setStagedHour(parseInt(match[1]));
        setStagedMinute(parseInt(match[2]));
        if (match[3]) setStagedPeriod(match[3].toUpperCase() as 'AM' | 'PM');
      }
    }
    const index = dates.findIndex(d => d.toDateString() === committedDate.toDateString());
    if (index >= 0) setStagedDateIndex(index);
    setIsOpen(false);
    triggerHaptic('light');
  };

  // Handle touch drag
  const handleTouchStart = (e: React.TouchEvent) => {
    // Only allow drag-to-close when scrolled to top
    if (drawerRef.current) {
      const scrollTop = drawerRef.current.scrollTop;
      if (scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        currentY.current = startY.current;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0) return;
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    if (deltaY > 0 && drawerRef.current) {
      // Pull down gesture
      drawerRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (startY.current === 0) return;
    const deltaY = currentY.current - startY.current;
    const velocity = deltaY; // Simplified velocity
    
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
    }
    
    // Close if pulled down > 100px or fast flick
    if (deltaY > 100 || velocity > 50) {
      handleCancel();
    }
    
    startY.current = 0;
    currentY.current = 0;
  };

  // Keypad handlers
  const handleKeypadDigit = (digit: string) => {
    if (keypadInput.length < 4) {
      setKeypadInput(keypadInput + digit);
      triggerHaptic('light');
    }
  };

  const handleKeypadBackspace = () => {
    setKeypadInput(keypadInput.slice(0, -1));
    triggerHaptic('light');
  };

  const handleKeypadApply = () => {
    if (keypadInput.length === 3 || keypadInput.length === 4) {
      // Parse HH:MM or H:MM
      let hour = 0;
      let minute = 0;
      
      if (keypadInput.length === 3) {
        hour = parseInt(keypadInput[0]);
        minute = parseInt(keypadInput.slice(1));
      } else {
        hour = parseInt(keypadInput.slice(0, 2));
        minute = parseInt(keypadInput.slice(2));
      }

      // Validate
      if (use24Hour) {
        if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
          setStagedHour(hour);
          setStagedMinute(minute);
          setShowKeypad(false);
          setKeypadInput('');
          triggerHaptic('medium');
        }
      } else {
        if (hour >= 1 && hour <= 12 && minute >= 0 && minute < 60) {
          setStagedHour(hour);
          setStagedMinute(minute);
          setShowKeypad(false);
          setKeypadInput('');
          triggerHaptic('medium');
        }
      }
    }
  };

  if (!isOpen) {
    return (
      <div className="space-y-2">
        {label && <Label className="text-sm font-medium">{label}</Label>}
        <button
          type="button"
          className="w-full flex items-center justify-between border rounded-lg p-3 bg-background hover:border-primary/50 transition-colors text-left"
          onClick={() => setIsOpen(true)}
        >
          <span className="text-sm font-medium text-foreground">
            {committedTime ? getStagedSummary() : t('selectTime') || 'Select time'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
        onClick={handleCancel}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed left-0 right-0 bottom-0 z-50 bg-background rounded-t-2xl shadow-2xl transition-all duration-300 ease-out animate-slide-in-bottom ${
          drawerHeight === 'medium' ? 'h-[60vh]' : 'h-[90vh]'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', animation: 'none' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-3">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b">
          <h3 className="text-lg font-semibold">{label || t('time')}</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowKeypad(!showKeypad)}
              className="gap-2"
            >
              <Keyboard className="h-4 w-4" />
              {!showKeypad && <span className="text-xs">{t('keypad') || 'Keypad'}</span>}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100% - 160px)' }}>
          {!showKeypad ? (
            <>
              {/* Picker wheels */}
              <div className="relative flex gap-2 items-center justify-center py-6 px-4" style={{ WebkitTextSizeAdjust: '100%' }}>
                {/* Date picker */}
                <div className="flex flex-col items-center flex-1 relative">
                  <div
                    ref={dateRef}
                    className="h-[240px] w-full overflow-y-scroll scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                    onScroll={() => {
                      if (!dateRef.current || isProgrammaticScroll.current) return;
                      const scrollTop = dateRef.current.scrollTop;
                      const index = Math.round((scrollTop - SPACER) / ITEM_HEIGHT);
                      const clamped = Math.max(0, Math.min(index, dates.length - 1));
                      
                      console.log('🎯 Date scroll:', { scrollTop, SPACER, ITEM_HEIGHT, index, clamped, date: dates[clamped].toISOString(), datesLength: dates.length });
                      
                      setStagedDateIndex(clamped);
                      triggerHaptic('light');

                      // Debounced snap-to-row normalization
                      if (dateSnapTimeout.current) window.clearTimeout(dateSnapTimeout.current);
                      dateSnapTimeout.current = window.setTimeout(() => {
                        if (!dateRef.current || isProgrammaticScroll.current) return; // Don't snap during programmatic scroll
                        const snapped = Math.max(0, Math.min(Math.round((dateRef.current.scrollTop - SPACER) / ITEM_HEIGHT), dates.length - 1));
                        const targetTop = SPACER + snapped * ITEM_HEIGHT;
                        
                        // Only snap if we're off by more than 2px
                        if (Math.abs(dateRef.current.scrollTop - targetTop) > 2) {
                          dateRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
                        }
                      }, 150);
                    }}
                  >
                    <div className="flex flex-col">
                      <div style={{ height: `${SPACER}px` }} />
                      {dates.map((date, i) => (
                        <div
                          key={i}
                          className={`h-11 flex items-center justify-center text-base leading-none whitespace-nowrap truncate transition-all ${
                            stagedDateIndex === i ? 'text-foreground font-medium' : 'text-muted-foreground/40'
                          }`}
                        >
                          {formatDateLabel(date)}
                        </div>
                      ))}
                      <div style={{ height: `${SPACER}px` }} />
                    </div>
                  </div>
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent via-40% to-background" />
                </div>

                {/* Hour picker */}
                <div className="flex flex-col items-center flex-1 relative">
                  <div
                    ref={hourRef}
                    className="h-[240px] w-full overflow-y-scroll scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                    onScroll={() => handleScroll(hourRef, hours, setStagedHour, 'Hour', hourSnapTimeout)}
                  >
                    <div className="flex flex-col">
                      <div style={{ height: `${SPACER}px` }} />
                      {hours.map((h, i) => (
                        <div
                          key={i}
                          className={`h-11 flex items-center justify-center text-base leading-none whitespace-nowrap truncate transition-all ${
                            stagedHour === h ? 'text-foreground font-medium' : 'text-muted-foreground/40'
                          }`}
                        >
                          {use24Hour ? h.toString().padStart(2, '0') : h}
                        </div>
                      ))}
                      <div style={{ height: `${SPACER}px` }} />
                    </div>
                  </div>
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent via-40% to-background" />
                </div>

                {/* Minute picker */}
                <div className="flex flex-col items-center flex-1 relative">
                  <div
                    ref={minuteRef}
                    className="h-[240px] w-full overflow-y-scroll scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                    onScroll={() => handleScroll(minuteRef, minutes, setStagedMinute, 'Minute', minuteSnapTimeout)}
                  >
                    <div className="flex flex-col">
                      <div style={{ height: `${SPACER}px` }} />
                      {minutes.map((m, i) => (
                        <div
                          key={i}
                          className={`h-11 flex items-center justify-center text-base leading-none whitespace-nowrap truncate transition-all ${
                            stagedMinute === m ? 'text-foreground font-medium' : 'text-muted-foreground/40'
                          }`}
                        >
                          {m.toString().padStart(2, '0')}
                        </div>
                      ))}
                      <div style={{ height: `${SPACER}px` }} />
                    </div>
                  </div>
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent via-40% to-background" />
                </div>

                {/* AM/PM picker (only for 12-hour) */}
                {!use24Hour && (
                  <div className="flex flex-col items-center w-16 relative">
                    <div className="h-[220px] w-full flex flex-col justify-center gap-4">
                      {['AM', 'PM'].map((period) => (
                        <button
                          key={period}
                          type="button"
                           className={`h-11 flex items-center justify-center text-base leading-none whitespace-nowrap truncate transition-all ${
                             stagedPeriod === period ? 'text-foreground font-medium' : 'text-muted-foreground/40'
                           }`}
                          onClick={() => {
                            setStagedPeriod(period as 'AM' | 'PM');
                            triggerHaptic('light');
                          }}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selection indicator - DEBUG MODE */}
                 <div
                   className="pointer-events-none absolute inset-x-0 z-10"
                   style={{ top: `${24 + (VIEWPORT_HEIGHT / 2)}px`, transform: 'translateY(-50%)', height: `${ITEM_HEIGHT}px` }}
                 >
                   <div className="mx-4 h-full rounded-lg border-2 border-primary bg-primary/10" />
                 </div>
              </div>
            </>
          ) : (
            /* Keypad mode */
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-mono font-semibold mb-2">
                  {keypadInput || '--:--'}
                </div>
                <p className="text-sm text-muted-foreground">
                  {use24Hour ? 'Enter HHMM (24-hour)' : 'Enter HHMM (12-hour)'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <Button
                    key={digit}
                    variant="outline"
                    size="lg"
                    className="text-2xl h-16"
                    onClick={() => handleKeypadDigit(digit.toString())}
                  >
                    {digit}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="lg"
                  className="text-xl h-16"
                  onClick={handleKeypadBackspace}
                >
                  ←
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="text-2xl h-16"
                  onClick={() => handleKeypadDigit('0')}
                >
                  0
                </Button>
                <Button
                  variant="default"
                  size="lg"
                  className="text-xl h-16"
                  onClick={handleKeypadApply}
                  disabled={keypadInput.length < 3}
                >
                  <Check className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with summary and actions */}
        <div className="sticky bottom-0 bg-background border-t p-4 space-y-3">
          {/* Staged summary chip */}
          <div className="text-center py-2 px-4 bg-primary/10 rounded-lg">
            <span className="text-sm font-medium">{getStagedSummary()}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleApply}
              disabled={!hasChanges()}
            >
              {hasChanges() && <Check className="h-4 w-4" />}
              {t('apply') || 'Apply'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
