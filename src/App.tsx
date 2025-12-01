// ImageConverterApp.tsx
import { saveAs } from "file-saver";
import { motion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiCode,
  FiEdit,
  FiImage,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";
import type { CropBox, FormatType } from "./types";
import { EditModal } from "./components/EditModal";
import { theme } from "./theme";
import "./app.css";

const cssVars: React.CSSProperties = {
  "--surface": theme.COLORS.surface,
  "--shadow": theme.COLORS.shadow,
  "--gray": theme.COLORS.gray,
  "--primary": theme.COLORS.primary,
  "--neon": theme.COLORS.neon,
  "--textPrimary": theme.COLORS.textPrimary,
  "--textSecondary": theme.COLORS.textSecondary,
  "--overlayPrimaryBg": theme.COLORS.overlayPrimaryBg,
} as React.CSSProperties;

function stripExtension(name: string | null) {
  if (!name) return null;
  return name.replace(/\.[^/.]+$/, "");
}

export default function ImageConverterApp() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [rotation, setRotation] = useState(0);

  // responsive helper (updates on resize)
  const [isNarrow, setIsNarrow] = useState(
    typeof window !== "undefined" ? window.innerWidth < 480 : false
  );

  function resetState() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (originalUrl && originalUrl !== previewUrl) {
      URL.revokeObjectURL(originalUrl);
    }
    setPreviewUrl(null);
    setDownloadName(null);
    setFileName(null);
    setOriginalUrl(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setEditing(false);
    setRotation(0);
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // cria preview rápido via objectURL (bom para mostrar)
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file);
        setPreviewUrl(preview);
      }

      setFileName(file.name);
      setDownloadName("");

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string | null;
        if (result) {
          setOriginalUrl(result); 
        }
      };
      reader.readAsDataURL(file);

      setProgress(0);
    },
    []
  );

  const onDrop = useCallback(
    async (ev: React.DragEvent<HTMLDivElement>) => {
      ev.preventDefault();
      setDragOver(false);
      resetState();
      const file = ev.dataTransfer.files?.[0];
      if (!file) return;
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
      const fakeEvent = {
        target: { files: [file] },
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      await handleFileChange(fakeEvent);
    },
    [handleFileChange]
  );

  const quickDownload = async (format: FormatType) => {
    if (!previewUrl || !fileName) return;
    setProcessing(true);
    setProgress(10);
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const baseName = downloadName || stripExtension(fileName) || "image";

      if (format === "base64") {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result?.toString().split(",")[1];
          if (base64) {
            const textBlob = new Blob([base64], { type: "text/plain" });
            saveAs(textBlob, `${baseName}.txt`);
          }
          setProgress(100);
        };
        reader.readAsDataURL(blob);
      } else {
        const ext = format.split("/")[1];
        console.log("`${baseName}.${ext}`", `${baseName}.${ext}`);

        saveAs(blob, `${baseName}.${ext}`);
        setProgress(100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 700);
    }
  };

  const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", (err) => reject(err));
      img.src = url;
    });

  const applyEdit = async (cropBox: CropBox) => {
    const source = originalUrl || previewUrl;
    if (!source) return;

    const image = await createImage(source);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    const { x, y, width, height } = cropBox;

    canvas.width = width;
    canvas.height = height;

    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-width / 2, -height / 2);

    // desenha a parte cortada da imagem original no canvas
    ctx.drawImage(image, x, y, width, height, 0, 0, width, height);

    const editedUrl = canvas.toDataURL();

    // atualiza apenas preview (mantém originalUrl para próximas edições)
    setPreviewUrl(editedUrl);
    setEditing(false);
  };

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 480);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (originalUrl && originalUrl !== previewUrl)
        URL.revokeObjectURL(originalUrl);
    };
  }, [previewUrl, originalUrl]);

  return (
    <div className="page-root" style={cssVars}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, ease: "easeOut" }}
        className="card"
      >
        <header className="header-row">
          <div className="brand">
            <motion.div
              initial={{ rotate: -6 }}
              animate={{ rotate: 0 }}
              transition={{ type: "spring", stiffness: 120 }}
              className="brand-badge"
              style={{
                background: `linear-gradient(135deg, ${theme.COLORS.primary}, ${theme.COLORS.neon})`,
                color: "#000",
              }}
            >
              <FiUploadCloud size={20} />
            </motion.div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 20,
                  color: theme.COLORS.textPrimary,
                }}
              >
                Image Converter
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: theme.COLORS.textSecondary,
                  marginTop: 4,
                }}
              >
                Converta imagens entre PNG/JPG/WEBP
              </p>
            </div>
          </div>
        </header>

        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          whileHover={{ scale: 1.01 }}
          className={`upload-area ${dragOver ? "dragging" : ""}`}
        >
          <div className="upload-icon" aria-hidden>
            <FiImage size={24} color={theme.COLORS.textSecondary} />
          </div>

          <div className="upload-right">
            <div className="upload-text">
              <label
                style={{
                  fontSize: 14,
                  color: theme.COLORS.textPrimary,
                  fontWeight: 600,
                }}
              >
                Arraste e solte ou selecione um arquivo
              </label>
              <div
                style={{
                  fontSize: 12,
                  color: theme.COLORS.textSecondary,
                }}
              >
                Suporta imagens (PNG, JPG, WEBP)
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="fileInputThemed"
                disabled={processing}
              />
              <label
                htmlFor="fileInputThemed"
                className="file-label"
                aria-label="Selecionar arquivo"
              >
                <FiUploadCloud size={18} />
                <span>{isNarrow ? "Selecionar" : "Selecionar arquivo"}</span>
              </label>
            </div>
          </div>
        </motion.div>

        {previewUrl && (
          <div
            className="preview-box"
            role="region"
            aria-label="Pré-visualização"
          >
            <div className="preview-top">
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flex: 1,
                }}
              >
                <input
                  aria-label="Nome do arquivo para download"
                  value={downloadName || ""}
                  onChange={(e) => setDownloadName(e.target.value)}
                  placeholder={fileName || "nome-do-arquivo"}
                  className="input-edit-name"
                />
              </div>

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => setEditing(true)}
                  disabled={processing}
                  className="pill"
                  aria-label="Editar imagem"
                >
                  <FiEdit size={14} />
                  {!isNarrow && "Editar"}
                </button>

                <button
                  onClick={resetState}
                  disabled={processing}
                  className="pill"
                  aria-label="Limpar imagem"
                >
                  <FiTrash2 size={14} />
                  {!isNarrow && "Limpar"}
                </button>
              </div>
            </div>

            <img src={previewUrl} alt="preview" className="preview-img" />
          </div>
        )}

        {editing && previewUrl && (
          <EditModal
            previewUrl={originalUrl || ""}
            applyEdit={applyEdit}
            rotation={rotation}
            setEditing={setEditing}
            setRotation={setRotation}
          />
        )}

        {previewUrl && (
          <div className="actions" role="group" aria-label="Ações de download">
            {["image/png", "image/jpeg", "image/webp"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => quickDownload(fmt as FormatType)}
                disabled={processing}
                className="action-btn"
                aria-label={`Baixar ${fmt.split("/")[1].toUpperCase()}`}
              >
                <FiImage size={14} />
                <span>{fmt.split("/")[1].toUpperCase()}</span>
              </button>
            ))}

            <button
              onClick={() => quickDownload("base64")}
              disabled={processing}
              className="action-btn"
              aria-label="Baixar Base64"
            >
              <FiCode size={14} />
              <span>Base64</span>
            </button>
          </div>
        )}

        {progress > 0 && (
          <div className="progress-wrap" aria-hidden>
            <div
              className="progress-bar"
              style={{
                width: `${progress}%`,
                background: theme.COLORS.primary,
              }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
