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
  
  // Arc configuration - elevated arc above horizon with increased vertical curvature
  const viewBoxWidth = 520;
  const viewBoxHeight = 260; // Increased to accommodate higher arc
  const padding = 50;
  const horizonY = 180; // Horizon at bottom (fixed position)
  const arcStartEndY = 120; // Arc endpoints elevated above horizon
  const arcPeakY = -45; // Peak of the arc - increased curvature for moonpath effect
  
  // Arc endpoints elevated above horizon, curving upward
  const startPoint = { x: padding, y: arcStartEndY };
  const controlPoint = { x: viewBoxWidth / 2, y: arcPeakY };
  const endPoint = { x: viewBoxWidth - padding, y: arcStartEndY };
  
  // Create the full arc path (SVG quadratic Bézier)
  const arcPath = `M ${startPoint.x} ${startPoint.y} Q ${controlPoint.x} ${controlPoint.y} ${endPoint.x} ${endPoint.y}`;
  
  // Calculate icon position - use same progress as wedge for consistency
  // For overtired (> 1.0), extrapolate beyond the arc
  let iconPosition;
  let iconProgress;
  
  if (progress > 1.0) {
    // Extrapolate beyond end point for overtired state
    iconProgress = Math.min(progress, 1.5);
    const extraProgress = iconProgress - 1.0; // 0 to 0.5
    
    // Calculate direction vector from control to end
    const dx = endPoint.x - controlPoint.x;
    const dy = endPoint.y - controlPoint.y;
    
    // Extrapolate position
    iconPosition = {
      x: endPoint.x + dx * extraProgress * 0.8,
      y: endPoint.y + dy * extraProgress * 0.8
    };
  } else {
    // Use same progress as wedge for normal operation (0 to 1.0)
    iconProgress = progress;
    iconPosition = getPointOnQuadraticCurve(
      iconProgress,
      startPoint,
      controlPoint,
      endPoint
    );
  }
  
  // De Casteljau subdivision for wedge path (only for progress <= 1.0)
  const wedgeProgress = Math.min(progress, 1.0);
  const wedgePosition = getPointOnQuadraticCurve(
    wedgeProgress,
    startPoint,
    controlPoint,
    endPoint
  );
  
  const t = wedgeProgress;
  const t1 = 1 - t;
  
  // First level interpolation
  const q0 = {
    x: t1 * startPoint.x + t * controlPoint.x,
    y: t1 * startPoint.y + t * controlPoint.y
  };
  
  // Wedge path for sundial-style fill: confined between arc curve and baseline
  // The baseline is the y-coordinate of the arc endpoints (arcStartEndY)
  // Start slightly inward from the left edge for a softer appearance
  const baselineY = arcStartEndY;
  const wedgeStartX = startPoint.x + 8; // 8px inward for rounded feel
  const wedgePath = `
    M ${wedgeStartX} ${baselineY}
    L ${wedgeStartX} ${startPoint.y}
    Q ${q0.x} ${q0.y} ${wedgePosition.x} ${wedgePosition.y}
    L ${wedgePosition.x} ${baselineY}
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

  return (
    <div className="px-6 pb-2 relative z-10">
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-0.75px); }
        }
      `}</style>
      <div className="relative w-full flex flex-col items-center">
        <svg
          viewBox={`0 -50 ${viewBoxWidth} 230`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ maxWidth: '100%', overflow: 'visible' }}
        >
          <defs>
            {/* Soft icon glow - warm for day, cool for night */}
            <radialGradient id="iconGlow">
              <stop offset="0%" stopColor={colors.glow} stopOpacity="0.3" />
              <stop offset="40%" stopColor={colors.glow} stopOpacity="0.15" />
              <stop offset="100%" stopColor={colors.glow} stopOpacity="0" />
            </radialGradient>
            
            {/* Light wedge gradient - vertical: brighter at arc, darker at baseline */}
            <linearGradient id="lightWedge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.trail} stopOpacity="0.18" />
              <stop offset="100%" stopColor={colors.trail} stopOpacity="0.08" />
            </linearGradient>
            
            {/* Arc stroke gradient - lighter at peak, darker at ends */}
            <linearGradient id="arcStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.base} stopOpacity="0.5" />
              <stop offset="50%" stopColor={colors.base} stopOpacity="0.7" />
              <stop offset="100%" stopColor={colors.base} stopOpacity="0.5" />
            </linearGradient>
            
            {/* Horizon ambient glow */}
            <linearGradient id="horizonGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.glow} stopOpacity="0" />
              <stop offset="100%" stopColor={colors.glow} stopOpacity="0.06" />
            </linearGradient>
          </defs>
          
          {/* Horizon ambient glow backdrop - only above horizon line */}
          <rect
            x="0"
            y={horizonY - 40}
            width={viewBoxWidth}
            height="40"
            fill="url(#horizonGlow)"
            opacity="0.7"
          />
          
          {/* Light wedge - sweeps across as sun moves */}
          <path
            d={wedgePath}
            fill="url(#lightWedge)"
            className="transition-all duration-700 ease-out"
          />
          
          {/* Base arc path - thicker with gradient stroke */}
          <path
            d={arcPath}
            fill="none"
            stroke="url(#arcStroke)"
            strokeWidth="5"
            strokeLinecap="round"
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
          
          {/* Sun/Moon icon group - centered at curve point with breathing animation */}
          <g 
            transform={`translate(${iconPosition.x}, ${iconPosition.y})`}
            className="transition-all duration-700 ease-out"
          >
            {/* Subtle glow backdrop */}
            <circle
              cx="0"
              cy="0"
              r="32"
              fill="url(#iconGlow)"
              className="animate-[pulse_8s_ease-in-out_infinite]"
            />
            
            {/* Icon with breathing motion */}
            <g className="animate-[breathe_8s_ease-in-out_infinite]">
              {theme === "night" ? (
                // Moon icon - cool silvery glow
                <g>
                  <circle
                    cx="0"
                    cy="0"
                    r="11"
                    fill={colors.icon}
                    opacity="0.95"
                    filter={`drop-shadow(0 0 10px hsla(235, 20%, 72%, 0.4)) drop-shadow(0 0 20px hsla(235, 20%, 72%, 0.25))`}
                  />
                  <circle
                    cx="3.5"
                    cy="-2"
                    r="9"
                    fill="hsl(var(--background))"
                    opacity="0.5"
                  />
                </g>
              ) : (
                // Sun icon - warm golden glow
                <g>
                  <circle
                    cx="0"
                    cy="0"
                    r="9"
                    fill={colors.icon}
                    filter={isOvertired 
                      ? `drop-shadow(0 0 12px hsla(15, 35%, 65%, 0.5)) drop-shadow(0 0 24px hsla(15, 35%, 65%, 0.3))`
                      : `drop-shadow(0 0 14px hsla(38, 40%, 75%, 0.5)) drop-shadow(0 0 28px hsla(38, 40%, 75%, 0.3))`
                    }
                  />
                  {/* Sun rays */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                    const radians = (angle * Math.PI) / 180;
                    const x1 = Math.cos(radians) * 13;
                    const y1 = Math.sin(radians) * 13;
                    const x2 = Math.cos(radians) * 18;
                    const y2 = Math.sin(radians) * 18;
                    return (
                      <line
                        key={angle}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={colors.icon}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              )}
            </g>
          </g>
          
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
          {/* State message - positioned under arc, centered vertically between peak and baseline */}
          <foreignObject
            x={controlPoint.x - 160}
            y={20}
            width="320"
            height="120"
          >
            <div className="w-full h-full flex items-center justify-center px-4">
              <p 
                className="text-[24px] font-bold text-foreground/90 tracking-tight text-center leading-tight"
                style={{
                  fontVariationSettings: '"wght" 700'
                }}
              >
                {stateMessage}
              </p>
            </div>
          </foreignObject>
        </svg>
      </div>
    </div>
  );
};
