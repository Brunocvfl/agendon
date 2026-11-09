"use client";

import { startTransition, useActionState, useState, type ComponentProps, type FormEvent } from "react";
import { Alerta, Botao, Campo, Selecao } from "@/components/ui";
import { useFocarPrimeiroErro } from "@/components/use-focar-erro";
import { formatarTelefone } from "@/lib/formato";
import { FUSOS_BRASIL, LIMITES_DADOS_SALAO, LIMITES_SALAO, lerCep, UFS } from "@/lib/regras/salao";
import { salvarDadosSalao, type EstadoForm } from "./actions";
import type { DadosSalao } from "./dados";

type Campos = Record<
  "nome" | "whatsapp" | "email" | "instagram" | "fuso" | "cep" | "logradouro" | "numero" | "complemento" | "bairro" | "cidade" | "uf",
  string
>;

const comMascaraCep = (cep: string) => (cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep);

export function FormDadosSalao({ inicial }: { inicial: DadosSalao }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarDadosSalao, {});
  const form = useFocarPrimeiroErro(estado);
  const [v, setV] = useState<Campos>({
    nome: inicial.nome,
    whatsapp: inicial.whatsapp ? formatarTelefone(inicial.whatsapp) : "",
    email: inicial.email ?? "",
    instagram: inicial.instagram ? `@${inicial.instagram}` : "",
    fuso: inicial.fuso,
    cep: inicial.cep ? comMascaraCep(inicial.cep) : "",
    logradouro: inicial.logradouro ?? "",
    numero: inicial.numero ?? "",
    complemento: inicial.complemento ?? "",
    bairro: inicial.bairro ?? "",
    cidade: inicial.cidade ?? "",
    uf: inicial.uf ?? "",
  });
  const [cepAviso, setCepAviso] = useState<string | null>(null);
  const mudar = (campo: keyof Campos) => (valor: string) => setV((atual) => ({ ...atual, [campo]: valor }));
  const erro = (campo: keyof Campos) => estado.erros?.[campo];

  // CEP completo: busca rua, bairro, cidade e UF no ViaCEP (só o CEP sai do navegador).
  async function buscarCep(texto: string) {
    const cep = lerCep(texto);
    if (!cep) return;
    setCepAviso("Buscando endereço…");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = (await r.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
      if (!r.ok || d.erro) {
        setCepAviso("CEP não encontrado. Preencha o endereço à mão.");
        return;
      }
      setV((atual) => ({
        ...atual,
        logradouro: d.logradouro || atual.logradouro,
        bairro: d.bairro || atual.bairro,
        cidade: d.localidade || atual.cidade,
        uf: d.uf || atual.uf,
      }));
      setCepAviso("Endereço preenchido pelo CEP. Confira e informe o número.");
    } catch {
      setCepAviso("Não foi possível buscar o CEP agora. Preencha o endereço à mão.");
    }
  }

  // Envio sem o reset automático do <form action> (que levaria os <select> controlados à primeira opção).
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => acao(fd));
  };

  const campo = (
    nome: keyof Campos,
    label: string,
    props: Partial<ComponentProps<typeof Campo>> = {},
  ) => (
    <Campo
      id={nome}
      name={nome}
      label={label}
      value={v[nome]}
      onChange={(e) => mudar(nome)(e.target.value)}
      erro={erro(nome)}
      {...props}
    />
  );

  return (
    <form ref={form} onSubmit={enviar} className="flex flex-col gap-6" noValidate>
      {estado.erro ? <Alerta tipo="erro">{estado.erro}</Alerta> : null}

      <section aria-labelledby="titulo-contatos" className="flex flex-col gap-4">
        <h3 id="titulo-contatos" className="text-base font-semibold">
          Nome e contatos
        </h3>
        {campo("nome", "Nome do salão", { required: true, maxLength: LIMITES_SALAO.nome.max, autoComplete: "organization" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {campo("whatsapp", "WhatsApp do salão", {
            type: "tel",
            inputMode: "tel",
            autoComplete: "tel",
            placeholder: "(11) 98765-4321",
            ajuda: "Clientes podem chamar por aqui na página de agendamento.",
          })}
          {campo("email", "E-mail de contato", {
            type: "email",
            inputMode: "email",
            autoComplete: "email",
            placeholder: "contato@seusalao.com.br",
            maxLength: LIMITES_DADOS_SALAO.email.max,
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {campo("instagram", "Instagram", { placeholder: "@seusalao", autoComplete: "off", spellCheck: false, autoCapitalize: "none" })}
          <div className="flex flex-col gap-1.5">
            <Selecao
              id="fuso"
              rotulo="Fuso horário"
              valor={v.fuso}
              onChange={mudar("fuso")}
              opcoes={FUSOS_BRASIL.map((f) => ({ valor: f.valor, rotulo: f.rotulo }))}
              erro={erro("fuso")}
            />
            <p className="text-sm text-noite/65">A agenda e os horários de trabalho usam este fuso.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-endereco" className="flex flex-col gap-4 border-t border-noite/8 pt-6">
        <h3 id="titulo-endereco" className="text-base font-semibold">
          Endereço
        </h3>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div className="flex flex-col gap-1.5">
            <Campo
              id="cep"
              name="cep"
              label="CEP"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="01000-000"
              maxLength={9}
              value={v.cep}
              onChange={(e) => {
                mudar("cep")(e.target.value);
                if (lerCep(e.target.value)) buscarCep(e.target.value);
              }}
              erro={erro("cep")}
            />
          </div>
          {campo("logradouro", "Rua", { autoComplete: "address-line1", maxLength: LIMITES_DADOS_SALAO.logradouro.max })}
        </div>
        {cepAviso ? (
          <p role="status" className="-mt-2 text-sm text-noite/65">
            {cepAviso}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          {campo("numero", "Número", { maxLength: LIMITES_DADOS_SALAO.numero.max })}
          {campo("complemento", "Complemento", {
            placeholder: "Sala 2",
            autoComplete: "address-line2",
            maxLength: LIMITES_DADOS_SALAO.complemento.max,
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
          {campo("bairro", "Bairro", { maxLength: LIMITES_DADOS_SALAO.bairro.max })}
          {campo("cidade", "Cidade", { autoComplete: "address-level2", maxLength: LIMITES_DADOS_SALAO.cidade.max })}
          <Selecao
            id="uf"
            rotulo="UF"
            valor={v.uf}
            onChange={mudar("uf")}
            opcoes={[{ valor: "", rotulo: "—" }, ...UFS.map((u) => ({ valor: u, rotulo: u }))]}
            erro={erro("uf")}
          />
        </div>
      </section>

      {estado.ok && !pendente ? <Alerta tipo="sucesso">{estado.ok}</Alerta> : null}
      <div className="flex justify-end">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar alterações"}
        </Botao>
      </div>
    </form>
  );
}
