import { useEffect, useRef } from "react";
import WeeklyReport from "@/pages/WeeklyReport";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { format } from "date-fns";
import { ReportConfig } from "./ReportConfigModal";

interface ReportShareCaptureProps {
  open: boolean;
  onDone: () => void;
  babyName?: string;
  config?: ReportConfig;
}

// Renders the WeeklyReport off-screen, captures it to a multi-page PDF, then shares via Capacitor (fallback: download)
export function ReportShareCapture({ open, onDone, babyName, config }: ReportShareCaptureProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const generate = async () => {
      // Wait a bit for charts to render
      await new Promise((r) => setTimeout(r, 650));
      const el = containerRef.current;
      if (!el) return;

      try {
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Add explicit margins so iOS PDF viewers show space at bottom
        const margin = 15; // mm
        const contentWidth = pageWidth - margin * 2;
        const contentHeight = pageHeight - margin * 2;
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        let heightLeft = imgHeight;
        let yOffset = 0; // Track how much of the image we've already shown

        // First page
        pdf.addImage(imgData, "PNG", margin, margin, contentWidth, imgHeight);
        heightLeft -= contentHeight;
        yOffset += contentHeight;

        // Additional pages with same margins
        while (heightLeft > 0) {
          pdf.addPage();
          // Position is negative to shift image up, plus top margin
          pdf.addImage(imgData, "PNG", margin, margin - yOffset, contentWidth, imgHeight);
          heightLeft -= contentHeight;
          yOffset += contentHeight;
        }

        const now = new Date();
        const getFileName = () => {
          const baseName = (babyName || "baby").toLowerCase();
          if (config?.dateRange === 'custom' && config.customStartDate && config.customEndDate) {
            return `${baseName}-report-${format(config.customStartDate, "yyyy-MM-dd")}-to-${format(config.customEndDate, "yyyy-MM-dd")}.pdf`;
          }
          if (config?.dateRange === 'last-week') {
            return `${baseName}-report-last-week-${format(now, "yyyy-MM-dd")}.pdf`;
          }
          return `${baseName}-report-this-week-${format(now, "yyyy-MM-dd")}.pdf`;
        };
        const fileName = getFileName();

        // Download PDF locally
        try {
          if (Capacitor.isNativePlatform()) {
            // Native: Save to Documents directory
            const pdfBlob = pdf.output("blob");
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(pdfBlob);
            });

            const base64data = base64.split(",")[1] || base64;
            
            // Save to Documents directory
            await Filesystem.writeFile({ 
              path: fileName, 
              data: base64data, 
              directory: Directory.Documents 
            });
            
            // Get URI and trigger download/save
            const { uri } = await Filesystem.getUri({ 
              path: fileName, 
              directory: Directory.Documents 
            });

            // Create a temporary link to trigger browser download
            const a = document.createElement('a');
            a.href = uri;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            // Web: Simple download
            pdf.save(fileName);
          }
        } catch (err) {
          console.error("Failed to download PDF:", err);
          // Fallback to simple download
          pdf.save(fileName);
        }
      } catch (err) {
        console.error("Failed to create weekly report PDF:", err);
      } finally {
        if (!cancelled) onDone();
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [open, onDone, babyName]);

  // Off-screen render so layout calculates while staying invisible
  return open ? (
    <div
      aria-hidden
      ref={containerRef}
      style={{
        position: "fixed",
        left: -2000,
        top: 0,
        width: 1024,
        background: "#ffffff",
        padding: 16,
        zIndex: -1,
      }}
    >
      <WeeklyReport config={config} />
    </div>
  ) : null;
}
