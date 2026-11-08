"use client";

import { useActionState, useState } from "react";
import { Alerta, Botao, Campo } from "@/components/ui";
import { LIMITES_SALAO, normalizarSlug } from "@/lib/regras/salao";
import { criarSalao, type EstadoSalao } from "./actions";

export function FormSalao() {
  const [estado, acao, pendente] = useActionState<EstadoSalao, FormData>(criarSalao, {});
  const [nome, setNome] = useState(estado.campos?.nome ?? "");
  const [slug, setSlug] = useState(estado.campos?.slug ?? "");
  // Enquanto a pessoa não mexe no endereço, ele acompanha o nome.
  const [slugEditado, setSlugEditado] = useState(false);

  return (
    <form action={acao} className="mt-6 flex flex-col gap-4" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}
      <Campo
        id="nome"
        name="nome"
        label="Nome do salão"
        placeholder="Studio Bela Vida"
        autoComplete="organization"
        maxLength={LIMITES_SALAO.nome.max}
        required
        value={nome}
        onChange={(e) => {
          setNome(e.target.value);
          if (!slugEditado) setSlug(normalizarSlug(e.target.value));
        }}
        erro={estado.erros?.nome}
      />
      <Campo
        id="slug"
        name="slug"
        label="Endereço da sua página de agendamento"
        placeholder="studio-bela-vida"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={LIMITES_SALAO.slug.max}
        required
        value={slug}
        onChange={(e) => {
          setSlugEditado(true);
          setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
        }}
        onBlur={() => setSlug(normalizarSlug(slug))}
        erro={estado.erros?.slug}
        ajuda={
          <>
            Seus clientes vão agendar em{" "}
            <span className="font-medium text-noite">agendon.app.br/{slug || "seu-salao"}</span>
          </>
        }
      />
      <Botao type="submit" disabled={pendente} className="mt-2 w-full">
        {pendente ? "Criando salão…" : "Criar salão"}
      </Botao>
    </form>
  );
}
