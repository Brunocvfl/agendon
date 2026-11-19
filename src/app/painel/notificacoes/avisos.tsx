"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Alerta, Botao } from "@/components/ui";
import { desligarAvisos, ligarAvisos, marcarLidas } from "./actions";

type Estado = "carregando" | "sem-suporte" | "instalar-iphone" | "bloqueado" | "desligado" | "ligado";

// Chave pública VAPID (base64url) para o formato que o navegador pede.
function chaveParaBytes(base64: string): Uint8Array<ArrayBuffer> {
  const preenchida = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(preenchida);
  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

const ehIphone = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalado = () => window.matchMedia("(display-mode: standalone)").matches;

async function registrar() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

function mesmosBytes(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.byteLength) return false;
  const x = new Uint8Array(a);
  return x.every((v, i) => v === b[i]);
}

// Inscrição atual do aparelho, se foi feita com a chave pública atual. Feita com outra chave (as chaves
// VAPID foram trocadas), ela não recebe mais nada: é cancelada para o aparelho se inscrever de novo.
async function inscricaoAtual(registro: ServiceWorkerRegistration, chavePublica: string) {
  const inscricao = await registro.pushManager.getSubscription();
  if (!inscricao) return null;
  if (mesmosBytes(inscricao.options.applicationServerKey, chaveParaBytes(chavePublica))) return inscricao;
  await inscricao.unsubscribe().catch(() => {});
  return null;
}

/** Liga ou desliga o Web Push neste navegador. */
export function AvisosNesteAparelho({ chavePublica }: { chavePublica: string }) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    let ativo = true;
    (async () => {
      let novo: Estado;
      if (!chavePublica || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // iPhone só tem Web Push com o app instalado na tela de início (iOS 16.4+).
        novo = typeof navigator !== "undefined" && ehIphone() && !instalado() ? "instalar-iphone" : "sem-suporte";
      } else if (Notification.permission === "denied") {
        novo = "bloqueado";
      } else {
        const registro = await registrar();
        const inscricao = await inscricaoAtual(registro, chavePublica);
        novo = inscricao && Notification.permission === "granted" ? "ligado" : "desligado";
        // Garante que o servidor conhece este aparelho (ex.: entrou com outro login neste navegador).
        if (novo === "ligado" && inscricao) void ligarAvisos(inscricao.toJSON());
      }
      if (ativo) setEstado(novo);
    })().catch(() => ativo && setEstado("sem-suporte"));
    return () => {
      ativo = false;
    };
  }, [chavePublica]);

  function ligar() {
    setErro(null);
    iniciar(async () => {
      try {
        const permissao = await Notification.requestPermission();
        if (permissao !== "granted") {
          setEstado(permissao === "denied" ? "bloqueado" : "desligado");
          return;
        }
        const registro = await registrar();
        await navigator.serviceWorker.ready;
        const inscricao =
          (await inscricaoAtual(registro, chavePublica)) ??
          (await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chavePublica) }));
        const r = await ligarAvisos(inscricao.toJSON());
        if (r.erro) {
          await inscricao.unsubscribe().catch(() => {});
          setErro(r.erro);
          return;
        }
        setEstado("ligado");
      } catch {
        setErro("Não foi possível ligar os avisos neste navegador.");
      }
    });
  }

  function desligar() {
    setErro(null);
    iniciar(async () => {
      try {
        const registro = await navigator.serviceWorker.getRegistration("/");
        const inscricao = await registro?.pushManager.getSubscription();
        if (inscricao) {
          const r = await desligarAvisos(inscricao.endpoint);
          if (r.erro) {
            setErro(r.erro);
            return;
          }
          await inscricao.unsubscribe();
        }
        setEstado("desligado");
      } catch {
        setErro("Não foi possível desligar os avisos neste navegador.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {estado === "carregando" ? <p className="text-sm text-noite/65">Verificando este aparelho…</p> : null}
      {estado === "sem-suporte" ? (
        <p className="text-sm text-noite/70">Este navegador não recebe avisos. Use o Chrome, o Edge, o Firefox ou o Safari.</p>
      ) : null}
      {estado === "instalar-iphone" ? (
        <p className="text-sm text-noite/70">
          No iPhone, os avisos só funcionam com o AgendOn na tela de início: no Safari, toque em Compartilhar e depois em
          “Adicionar à Tela de Início”. Abra o AgendOn por lá e volte a esta página.
        </p>
      ) : null}
      {estado === "bloqueado" ? (
        <p className="text-sm text-noite/70">
          Os avisos estão bloqueados para o AgendOn neste navegador. Libere nas permissões do site (o cadeado ao lado do
          endereço) e recarregue a página.
        </p>
      ) : null}
      {estado === "desligado" ? (
        <div>
          <Botao type="button" onClick={ligar} disabled={pendente}>
            {pendente ? "Ligando…" : "Ligar avisos neste aparelho"}
          </Botao>
        </div>
      ) : null}
      {estado === "ligado" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-confirmado/10 px-3 py-1 text-xs font-semibold text-noite">Avisos ligados</span>
          <Botao type="button" variante="secundario" onClick={desligar} disabled={pendente}>
            {pendente ? "Desligando…" : "Desligar neste aparelho"}
          </Botao>
        </div>
      ) : null}
      {erro ? <Alerta tipo="erro">{erro}</Alerta> : null}
    </div>
  );
}

/** Abriu a lista: marca tudo como lido (uma vez). */
export function MarcarLidas() {
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    void marcarLidas();
  }, []);
  return null;
}
