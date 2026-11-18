"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Botao } from "@/components/ui";
import { escala, limitar, recorte, ZOOM_MAXIMO, type Enquadramento } from "@/lib/enquadrar";

const JANELA = 280; // lado da janela na tela (cabe num celular de 320 px)
const SAIDA = 512; // lado da imagem final, em px
const PASSO_TECLADO = 12;

/**
 * Janela para dimensionar (zoom) e enquadrar (arrastar) uma foto num quadrado antes de enviar.
 * Devolve um JPEG de 512 × 512. Teclado: setas movem, + e − mudam o zoom.
 */
export function Enquadrador({
  arquivo,
  redonda = false,
  onConfirmar,
  onCancelar,
}: {
  arquivo: File;
  redonda?: boolean;
  onConfirmar: (imagem: Blob) => void;
  onCancelar: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const imagem = useRef<HTMLImageElement>(null);
  const arraste = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const [url] = useState(() => URL.createObjectURL(arquivo));
  const [e, setE] = useState<Enquadramento | null>(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    const d = dialogo.current;
    if (d && !d.open) d.showModal();
  }, []);

  const mudar = (parcial: Partial<Enquadramento>) => setE((atual) => (atual ? limitar({ ...atual, ...parcial }) : atual));

  function iniciarArraste(ev: PointerEvent<HTMLDivElement>) {
    if (!e) return;
    ev.currentTarget.setPointerCapture(ev.pointerId);
    arraste.current = { px: ev.clientX, py: ev.clientY, x: e.x, y: e.y };
  }
  function arrastar(ev: PointerEvent<HTMLDivElement>) {
    const a = arraste.current;
    if (a) mudar({ x: a.x + ev.clientX - a.px, y: a.y + ev.clientY - a.py });
  }
  function teclado(ev: KeyboardEvent<HTMLDivElement>) {
    if (!e) return;
    const mapa: Record<string, Partial<Enquadramento>> = {
      ArrowLeft: { x: e.x - PASSO_TECLADO },
      ArrowRight: { x: e.x + PASSO_TECLADO },
      ArrowUp: { y: e.y - PASSO_TECLADO },
      ArrowDown: { y: e.y + PASSO_TECLADO },
      "+": { zoom: e.zoom + 0.1 },
      "=": { zoom: e.zoom + 0.1 },
      "-": { zoom: e.zoom - 0.1 },
    };
    if (mapa[ev.key]) {
      ev.preventDefault();
      mudar(mapa[ev.key]);
    }
  }

  function confirmar() {
    const img = imagem.current;
    if (!e || !img) return;
    setGerando(true);
    const r = recorte(e);
    const canvas = document.createElement("canvas");
    canvas.width = SAIDA;
    canvas.height = SAIDA;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff"; // PNG com transparência vira JPEG com fundo branco
    ctx.fillRect(0, 0, SAIDA, SAIDA);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, r.x, r.y, r.lado, r.lado, 0, 0, SAIDA, SAIDA);
    canvas.toBlob(
      (blob) => {
        setGerando(false);
        if (blob) onConfirmar(blob);
      },
      "image/jpeg",
      0.9,
    );
  }

  const s = e ? escala(e) : 0;

  return (
    <dialog
      ref={dialogo}
      onCancel={(ev) => {
        ev.preventDefault();
        onCancelar();
      }}
      aria-labelledby="enquadrar-titulo"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-5 text-noite shadow-xl backdrop:bg-noite/50"
    >
      <h2 id="enquadrar-titulo" className="text-lg font-semibold">
        Ajustar a foto
      </h2>
      <p className="mt-1 text-sm text-noite/65">Arraste para enquadrar e use o zoom para aproximar.</p>

      <div
        role="application"
        aria-label="Área da foto. Use as setas para mover e + ou − para o zoom."
        tabIndex={0}
        onPointerDown={iniciarArraste}
        onPointerMove={arrastar}
        onPointerUp={() => (arraste.current = null)}
        onPointerCancel={() => (arraste.current = null)}
        onKeyDown={teclado}
        style={{ width: JANELA, height: JANELA }}
        className="relative mx-auto mt-4 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-noite/5 outline-none focus-visible:ring-2 focus-visible:ring-on active:cursor-grabbing"
      >
        {/* Imagem local (blob:) recortada no canvas: next/image não se aplica. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imagem}
          src={url}
          alt=""
          draggable={false}
          onLoad={(ev) => {
            setE({ largura: ev.currentTarget.naturalWidth, altura: ev.currentTarget.naturalHeight, janela: JANELA, zoom: 1, x: 0, y: 0 });
            URL.revokeObjectURL(url); // a imagem já está decodificada; o canvas usa o elemento
          }}
          className="pointer-events-none absolute max-w-none"
          style={
            e
              ? {
                  width: e.largura * s,
                  height: e.altura * s,
                  left: JANELA / 2 - (e.largura * s) / 2 + e.x,
                  top: JANELA / 2 - (e.altura * s) / 2 + e.y,
                }
              : { opacity: 0 }
          }
        />
        {/* Moldura: escurece o que fica de fora (o círculo, na foto redonda). */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 ${redonda ? "rounded-full" : "rounded-xl"}`}
          style={{ boxShadow: "0 0 0 999px rgb(15 27 77 / 0.45)", outline: "2px solid rgb(255 255 255 / 0.9)" }}
        />
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-noite/70">
        <span>Zoom</span>
        <input
          type="range"
          min={1}
          max={ZOOM_MAXIMO}
          step={0.01}
          value={e?.zoom ?? 1}
          disabled={!e}
          onChange={(ev) => mudar({ zoom: Number(ev.target.value) })}
          className="flex-1 accent-on"
        />
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <Botao type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="button" onClick={confirmar} disabled={!e || gerando}>
          {gerando ? "Preparando…" : "Usar esta foto"}
        </Botao>
      </div>
    </dialog>
  );
}
