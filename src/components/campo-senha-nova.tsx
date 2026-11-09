"use client";

import { useState } from "react";
import { Campo } from "@/components/ui";
import { LIMITES_SENHA, requisitosDaSenha } from "@/lib/regras/senha";

// Campo de senha nova com os requisitos marcados enquanto a pessoa digita.
export function CampoSenhaNova({ id = "senha", name = "senha", label = "Senha" }: { id?: string; name?: string; label?: string }) {
  const [senha, setSenha] = useState("");
  const requisitos = requisitosDaSenha(senha);

  return (
    <Campo
      id={id}
      name={name}
      type="password"
      label={label}
      autoComplete="new-password"
      minLength={LIMITES_SENHA.min}
      maxLength={LIMITES_SENHA.max}
      required
      value={senha}
      onChange={(e) => setSenha(e.target.value)}
      ajuda={
        <span className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {requisitos.map((r) => (
            <span key={r.id} className={`flex items-center gap-1.5 ${r.ok ? "text-noite/80" : ""}`}>
              <span aria-hidden="true" className={`w-3 font-bold ${r.ok ? "text-confirmado" : ""}`}>
                {r.ok ? "✓" : "○"}
              </span>
              {r.texto}
              <span className="sr-only">{r.ok ? " (ok)" : " (falta)"}</span>
            </span>
          ))}
        </span>
      }
    />
  );
}
