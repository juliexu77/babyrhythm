import { useEffect, useRef } from "react";
import WeeklyReport from "@/pages/WeeklyReport";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
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

        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight; // shift up to create a crop
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
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

        // Share via Capacitor if native, otherwise download
        try {
          if (Capacitor.isNativePlatform()) {
            const pdfBlob = pdf.output("blob");
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(pdfBlob);
            });

            await Share.share({
              title: `${babyName || "Baby"} Activity Report`,
              text: `Activity report generated on ${format(now, "MMM dd, yyyy")}`,
              url: base64,
              dialogTitle: "Share Report",
            });
          } else {
            pdf.save(fileName);
          }
        } catch (shareErr) {
          console.error("Share failed, downloading instead:", shareErr);
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
