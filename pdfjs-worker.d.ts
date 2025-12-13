declare module "pdfjs-dist/build/pdf.worker.min.js" {
  const workerSrc: string;
  export default workerSrc;
}

declare module "pdfjs-dist/build/pdf.worker.min.js?url" {
  const workerSrc: string;
  export default workerSrc;
}

declare module "pdfjs-dist/legacy/build/pdf.js" {
  export type DocumentInitParameters =
    | string
    | URL
    | ArrayBuffer
    | { data: ArrayBuffer };

  export interface PDFDocumentLoadingTask {
    promise: Promise<PDFDocumentProxy>;
  }

  export interface PDFDocumentProxy {
    numPages: number;
    getPage(pageNumber: number): Promise<PDFPageProxy>;
  }

  export interface Viewport {
    width: number;
    height: number;
  }

  export interface PDFPageProxy {
    getViewport(params: { scale: number }): Viewport;
    render(params: {
      canvasContext: CanvasRenderingContext2D;
      viewport: Viewport;
      canvas: HTMLCanvasElement;
    }): { promise: Promise<void> };
  }

  export const GlobalWorkerOptions: {
    workerSrc: string;
  };

  export function getDocument(
    src: DocumentInitParameters,
  ): PDFDocumentLoadingTask;
}

declare module "pdfjs-dist/legacy/build/pdf.worker.min.js?url" {
  const workerSrc: string;
  export default workerSrc;
}
