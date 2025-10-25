// Lightweight DOM-to-image without external deps

function copyComputedStyle(source: Element, target: HTMLElement) {
  const computed = window.getComputedStyle(source as HTMLElement);
  const props = [
    'position','display','top','left','right','bottom','width','height','min-width','min-height','max-width','max-height',
    'margin','padding','gap','inset','transform','transform-origin','opacity','z-index',
    'background','background-color','background-image','background-size','background-position','background-repeat','backdrop-filter',
    'border','border-radius','border-color','border-width','border-style',
    'color','font','font-size','font-weight','font-family','line-height','letter-spacing','text-align','text-shadow',
    'box-shadow','overflow','white-space','flex','flex-direction','align-items','justify-content','grid','grid-template-columns','grid-template-rows'
  ];
  const styleText = props
    .map((p) => {
      const v = computed.getPropertyValue(p);
      return v ? `${p}:${v};` : '';
    })
    .join('');
  (target as HTMLElement).setAttribute('style', styleText);
}

function inlineAllStyles(node: Element): HTMLElement {
  const clone = node.cloneNode(false) as HTMLElement;
  copyComputedStyle(node, clone);

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childClone = inlineAllStyles(child as Element);
      clone.appendChild(childClone);
    } else if (child.nodeType === Node.TEXT_NODE) {
      clone.appendChild(document.createTextNode(child.textContent || ''));
    }
  }
  return clone;
}

async function elementToPngBlob(element: HTMLElement): Promise<Blob> {
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);

  const cloneWithStyles = inlineAllStyles(element);
  // Ensure base background so transparent cards look okay
  if (!cloneWithStyles.style.backgroundColor) {
    cloneWithStyles.style.backgroundColor = getComputedStyle(document.body).backgroundColor || 'white';
  }

  const html = new XMLSerializer().serializeToString(cloneWithStyles);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject x="0" y="0" width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>
  `;
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function shareElement(element: HTMLElement, title: string, caption?: string): Promise<void> {
  const blob = await elementToPngBlob(element);
  let file: File | null = null;
  try {
    file = new File([blob], `${title.replace(/\s+/g, '-').toLowerCase()}.png`, { type: 'image/png' });
  } catch {}
  try {
    const nav: any = navigator as any;
    if (nav && typeof nav.share === 'function') {
        if (file && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title, text: caption || title });
          return;
        }
      // Fallback: share data URL via Web Share Level 1
      const dataUrl = await blobToDataURL(blob);
      await nav.share({ title, text: caption || title, url: dataUrl });
      return;
    }
  } catch {}

  // Try Capacitor if present (no import)
  try {
    const cap = (window as any).Capacitor;
    const sharePlugin = cap?.Plugins?.Share;
    if (sharePlugin && typeof sharePlugin.share === 'function') {
      const dataUrl = await blobToDataURL(blob);
      await sharePlugin.share({ title, text: caption || title, url: dataUrl, dialogTitle: 'Share chart' });
      return;
    }
  } catch {}

  // Fallback to download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = `${title.replace(/\s+/g, '-').toLowerCase()}.png`;
  link.download = file?.name || safeName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getWeekCaption(weekOffset: number = 0): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek - weekOffset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Week of ${fmt(startOfWeek)} – ${fmt(endOfWeek)}`;
}

async function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
