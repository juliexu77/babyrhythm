import { Card } from "@/components/ui/card";

/**
 * Typography Guide - Showcases all typography utility classes
 * Use this component to preview and understand the design system typography
 */
export const TypographyGuide = () => {
  return (
    <div className="p-6 space-y-8 bg-background min-h-screen">
      <div className="space-y-2">
        <h1 className="text-page-header">
          Typography System
        </h1>
        <p className="text-body-muted">
          Consistent font-weight hierarchy for labels, headings, and text
        </p>
      </div>

      {/* Section Headers */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg text-strong">Section Headers</h2>
        <div className="space-y-3 divide-y divide-border/50">
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-section-header</code>
            <p className="text-section-header mt-2">Today's Snapshot</p>
            <p className="text-xs text-muted-foreground mt-1">
              Used for major section titles (12px, semibold, muted)
            </p>
          </div>
        </div>
      </Card>

      {/* Form Labels */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg text-strong">Form Labels</h2>
        <div className="space-y-3 divide-y divide-border/50">
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-form-label</code>
            <p className="text-form-label mt-2">Full Name</p>
            <p className="text-xs text-muted-foreground mt-1">
              Used for input labels (12px, medium, muted)
            </p>
          </div>
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-label-sm</code>
            <p className="text-label-sm mt-2">Bedtime</p>
            <p className="text-xs text-muted-foreground mt-1">
              Used for small helper labels (10px, medium, muted)
            </p>
          </div>
        </div>
      </Card>

      {/* Card Typography */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg text-strong">Card Typography</h2>
        <div className="space-y-3 divide-y divide-border/50">
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-card-title</code>
            <p className="text-card-title mt-2">Night Sleep Trends</p>
            <p className="text-xs text-muted-foreground mt-1">
              Used for card headers (14px, semibold, foreground)
            </p>
          </div>
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-card-subtitle</code>
            <p className="text-card-subtitle mt-2">Feed Volume</p>
            <p className="text-xs text-muted-foreground mt-1">
              Used for card subtitles (12px, medium, muted)
            </p>
          </div>
        </div>
      </Card>

      {/* Body Text */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg text-strong">Body Text</h2>
        <div className="space-y-3 divide-y divide-border/50">
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-body</code>
            <p className="text-body mt-2">Today's rhythm is flowing naturally with balanced naps and feeds.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Standard body text (14px, normal, foreground)
            </p>
          </div>
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-body-muted</code>
            <p className="text-body-muted mt-2">This helps us distinguish naps from night sleep.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Muted body text (14px, normal, muted)
            </p>
          </div>
        </div>
      </Card>

      {/* Emphasis */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg text-strong">Emphasis</h2>
        <div className="space-y-3 divide-y divide-border/50">
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-emphasis</code>
            <p className="text-emphasis mt-2">Important information highlighted</p>
            <p className="text-xs text-muted-foreground mt-1">
              Medium weight emphasis (medium, foreground)
            </p>
          </div>
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-strong</code>
            <p className="text-strong mt-2">This Week</p>
            <p className="text-xs text-muted-foreground mt-1">
              Strong emphasis for headings (semibold, foreground)
            </p>
          </div>
        </div>
      </Card>

      {/* Statistics */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg text-strong">Statistics</h2>
        <div className="space-y-3 divide-y divide-border/50">
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-stat</code>
            <p className="text-stat text-2xl mt-2">10.5<span className="text-sm font-normal text-muted-foreground ml-1">h</span></p>
            <p className="text-xs text-muted-foreground mt-1">
              Used for large numeric stats (bold, tabular-nums, foreground)
            </p>
          </div>
          <div className="pt-3">
            <code className="text-xs bg-muted px-2 py-1 rounded">.text-stat-label</code>
            <p className="text-stat-label mt-2">Night Sleep</p>
            <p className="text-xs text-muted-foreground mt-1">
              Label for stats (10px, medium, muted)
            </p>
          </div>
        </div>
      </Card>

      {/* Usage Examples */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg text-strong">Usage Example</h2>
        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
          <div className="space-y-1">
            <h3 className="text-section-header">Today's Snapshot</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-stat-label mb-1">Night Sleep</p>
              <p className="text-xl text-stat">10.5<span className="text-sm font-normal text-muted-foreground ml-0.5">h</span></p>
            </div>
            <div>
              <p className="text-stat-label mb-1">Naps</p>
              <p className="text-xl text-stat">3<span className="text-sm font-normal text-muted-foreground ml-0.5">/day</span></p>
            </div>
            <div>
              <p className="text-stat-label mb-1">Feeds</p>
              <p className="text-xl text-stat">28<span className="text-sm font-normal text-muted-foreground ml-0.5">oz</span></p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TypographyGuide;
