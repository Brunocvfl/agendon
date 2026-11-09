import { redirect } from "next/navigation";

// Configurações abre na primeira aba.
export default function PaginaConfiguracoes() {
  redirect("/painel/configuracoes/dados");
}
