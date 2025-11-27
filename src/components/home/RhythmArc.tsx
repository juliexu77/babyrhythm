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
  const elapsedMinutes = Math.max(0, differenceInMinutes(currentTime, startTime)); // Prevent negative
  const rawProgress = elapsedMinutes / typicalDuration;
  const progress = Math.max(0, Math.min(rawProgress, 1.5)); // Cap at 150%
  
  // Arc configuration - elevated arc above horizon
  const viewBoxWidth = 520;
  const viewBoxHeight = 200;
  const padding = 50;
  const horizonY = viewBoxHeight - 20; // Horizon at bottom (180)
  const arcStartEndY = 120; // Arc endpoints elevated above horizon
  const arcPeakY = 40; // Peak of the arc
  
  // Arc endpoints elevated above horizon, curving upward
  const startPoint = { x: padding, y: arcStartEndY };
  const controlPoint = { x: viewBoxWidth / 2, y: arcPeakY };
  const endPoint = { x: viewBoxWidth - padding, y: arcStartEndY };
  
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
  
  // De Casteljau subdivision for quadratic Bézier
  // To split curve at t, first control point = lerp(P0, P1, t)
  // But we also need to account that the curve continues to P2
  const t = iconProgress;
  const t1 = 1 - t;
  
  // First level interpolation
  const q0 = {
    x: t1 * startPoint.x + t * controlPoint.x,
    y: t1 * startPoint.y + t * controlPoint.y
  };
  const q1 = {
    x: t1 * controlPoint.x + t * endPoint.x,
    y: t1 * controlPoint.y + t * endPoint.y
  };
  
  // The control point for the first segment (0 to t) is q0
  // The end point is the interpolation of q0 and q1 at t (which equals iconPosition)
  
  // Create wedge path: follows the exact arc curve from start to icon, then fills down to horizon
  const wedgePath = `
    M ${startPoint.x} ${startPoint.y}
    Q ${q0.x} ${q0.y} ${iconPosition.x} ${iconPosition.y}
    L ${iconPosition.x} ${horizonY}
    L ${startPoint.x} ${horizonY}
    Z
  `;
  
  // Zone detection
  const inTwilightZone = progress >= 0.8 && progress <= 1.0;
  const isOvertired = progress > 1.0;
  
  // Sophisticated color scheme - sunrise/sunset inspired
  const getColors = () => {
    if (isOvertired) {
      return {
        base: "hsl(20 15% 88%)",
        trail: "hsl(15 25% 75%)",
        glow: "hsl(15 30% 70%)",
        icon: "hsl(15 35% 65%)",
        horizonGlow: "hsla(15, 25%, 75%, 0.15)",
      };
    }
    
    if (theme === "night") {
      return {
        base: "hsl(230 12% 85%)",
        trail: "hsl(235 15% 78%)",
        glow: "hsl(235 18% 75%)",
        icon: "hsl(235 20% 72%)",
        horizonGlow: "hsla(235, 15%, 78%, 0.12)",
      };
    }
    
    // Day theme - soft golden sunrise/sunset
    return {
      base: "hsl(35 20% 90%)",
      trail: inTwilightZone ? "hsl(30 28% 82%)" : "hsl(40 25% 85%)",
      glow: "hsl(40 35% 78%)",
      icon: "hsl(38 40% 75%)",
      horizonGlow: inTwilightZone ? "hsla(30, 28%, 82%, 0.18)" : "hsla(40, 25%, 85%, 0.15)",
    };
  };
  
  const colors = getColors();
  const IconComponent = theme === "night" ? Moon : Sun;

  return (
    <div className="px-6 pb-6 relative z-10">
      <div className="relative w-full flex flex-col items-center">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '100%', overflow: 'visible' }}
        >
          <defs>
            {/* Sun glow gradient */}
            <radialGradient id="sunGlow">
              <stop offset="0%" stopColor={colors.glow} stopOpacity="0.4" />
              <stop offset="50%" stopColor={colors.glow} stopOpacity="0.2" />
              <stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
            </radialGradient>
            
            {/* Light wedge gradient - fades from sun position down to horizon */}
            <linearGradient id="lightWedge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.trail} stopOpacity="0.25" />
              <stop offset="70%" stopColor={colors.trail} stopOpacity="0.12" />
              <stop offset="100%" stopColor={colors.trail} stopOpacity="0.03" />
            </linearGradient>
            
            {/* Horizon ambient glow */}
            <linearGradient id="horizonGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.glow} stopOpacity="0" />
              <stop offset="100%" stopColor={colors.glow} stopOpacity="0.06" />
            </linearGradient>
          </defs>
          
          {/* Horizon ambient glow backdrop */}
          <rect
            x="0"
            y={horizonY - 40}
            width={viewBoxWidth}
            height="60"
            fill="url(#horizonGlow)"
            opacity="0.7"
          />
          
          {/* Light wedge - sweeps across as sun moves */}
          <path
            d={wedgePath}
            fill="url(#lightWedge)"
            className="transition-all duration-700 ease-out"
            style={{ mixBlendMode: 'screen' }}
          />
          
          {/* Base arc path - thin line above the wedge */}
          <path
            d={arcPath}
            fill="none"
            stroke={colors.base}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.3"
          />
          
          {/* Twilight zone subtle pulse on arc */}
          {inTwilightZone && !isOvertired && (
            <path
              d={arcPath}
              fill="none"
              stroke={colors.trail}
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.25"
              strokeDasharray="10 20"
              className="transition-all duration-500 ease-out"
            />
          )}
          
          {/* Sun glow - radial gradient centered exactly on arc position */}
          <circle
            cx={iconPosition.x}
            cy={iconPosition.y}
            r="40"
            fill="url(#sunGlow)"
            className="transition-all duration-700 ease-out"
          />
          
          {/* Sun/Moon icon - center positioned exactly on arc curve */}
          <foreignObject
            x={iconPosition.x - 12}
            y={iconPosition.y - 12}
            width="24"
            height="24"
            className="transition-all duration-700 ease-out"
            style={{ overflow: 'visible' }}
          >
            <div 
              className="w-full h-full flex items-center justify-center"
              style={{ 
                transform: 'translate(0, 0)',
                position: 'relative'
              }}
            >
              <IconComponent 
                size={24} 
                strokeWidth={2}
                style={{
                  color: colors.icon,
                  filter: theme === "night" 
                    ? 'drop-shadow(0 0 8px hsla(235, 20%, 72%, 0.5)) drop-shadow(0 0 16px hsla(235, 20%, 72%, 0.3))'
                    : isOvertired
                      ? 'drop-shadow(0 0 10px hsla(15, 35%, 65%, 0.6)) drop-shadow(0 0 20px hsla(15, 35%, 65%, 0.4))'
                      : 'drop-shadow(0 0 12px hsla(38, 40%, 75%, 0.6)) drop-shadow(0 0 24px hsla(38, 40%, 75%, 0.4))',
                }}
              />
            </div>
          </foreignObject>
          
          {/* Subtle anchor point to visualize icon is on the arc */}
          <circle
            cx={iconPosition.x}
            cy={iconPosition.y}
            r="2"
            fill={colors.icon}
            opacity="0.4"
            className="transition-all duration-700 ease-out"
          />
          
          {/* Refined zone labels */}
          {inTwilightZone && !isOvertired && (
            <text
              x={endPoint.x - 50}
              y={endPoint.y + 25}
              textAnchor="middle"
              className="text-[8px] font-medium tracking-wide uppercase"
              fill="hsl(var(--muted-foreground))"
              opacity="0.5"
            >
              Wind down
            </text>
          )}
          {isOvertired && (
            <text
              x={endPoint.x - 50}
              y={endPoint.y + 25}
              textAnchor="middle"
              className="text-[8px] font-medium tracking-wide uppercase"
              fill={colors.icon}
              opacity="0.6"
            >
              Overtired
            </text>
          )}
        </svg>
        
        {/* State message - positioned directly under arc center */}
        <div 
          className="mt-4 max-w-[180px] mx-auto"
        >
          <p 
            className="text-[18px] font-bold text-foreground/90 tracking-tight text-center leading-tight"
            style={{
              wordSpacing: '100vw', // Force line breaks after each word
              fontVariationSettings: '"wght" 700'
            }}
          >
            {stateMessage}
          </p>
        </div>
      </div>
    </div>
  );
};
