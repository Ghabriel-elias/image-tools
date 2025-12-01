import React, { useEffect, useRef, useState } from "react";
import { FiRotateCcw } from "react-icons/fi";
import type { CropBox } from "../types";
import { theme } from "../theme";

// ---------------------------- handles das alças de redimensionamento ----------------------------
const handles = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
];

const MIN_SIZE_DEFAULT = 50;
const MIN_SIZE_SMALL = 30;

export function EditModal({
  previewUrl,
  rotation,
  setRotation,
  setEditing,
  applyEdit,
}: {
  previewUrl: string;
  rotation: number;
  setRotation: React.Dispatch<React.SetStateAction<number>>;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  applyEdit: (cropBox: CropBox) => void;
}) {
  // ---------------------------- refs & state ----------------------------
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0,
    y: 0,
    width: 300,
    height: 300,
  });

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const cropBoxStartRef = useRef<CropBox | null>(null);
  const resizingRef = useRef<{
    edge: string;
    startX: number;
    startY: number;
  } | null>(null);

  // ---------------------------- utilitários de tamanho e medidas ----------------------------

  const getMinSize = () =>
    typeof window !== "undefined" && window.innerWidth < 640
      ? MIN_SIZE_SMALL
      : MIN_SIZE_DEFAULT;

  const getImgRect = () =>
    imgRef.current?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };

  // ---------------------------- inicialização do crop (centraliza após load) ----------------------------
  const onImageLoad = () => {
    const rect = getImgRect();
    const w = Math.min(300, rect.width - 20);
    const h = Math.min(300, rect.height - 20);
    setCropBox({
      x: Math.max(10, (rect.width - w) / 2),
      y: Math.max(10, (rect.height - h) / 2),
      width: w,
      height: h,
    });
  };

  // ---------------------------- helpers gerais de gesto (mouse + touch usam estes) ----------------------------
  const startDrag = (clientX: number, clientY: number) => {
    dragStartRef.current = { x: clientX, y: clientY };
    cropBoxStartRef.current = { ...cropBox };
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!dragStartRef.current || !cropBoxStartRef.current) return;
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;

    const imgRect = getImgRect();
    let newX = cropBoxStartRef.current.x + deltaX;
    let newY = cropBoxStartRef.current.y + deltaY;

    newX = Math.max(0, Math.min(newX, imgRect.width - cropBox.width));
    newY = Math.max(0, Math.min(newY, imgRect.height - cropBox.height));

    setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
  };

  const endDrag = () => {
    dragStartRef.current = null;
    cropBoxStartRef.current = null;
  };

  // ---------------------------- redimensionamento ----------------------------
  const startResize = (edge: string, clientX: number, clientY: number) => {
    resizingRef.current = { edge, startX: clientX, startY: clientY };
    cropBoxStartRef.current = { ...cropBox };
  };

  const moveResize = (clientX: number, clientY: number) => {
    if (!resizingRef.current || !cropBoxStartRef.current) return;

    const deltaX = clientX - resizingRef.current.startX;
    const deltaY = clientY - resizingRef.current.startY;

    let { x, y, width, height } = cropBoxStartRef.current;
    const edge = resizingRef.current.edge;
    const imgRect = getImgRect();
    const MIN_SIZE = getMinSize();

    if (edge.includes("right")) {
      width = Math.max(MIN_SIZE, Math.min(width + deltaX, imgRect.width - x));
    }
    if (edge.includes("left")) {
      const newX = Math.max(0, Math.min(x + deltaX, x + width - MIN_SIZE));
      width = width - (newX - x);
      x = newX;
    }
    if (edge.includes("bottom")) {
      height = Math.max(
        MIN_SIZE,
        Math.min(height + deltaY, imgRect.height - y)
      );
    }
    if (edge.includes("top")) {
      const newY = Math.max(0, Math.min(y + deltaY, y + height - MIN_SIZE));
      height = height - (newY - y);
      y = newY;
    }

    x = Math.max(0, Math.min(x, imgRect.width - MIN_SIZE));
    y = Math.max(0, Math.min(y, imgRect.height - MIN_SIZE));
    width = Math.max(MIN_SIZE, Math.min(width, imgRect.width - x));
    height = Math.max(MIN_SIZE, Math.min(height, imgRect.height - y));

    setCropBox({ x, y, width, height });
  };

  const endResize = () => {
    resizingRef.current = null;
    cropBoxStartRef.current = null;
  };

  // ---------------------------- handlers do mouse (adicionam listeners temporários na window) ----------------------------
  const onMouseDownDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);

    const mouseMove = (ev: MouseEvent) => moveDrag(ev.clientX, ev.clientY);
    const mouseUp = () => {
      endDrag();
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };

    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
  };

  const onMouseDownResize = (edge: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    startResize(edge, e.clientX, e.clientY);

    const mouseMove = (ev: MouseEvent) => moveResize(ev.clientX, ev.clientY);
    const mouseUp = () => {
      endResize();
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };

    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
  };

  // ---------------------------- handlers touch (similar ao mouse) ----------------------------
  const onTouchStartDrag = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    startDrag(t.clientX, t.clientY);

    const touchMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const touch = ev.touches[0];
      if (touch) moveDrag(touch.clientX, touch.clientY);
    };

    const touchEnd = () => {
      endDrag();
      window.removeEventListener("touchmove", touchMove as EventListener);
      window.removeEventListener("touchend", touchEnd as EventListener);
      window.removeEventListener("touchcancel", touchEnd as EventListener);
    };

    window.addEventListener("touchmove", touchMove as EventListener, {
      passive: false,
    });
    window.addEventListener("touchend", touchEnd as EventListener);
    window.addEventListener("touchcancel", touchEnd as EventListener);
  };

  const onTouchStartResize = (edge: string, e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const t = e.touches[0];
    startResize(edge, t.clientX, t.clientY);

    const touchMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const touch = ev.touches[0];
      if (touch) moveResize(touch.clientX, touch.clientY);
    };

    const touchEnd = () => {
      endResize();
      window.removeEventListener("touchmove", touchMove as EventListener);
      window.removeEventListener("touchend", touchEnd as EventListener);
      window.removeEventListener("touchcancel", touchEnd as EventListener);
    };

    window.addEventListener("touchmove", touchMove as EventListener, {
      passive: false,
    });
    window.addEventListener("touchend", touchEnd as EventListener);
    window.addEventListener("touchcancel", touchEnd as EventListener);
  };

  // ---------------------------- cleanup ao desmontar ----------------------------
  useEffect(() => {
    return () => {
      dragStartRef.current = null;
      cropBoxStartRef.current = null;
      resizingRef.current = null;
    };
  }, []);

  // ---------------------------- aplicar recorte (converter coordenadas exibidas -> naturais) ----------------------------
  const handleApply = () => {
    if (!imgRef.current) return;
    const imgRect = getImgRect();
    const naturalW = imgRef.current.naturalWidth;
    const naturalH = imgRef.current.naturalHeight;

    const scaleX = naturalW / imgRect.width;
    const scaleY = naturalH / imgRect.height;

    const result: CropBox = {
      x: Math.round(cropBox.x * scaleX),
      y: Math.round(cropBox.y * scaleY),
      width: Math.round(cropBox.width * scaleX),
      height: Math.round(cropBox.height * scaleY),
    };

    applyEdit(result);
  };

  // ---------------------------- render ----------------------------
  return (
    <div style={styles.overlay}>
      <div ref={containerRef} style={styles.panel}>
        <div style={styles.imageWrapper}>
          <img
            ref={imgRef}
            src={previewUrl}
            alt="preview"
            onLoad={onImageLoad}
            style={styles.img(rotation)}
            className="edit-modal"
          />

          {/* crop box (posicionado relativo ao elemento <img>) */}
          <div
            style={{
              ...styles.cropBoxBase,
              top: cropBox.y,
              left: cropBox.x,
              width: cropBox.width,
              height: cropBox.height,
            }}
            onMouseDown={onMouseDownDrag}
            onTouchStart={onTouchStartDrag}
          >
            {handles.map((edge) => (
              <div
                key={edge}
                style={styles.handleStyle(edge)}
                onMouseDown={(e) => onMouseDownResize(edge, e)}
                onTouchStart={(e) => onTouchStartResize(edge, e)}
                className="crop-handle"
              />
            ))}
          </div>
        </div>
      </div>

      <div style={styles.controlsWrapper} className="edit-controls">
        <button
          onClick={() => setRotation((prev) => (prev + 90) % 360)}
          style={styles.iconButton}
          title="Rotacionar 90°"
        >
          <FiRotateCcw size={20} />
        </button>

        <div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
          <button
            onClick={() => setEditing(false)}
            style={styles.secondaryButton}
          >
            Cancelar
          </button>

          <button onClick={handleApply} style={styles.primaryButton}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------- estilos agrupados ----------------------------
// Todas as estilizações (cores, styles e funções que dependem de props) ficam agrupadas em um único objeto
const styles = {
  COLORS: {
    accent: theme.COLORS.primary,
    overlayBg: theme.COLORS.overlayBg,
    panelBg: theme.COLORS.panelBg,
    panelText: theme.COLORS.textPrimary,
    buttonBgPrimary: theme.COLORS.primary,
    buttonTextPrimary: theme.COLORS.buttonText,
  },

  // estilos estáticos
  overlay: {
    position: "fixed",
    inset: 0,
    background: theme.COLORS.overlayBg,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
    flexDirection: "column",
    padding: 24,
    gap: 12,
  } as React.CSSProperties,

  panel: {
    position: "relative",
    background: theme.COLORS.panelBg,
    borderRadius: 12,
    overflow: "hidden",
    padding: 12,
  } as React.CSSProperties,

  imageWrapper: {
    position: "relative",
    display: "inline-block",
  } as React.CSSProperties,

  img: (rotationDeg: number): React.CSSProperties => ({
    display: "block",
    maxWidth: "90vw",
    maxHeight: "60vh",
    transform: `rotate(${rotationDeg}deg)`,
    transition: "transform 0.2s ease",
  }),

  cropBoxBase: {
    position: "absolute",
    border: `2px dashed ${theme.COLORS.primary}`,
    borderRadius: 8,
    cursor: "move",
    boxSizing: "border-box",
    touchAction: "none",
  } as React.CSSProperties,

  controlsWrapper: {
    display: "flex",
    gap: 12,
    marginTop: 12,
  } as React.CSSProperties,

  primaryButton: {
    padding: "10px 18px",
    borderRadius: 12,
    border: `1px solid ${theme.COLORS.primary}`,
    background: theme.COLORS.primary,
    color: theme.COLORS.buttonText,
    cursor: "pointer",
    fontWeight: 600,
  } as React.CSSProperties,

  secondaryButton: {
    padding: "10px 18px",
    borderRadius: 12,
    border: `1px solid ${theme.COLORS.borderGrayColor}`,
    background: theme.COLORS.surface,
    color: theme.COLORS.textPrimary,
    cursor: "pointer",
    fontWeight: 600,
  } as React.CSSProperties,

  iconButton: {
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${theme.COLORS.primary}`,
    background: theme.COLORS.primary,
    color: theme.COLORS.buttonText,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  // função para gerar estilo da alça, depende do tamanho da tela
  handleStyle: (edge: string): React.CSSProperties => {
    const size =
      typeof window !== "undefined" && window.innerWidth < 640 ? 12 : 16;
    const half = size / 2;
    const COLORS = { accent: theme.COLORS.primary };

    const cursor =
      (edge.includes("top") && edge.includes("left")) ||
      (edge.includes("bottom") && edge.includes("right"))
        ? "nwse-resize"
        : (edge.includes("top") && edge.includes("right")) ||
          (edge.includes("bottom") && edge.includes("left"))
        ? "nesw-resize"
        : edge === "top" || edge === "bottom"
        ? "ns-resize"
        : "ew-resize";

    const style: React.CSSProperties = {
      position: "absolute",
      width: size,
      height: size,
      background: COLORS.accent,
      borderRadius: 4,
      cursor,
      boxSizing: "border-box",
      zIndex: 5,
      touchAction: "none",
    };

    let needTranslateY = false;
    if (edge.includes("top")) style.top = -half;
    else if (edge.includes("bottom")) style.bottom = -half;
    else {
      style.top = "50%";
      needTranslateY = true;
    }

    let needTranslateX = false;
    if (edge.includes("left")) style.left = -half;
    else if (edge.includes("right")) style.right = -half;
    else {
      style.left = "50%";
      needTranslateX = true;
    }

    if (needTranslateX && needTranslateY)
      style.transform = "translate(-50%, -50%)";
    else if (needTranslateX) style.transform = "translateX(-50%)";
    else if (needTranslateY) style.transform = "translateY(-50%)";

    return style;
  },
};
