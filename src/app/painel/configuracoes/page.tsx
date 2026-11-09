import { redirect } from "next/navigation";

// Configurações abre na única aba pronta.
export default function PaginaConfiguracoes() {
  redirect("/painel/configuracoes/equipe");
}
