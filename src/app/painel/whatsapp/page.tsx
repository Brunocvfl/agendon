import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Alerta, Cartao } from "@/components/ui";
import { PaginaProtegida } from "@/components/pagina-protegida";
import { getUsuario } from "@/lib/auth";
import {
  ehAdminDaPlataforma,
  lerConta,
  MODELO_CONFIRMACAO_V3,
  rotuloDoLimite,
  type Chamada,
  type Leitura,
} from "@/lib/whatsapp/conta";
import { BotaoCriarModelo } from "./botao-criar-modelo";

export const metadata: Metadata = { title: "Conta do WhatsApp · AgendOn" };

// Temporário: conta do WhatsApp do AgendOn (WABA) pela Management API, para a análise do app na Meta.
// Só Dono(a) que esteja em ADMINS_PLATAFORMA; para os outros, a página não existe.
export default function PaginaContaWhatsApp() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold sm:text-3xl">Conta do WhatsApp</h1>
      <p className="mt-1 text-noite/70">
        Número, modelos de mensagem e webhook da conta do WhatsApp Business do AgendOn, lidos na hora pela API da Meta.
      </p>
      <PaginaProtegida exige="gerenciar-salao" carregando={<Cartao className="mt-6 h-64">{null}</Cartao>}>
        {() => <Conteudo />}
      </PaginaProtegida>
    </div>
  );
}

async function Conteudo() {
  const usuario = await getUsuario();
  if (!ehAdminDaPlataforma(usuario?.email ?? null)) notFound();

  const conta = await lerConta();
  if (!conta) {
    return (
      <div className="mt-6">
        <Alerta tipo="erro">Faltam META_ACCESS_TOKEN, META_PHONE_NUMBER_ID ou META_WABA_ID no servidor.</Alerta>
      </div>
    );
  }
  const { numero, modelos, webhook } = conta;
  const temV3 = modelos.ok && modelos.dados.some((m) => m.nome === MODELO_CONFIRMACAO_V3.name);

  return (
    <>
      <Secao titulo="Número de telefone" leitura={numero}>
        {(n) => (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <Item rotulo="Número">{n.telefone}</Item>
            <Item rotulo="Nome de exibição">
              {n.nome} <Selo valor={n.statusNome} />
            </Item>
            <Item rotulo="Conexão">
              <Selo valor={n.status} />
            </Item>
            <Item rotulo="Qualidade">
              <Selo valor={n.qualidade} />
            </Item>
            <Item rotulo="Limite de mensagens">
              {rotuloDoLimite(n.limite)} <span className="text-noite/60">({n.limite})</span>
            </Item>
          </dl>
        )}
      </Secao>

      <Secao titulo="Modelos de mensagem" leitura={modelos}>
        {(lista) =>
          lista.length === 0 ? (
            <p className="text-sm text-noite/70">Nenhum modelo cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-noite/60">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Nome</th>
                    <th className="py-2 pr-4 font-semibold">Categoria</th>
                    <th className="py-2 pr-4 font-semibold">Idioma</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((m) => (
                    <tr key={m.id} className="border-t border-noite/8">
                      <td className="py-2.5 pr-4 font-mono text-[13px]">{m.nome}</td>
                      <td className="py-2.5 pr-4">{m.categoria}</td>
                      <td className="py-2.5 pr-4">{m.idioma}</td>
                      <td className="py-2.5">
                        <Selo valor={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Secao>

      <Cartao className="mt-6">
        <h2 className="text-lg font-semibold">Criar modelo de confirmação</h2>
        <p className="mt-1 text-sm text-noite/70">
          Cadastra na conta o modelo <code className="font-mono">{MODELO_CONFIRMACAO_V3.name}</code> (utilidade, pt_BR).
          A Meta analisa antes de liberar o uso.
        </p>
        <figure className="mt-4">
          <figcaption className="text-xs font-semibold uppercase tracking-wide text-noite/60">Texto do modelo</figcaption>
          <div className="mt-2 rounded-2xl bg-[#E9E2D8] p-4">
            <p className="max-w-md rounded-xl rounded-tl-none bg-white px-4 py-3 text-sm text-noite shadow-sm">
              {MODELO_CONFIRMACAO_V3.components[0].text}
            </p>
          </div>
        </figure>
        <Endpoint chamada={{ metodo: "POST", caminho: "/{waba-id}/message_templates" }} />
        <div className="mt-4">
          {temV3 ? (
            <p className="text-sm text-noite/70">O modelo já está na conta (veja o status na lista acima).</p>
          ) : (
            <BotaoCriarModelo />
          )}
        </div>
      </Cartao>

      <Secao titulo="Webhook" leitura={webhook}>
        {(apps) =>
          apps.length === 0 ? (
            <p className="text-sm text-noite/70">Nenhum app assinado: status de entrega e respostas não chegam.</p>
          ) : (
            <ul className="text-sm">
              {apps.map((a) => (
                <li key={a.id}>
                  App <strong>{a.nome}</strong> assinado: recebe status de entrega e as respostas SAIR.
                </li>
              ))}
            </ul>
          )
        }
      </Secao>
    </>
  );
}

function Secao<T>({
  titulo,
  leitura,
  children,
}: {
  titulo: string;
  leitura: Leitura<T>;
  children: (dados: T) => ReactNode;
}) {
  return (
    <Cartao className="mt-6">
      <h2 className="mb-4 text-lg font-semibold">{titulo}</h2>
      {leitura.ok ? children(leitura.dados) : <Alerta tipo="erro">A Meta não respondeu: {leitura.erro}</Alerta>}
      <Endpoint chamada={leitura.chamada} />
    </Cartao>
  );
}

// O pedido feito à API (sem o token), para mostrar de onde vêm os dados.
function Endpoint({ chamada }: { chamada: Chamada }) {
  return (
    <p className="mt-4 break-all rounded-lg bg-fundo px-3 py-2 font-mono text-xs text-noite/70">
      <span className="font-semibold text-noite">{chamada.metodo}</span> graph.facebook.com{chamada.caminho}
    </p>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-noite/60">{rotulo}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

const BOM = new Set(["APPROVED", "CONNECTED", "GREEN", "APPROVED_NAME"]);
const RUIM = new Set(["REJECTED", "DECLINED", "RED", "DISCONNECTED", "BANNED", "FLAGGED"]);

function Selo({ valor }: { valor: string }) {
  if (!valor) return null;
  const cor = BOM.has(valor)
    ? "bg-confirmado/15 text-noite"
    : RUIM.has(valor)
      ? "bg-red-50 text-red-700"
      : "bg-amber-100 text-amber-900";
  return <span className={`ml-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cor}`}>{valor}</span>;
}
