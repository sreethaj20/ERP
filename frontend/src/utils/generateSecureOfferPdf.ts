import html2canvas from 'html2canvas';
import {
    PDFDocument,
    PDFName,
    PDFHexString,
    PDFArray,
    PDFDict,
    PDFNumber,
} from 'pdf-lib';

/**
 * Renders the offer letter HTML element into a secure PDF where:
 * - All content is read-only / non-editable (baked as images)
 * - A single AcroForm signature field is added for the candidate
 * - SigFlags=3 (AppendOnly) prevents any structural edits in Adobe Acrobat
 *
 * @param containerEl  The DOM element wrapping <OfferLetterTemplate>
 * @param fileName     Desired download file name (e.g. "Offer_Letter_John.pdf")
 */
export async function generateSecureOfferPdf(
    containerEl: HTMLElement,
    fileName: string
): Promise<void> {
    // ── 1. Render each .offer-page div to a PNG image ────────────────────
    const pages = containerEl.querySelectorAll<HTMLElement>('.offer-page');
    if (!pages.length) {
        throw new Error('No .offer-page elements found inside the container.');
    }

    // A4 dimensions in PDF points (1 pt = 1/72 inch)
    const A4_WIDTH_PT = 595.28;
    const A4_HEIGHT_PT = 841.89;

    // Browser renders at 96 DPI. 1 CSS px = 72/96 = 0.75 pt
    const PX_TO_PT = 72 / 96;

    const pdfDoc = await PDFDocument.create();
    const pdfPages: ReturnType<typeof pdfDoc.addPage>[] = [];

    // Store per-page scaling info for sig-box coordinate mapping
    const pageScaleInfos: {
        imgX: number; imgY: number;
        imgW: number; imgH: number;
        cssW: number; cssH: number;
    }[] = [];

    // ── Helper: find the nearest scrollable ancestor of an element ───────
    function getScrollableAncestor(el: HTMLElement): HTMLElement | null {
        let node: HTMLElement | null = el.parentElement;
        while (node) {
            const overflow = window.getComputedStyle(node).overflowY;
            if (overflow === 'auto' || overflow === 'scroll') return node;
            node = node.parentElement;
        }
        return null;
    }

    for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;

        // ── Scroll-guard: ensure this page element is fully visible ───────
        // Find the scrollable overlay container (the fixed preview div)
        const scrollContainer = getScrollableAncestor(pageEl);
        const savedScrollTop = scrollContainer?.scrollTop ?? window.scrollY;
        const savedScrollLeft = scrollContainer?.scrollLeft ?? window.scrollX;

        // Scroll so that the top of this page element is at the top of the container
        if (scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elRect = pageEl.getBoundingClientRect();
            scrollContainer.scrollTop += elRect.top - containerRect.top;
        } else {
            pageEl.scrollIntoView({ behavior: 'instant', block: 'start' });
        }

        // Wait for layout & paint to fully settle after scroll
        await new Promise<void>(resolve => setTimeout(resolve, 80));

        // Snapshot the element's exact rendered CSS pixel dimensions AFTER scroll settle
        const cssRect = pageEl.getBoundingClientRect();
        const cssW = cssRect.width;
        const cssH = cssRect.height;

        // Capture at 2× for sharpness; underlying content size stays cssW × cssH CSS px
        // Pass scrollX/scrollY so html2canvas maps element position correctly despite scroll
        const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            // Pass exact float dimensions — html2canvas handles sub-pixel internally
            width: cssW,
            height: cssH,
            // Tell html2canvas the current scroll state so element-relative coordinates are correct
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
        });

        // ── Restore scroll position after capture ─────────────────────────
        if (scrollContainer) {
            scrollContainer.scrollTop = savedScrollTop;
            scrollContainer.scrollLeft = savedScrollLeft;
        }

        // Map the element's CSS pixel dimensions to PDF points (pixel-perfect, no stretch)
        const imgWpt = cssW * PX_TO_PT;
        const imgHpt = cssH * PX_TO_PT;

        // Centre the page image on the A4 canvas (handles cases where content ≠ exact A4)
        const imgX = Math.max(0, (A4_WIDTH_PT - imgWpt) / 2);
        // PDF y=0 is the bottom; place the image starting from the top
        const imgY = Math.max(0, A4_HEIGHT_PT - imgHpt - (A4_HEIGHT_PT - imgHpt) / 2);

        const imgDataUrl = canvas.toDataURL('image/png');
        const imgBytes = base64ToBytes(imgDataUrl.split(',')[1]);
        const pngImage = await pdfDoc.embedPng(imgBytes);

        const pdfPage = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
        pdfPage.drawImage(pngImage, {
            x: imgX,
            y: imgY,
            width: imgWpt,
            height: imgHpt,
        });

        pdfPages.push(pdfPage);
        pageScaleInfos.push({ imgX, imgY, imgW: imgWpt, imgH: imgHpt, cssW, cssH });
    }


    // ── 2. Add candidate-only AcroForm signature widgets on each page ───
    for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const pdfPage = pdfPages[i];
        const { imgX, imgY, imgW, imgH, cssW, cssH } = pageScaleInfos[i];

        // pt-per-css-px scaling (accounts for proportional fit)
        const scaleX = imgW / cssW;
        const scaleY = imgH / cssH;

        const sigBoxEls = pageEl.querySelectorAll('.candidate-sig-box');
        sigBoxEls.forEach((sigBoxEl, index) => {
            const pageRect = pageEl.getBoundingClientRect();
            const boxRect = sigBoxEl.getBoundingClientRect();

            // Relative position inside the element (CSS px)
            const leftPx = boxRect.left - pageRect.left;
            const topPx  = boxRect.top  - pageRect.top;
            const wPx    = boxRect.width;
            const hPx    = boxRect.height;

            // Map to PDF coordinate space
            // PDF y-axis: 0 = bottom, increases upward
            // Image bottom-left in PDF = imgY; top-left = imgY + imgH
            const sigX = imgX + leftPx * scaleX;
            const sigY = imgY + (cssH - topPx - hPx) * scaleY;
            const sigW = wPx * scaleX;
            const sigH = hPx * scaleY;

            console.log(`[SecurePDF] Sig box page ${i + 1}, idx ${index}:`, { sigX, sigY, sigW, sigH });

            addSignatureField(pdfDoc, pdfPage, `CandidateSignature_Page_${i + 1}_Index_${index}`, {
                x: sigX,
                y: sigY,
                width: sigW,
                height: sigH,
            });
        });
    }

    // ── 3. Setup signature form settings ──────────────────────────────────
    // AcroForm has SigFlags = 3 set by default in getOrCreateAcroForm, allowing signatures.

    // ── 4. Save pdf-lib output ────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const plainBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(plainBuffer).set(pdfBytes);

    // ── 5. Send to backend for real AES encryption (form-fill only lock) ──
    let finalBytes: ArrayBuffer = plainBuffer;
    try {
        const token = sessionStorage.getItem('token');
        const response = await fetch('/api/v1/recruiter/secure-pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/pdf',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: plainBuffer,
        });
        if (response.ok) {
            finalBytes = await response.arrayBuffer();
        } else {
            console.warn('[SecurePDF] Backend encryption failed, using unencrypted PDF');
            alert('⚠️ PDF encryption service unavailable. The downloaded PDF will not be password-protected. Please retry for a secured copy.');
        }
    } catch (err) {
        console.warn('[SecurePDF] Backend unreachable, using unencrypted PDF:', err);
    }

    // ── 6. Download ────────────────────────────────────────────────────────
    const blob = new Blob([finalBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a base64 string → Uint8Array without atob size limits */
function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Adds a PDF AcroForm Text Field (/FT /Tx) widget annotation to the given page.
 * This behaves as an interactive text box where the candidate can type their name/signature.
 */
function addSignatureField(
    pdfDoc: PDFDocument,
    pdfPage: ReturnType<PDFDocument['addPage']>,
    fieldName: string,
    rect: { x: number; y: number; width: number; height: number }
) {
    const { x, y, width, height } = rect;
    const ctx = pdfDoc.context;

    // Build Rect array manually
    const rectArr = ctx.obj([
        PDFNumber.of(x),
        PDFNumber.of(y),
        PDFNumber.of(x + width),
        PDFNumber.of(y + height),
    ]) as PDFArray;

    // Build the Widget / Tx (Text) field dict
    const fieldDict = ctx.obj({}) as PDFDict;
    fieldDict.set(PDFName.of('Type'),    PDFName.of('Annot'));
    fieldDict.set(PDFName.of('Subtype'), PDFName.of('Widget'));
    fieldDict.set(PDFName.of('FT'),      PDFName.of('Tx')); // Tx = Text Field
    fieldDict.set(PDFName.of('T'),       PDFHexString.fromText(fieldName));
    fieldDict.set(PDFName.of('V'),       PDFHexString.fromText('')); // empty value
    fieldDict.set(PDFName.of('Ff'),      PDFNumber.of(0)); // no flags
    fieldDict.set(PDFName.of('Rect'),    rectArr);
    fieldDict.set(PDFName.of('P'),       pdfPage.ref);
    fieldDict.set(PDFName.of('F'),       PDFNumber.of(4)); // Print flag
    fieldDict.set(PDFName.of('Border'),  ctx.obj([PDFNumber.of(0), PDFNumber.of(0), PDFNumber.of(0)]) as PDFArray);
    
    // Default appearance - Helv font, size 10, black text
    fieldDict.set(PDFName.of('DA'),      PDFHexString.fromText('/Helv 10 Tf 0 g'));

    const fieldRef = ctx.register(fieldDict);

    // Attach widget to the page's /Annots array
    const pageNode = pdfPage.node;
    let annots = pageNode.lookup(PDFName.of('Annots')) as PDFArray | undefined;
    if (!annots) {
        annots = ctx.obj([]) as PDFArray;
        pageNode.set(PDFName.of('Annots'), annots);
    }
    annots.push(fieldRef);

    // Register field in the document's AcroForm /Fields array
    const acroForm = getOrCreateAcroForm(pdfDoc);
    const fields = acroForm.lookup(PDFName.of('Fields')) as PDFArray;
    fields.push(fieldRef);
}

function getOrCreateAcroForm(pdfDoc: PDFDocument): PDFDict {
    const catalog = pdfDoc.catalog;
    let acroForm = catalog.lookup(PDFName.of('AcroForm')) as PDFDict | undefined;

    if (!acroForm) {
        const ctx = pdfDoc.context;
        const fieldsArr = ctx.obj([]) as PDFArray;
        
        // Define Helv font descriptor
        const helvFont = ctx.obj({}) as PDFDict;
        helvFont.set(PDFName.of('Type'),     PDFName.of('Font'));
        helvFont.set(PDFName.of('Subtype'),  PDFName.of('Type1'));
        helvFont.set(PDFName.of('BaseFont'), PDFName.of('Helvetica'));
        const helvFontRef = ctx.register(helvFont);

        const fontDict = ctx.obj({}) as PDFDict;
        fontDict.set(PDFName.of('Helv'), helvFontRef);

        const drDict = ctx.obj({}) as PDFDict;
        drDict.set(PDFName.of('Font'), fontDict);

        const newForm = ctx.obj({}) as PDFDict;
        newForm.set(PDFName.of('Fields'),   fieldsArr);
        newForm.set(PDFName.of('SigFlags'), PDFNumber.of(3));
        newForm.set(PDFName.of('DR'),       drDict);
        newForm.set(PDFName.of('DA'),       PDFHexString.fromText('/Helv 10 Tf 0 g'));

        const formRef = ctx.register(newForm);
        catalog.set(PDFName.of('AcroForm'), formRef);
        acroForm = newForm;
    }

    return acroForm;
}
