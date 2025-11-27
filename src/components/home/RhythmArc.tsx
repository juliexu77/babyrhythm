import { Card } from "@/components/ui/card";
import { Sun, Moon } from "lucide-react";
import { differenceInMinutes } from "date-fns";

interface RhythmArcProps {
  mode: "nap" | "wake";
  startTime: Date;
  typicalDuration: number; // in minutes
  currentTime: Date;
  theme: "day" | "night";
  stateMessage: string;
}

// Calculate point on quadratic Bézier curve
// P(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
const getPointOnQuadraticCurve = (
  t: number,
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number }
) => {
  const t1 = 1 - t;
  const x = t1 * t1 * start.x + 2 * t1 * t * control.x + t * t * end.x;
  const y = t1 * t1 * start.y + 2 * t1 * t * control.y + t * t * end.y;
  return { x, y };
};

export const RhythmArc = ({
  mode,
  startTime,
  typicalDuration,
  currentTime,
  theme,
  stateMessage,
}: RhythmArcProps) => {
  // Calculate progress (0 to 1.5+ to allow overtired visualization)
  const elapsedMinutes = differenceInMinutes(currentTime, startTime);
  const rawProgress = elapsedMinutes / typicalDuration;
  const progress = Math.max(0, Math.min(rawProgress, 1.5)); // Cap at 150%
  
  // Arc configuration - quadratic Bézier curve
  const viewBoxWidth = 520;
  const viewBoxHeight = 200;
  const padding = 40;
  
  // Quadratic arc points: bottom-left → top-center → bottom-right
  const startPoint = { x: padding, y: viewBoxHeight - 20 };
  const controlPoint = { x: viewBoxWidth / 2, y: 30 }; // Peak of arc
  const endPoint = { x: viewBoxWidth - padding, y: viewBoxHeight - 20 };
  
  // Create the full arc path (SVG quadratic Bézier)
  const arcPath = `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`;
  
  // Calculate icon position along the arc (clamped to 0-1 for display)
  const iconProgress = Math.min(progress, 1.0);
  const iconPosition = getPointOnQuadraticCurve(
    iconProgress,
    startPoint,
    controlPoint,
    endPoint
  );
  
  // Calculate trail path (from start to current position)
  const trailEndPoint = getPointOnQuadraticCurve(
    iconProgress,
    startPoint,
    controlPoint,
    endPoint
  );
  const trailPath = `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${trailEndPoint.x} ${trailEndPoint.y}`;
  
  // Zone detection
  const inTwilightZone = progress >= 0.8 && progress <= 1.0;
  const isOvertired = progress > 1.0;
  
  // Color scheme based on theme and progress
  const getColors = () => {
    if (isOvertired) {
      return {
        base: "hsl(15 40% 90%)",
        trail: "hsl(0 60% 65%)",
        glow: "hsl(0 70% 60%)",
        icon: "hsl(0 70% 55%)",
      };
    }
    
    if (theme === "night") {
      return {
        base: "hsl(240 25% 80%)",
        trail: "hsl(245 30% 70%)",
        glow: "hsl(240 40% 75%)",
        icon: "hsl(240 30% 70%)",
      };
    }
    
    // Day theme
    return {
      base: "hsl(30 40% 92%)",
      trail: inTwilightZone ? "hsl(25 50% 80%)" : "hsl(40 60% 88%)",
      glow: "#FFD580",
      icon: "#FFB347",
    };
  };
  
  const colors = getColors();
  const IconComponent = theme === "night" ? Moon : Sun;

  return (
    <div className="px-6 pb-0 relative z-10">
      <div className="relative w-full flex flex-col items-center">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '100%', overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="rhythmGlow">
              <stop offset="0%" stopColor={colors.glow} stopOpacity="0.6" />
              <stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
            </radialGradient>
          </defs>
          
          {/* Base arc (full path) */}
          <path
            d={arcPath}
            fill="none"
            stroke={colors.base}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.35"
          />
          
          {/* Twilight zone highlight (80-100%) */}
          {inTwilightZone && !isOvertired && (
            <path
              d={arcPath}
              fill="none"
              stroke={colors.trail}
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.3"
              strokeDasharray={`${(endPoint.x - startPoint.x) * 0.2} ${(endPoint.x - startPoint.x) * 0.8}`}
              strokeDashoffset={-(endPoint.x - startPoint.x) * 0.8}
            />
          )}
          
          {/* Progress trail */}
          <path
            d={trailPath}
            fill="none"
            stroke={colors.trail}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.7"
            className="transition-all duration-300 ease-out"
          />
          
          {/* Icon glow */}
          <circle
            cx={iconPosition.x}
            cy={iconPosition.y}
            r="28"
            fill="url(#rhythmGlow)"
            className="transition-all duration-300 ease-out"
          />
          
          {/* Icon */}
          <g
            transform={`translate(${iconPosition.x}, ${iconPosition.y})`}
            className="transition-all duration-300 ease-out"
          >
            {theme === "night" ? (
              <>
                {/* Moon circle */}
                <circle
                  r="11"
                  fill={colors.icon}
                  style={{
                    filter: 'drop-shadow(0 0 8px hsla(240, 30%, 75%, 0.5))'
                  }}
                />
                {/* Crescent shadow */}
                <path
                  d="M 2 -11 A 9 9 0 0 1 2 11 A 7 7 0 0 0 2 -11 Z"
                  fill="hsl(240 20% 55%)"
                  opacity="0.4"
                />
              </>
            ) : (
              <circle
                r="11"
                fill={colors.icon}
                style={{
                  filter: isOvertired
                    ? 'drop-shadow(0 0 10px hsla(0, 70%, 60%, 0.7))'
                    : 'drop-shadow(0 0 12px rgba(255, 213, 128, 0.7))'
                }}
              />
            )}
          </g>
          
          {/* Subtle connector line from icon to card */}
          <line
            x1={iconPosition.x}
            y1={iconPosition.y + 14}
            x2={viewBoxWidth / 2}
            y2={viewBoxHeight + 5}
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="2,3"
            opacity="0.15"
            className="transition-all duration-300 ease-out"
          />
          
          {/* Zone labels */}
          {inTwilightZone && !isOvertired && (
            <text
              x={endPoint.x - 50}
              y={endPoint.y + 30}
              textAnchor="middle"
              className="text-[9px] font-medium fill-muted-foreground"
            >
              Wind down
            </text>
          )}
          {isOvertired && (
            <text
              x={endPoint.x - 50}
              y={endPoint.y + 30}
              textAnchor="middle"
              className="text-[9px] font-semibold"
              fill={colors.icon}
            >
              Overtired
            </text>
          )}
        </svg>
        
        {/* State card below arc */}
        <Card className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-6 py-3 shadow-md border-border/40 bg-card backdrop-blur-sm">
          <p 
            className="text-[18px] font-serif font-semibold text-foreground tracking-tight text-center leading-snug whitespace-nowrap"
            style={{ fontVariationSettings: '"SOFT" 100' }}
          >
            {stateMessage}
          </p>
        </Card>
      </div>
    </div>
  );
};
