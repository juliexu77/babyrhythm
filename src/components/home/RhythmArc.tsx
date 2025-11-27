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
  
  // Arc configuration - gentle quadratic Bézier curve (horizon-like)
  const viewBoxWidth = 520;
  const viewBoxHeight = 180;
  const padding = 50;
  const horizonY = viewBoxHeight - 20; // Horizon line at bottom
  
  // Flatter arc: bottom-left → gentle peak → bottom-right (like sun on horizon)
  const startPoint = { x: padding, y: horizonY };
  const controlPoint = { x: viewBoxWidth / 2, y: 50 }; // Peak of the arc
  const endPoint = { x: viewBoxWidth - padding, y: horizonY };
  
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
  
  // Calculate the partial control point for the wedge to follow the arc curve exactly
  // This ensures the wedge traces the same curve as the arc up to the icon position
  const partialControlPoint = {
    x: startPoint.x + iconProgress * (controlPoint.x - startPoint.x),
    y: startPoint.y + iconProgress * (controlPoint.y - startPoint.y)
  };
  
  // Create wedge path: follows the arc curve precisely from start to icon, then fills down to horizon
  // This creates the "light sweeping across" effect with the icon positioned exactly on the arc edge
  const wedgePath = `
    M ${startPoint.x} ${startPoint.y}
    Q ${partialControlPoint.x} ${partialControlPoint.y} ${iconPosition.x} ${iconPosition.y}
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
        
        {/* State message text */}
        <p 
          className="mt-3 text-[15px] font-medium text-muted-foreground tracking-tight text-center"
        >
          {stateMessage}
        </p>
      </div>
    </div>
  );
};
