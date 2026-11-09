import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;

function PdfPage({
  document,
  page,
  width,
  zoom,
  title,
}: {
  document: PDFDocumentProxy;
  page: number;
  width: number;
  zoom: number;
  title: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState("쪽을 불러오는 중입니다.");
  useEffect(() => {
    let active = true;
    let task:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    const render = async () => {
      const pdfPage = await document.getPage(page);
      if (!active || !canvas.current) return;
      const viewport = pdfPage.getViewport({
        scale: (width / pdfPage.getViewport({ scale: 1 }).width) * zoom,
      });
      const element = canvas.current;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      element.width = Math.floor(viewport.width * ratio);
      element.height = Math.floor(viewport.height * ratio);
      element.style.width = `${viewport.width}px`;
      element.style.height = `${viewport.height}px`;
      task = pdfPage.render({
        canvas: element,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      });
      await task.promise;
      if (active) setStatus("");
    };
    render().catch(() => {
      if (active)
        setStatus("쪽을 표시하지 못했습니다. 새 탭에서 보기를 이용해 주세요.");
    });
    return () => {
      active = false;
      task?.cancel();
    };
  }, [document, page, width, zoom]);
  return (
    <>
      {status && <p role="status">{status}</p>}
      <canvas ref={canvas} role="img" aria-label={`${title} ${page}쪽`} />
    </>
  );
}
export default function PdfPreview({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(700);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let active = true;
    const task = getDocument({ url });
    task.promise
      .then(pdf => {
        if (active) setDocument(pdf);
      })
      .catch(() => {
        if (active)
          setError(
            "PDF를 불러오지 못했습니다. 새 탭에서 보기를 이용해 주세요."
          );
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [url]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(200, element.clientWidth - 32))
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="pdf-reader">
      {error ? (
        <p role="alert">{error}</p>
      ) : !document ? (
        <p role="status">PDF를 불러오는 중입니다.</p>
      ) : (
        <div className="pdf-reader-toolbar" aria-label="PDF 쪽 이동 및 확대">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            이전 쪽
          </button>
          <span role="status">
            {page} / {document.numPages}쪽
          </span>
          <button
            type="button"
            disabled={page === document.numPages}
            onClick={() => setPage(p => p + 1)}
          >
            다음 쪽
          </button>
          <button
            type="button"
            disabled={zoom <= 1}
            onClick={() => setZoom(z => Math.max(1, z - 0.25))}
            aria-label="PDF 축소"
          >
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            disabled={zoom >= 2}
            onClick={() => setZoom(z => Math.min(2, z + 0.25))}
            aria-label="PDF 확대"
          >
            ＋
          </button>
        </div>
      )}
      <div
        className="pdf-reader-pages"
        ref={container}
        tabIndex={0}
        role="region"
        aria-label="PDF 문서 화면"
      >
        {document && (
          <PdfPage
            key={`${page}-${width}-${zoom}`}
            document={document}
            page={page}
            width={width}
            zoom={zoom}
            title={title}
          />
        )}
      </div>
    </div>
  );
}
