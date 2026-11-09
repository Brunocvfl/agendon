// Senha de acesso: mínimo de 10 caracteres, com maiúscula, minúscula e número.
// Espelha o Auth do Supabase (`minimum_password_length` e `password_requirements =
// "lower_upper_letters_digits"` em supabase/config.toml), que é quem garante de verdade.

export const LIMITES_SENHA = { min: 10, max: 72 } as const;

export type RequisitoSenha = { id: "tamanho" | "maiuscula" | "minuscula" | "numero"; texto: string; ok: boolean };

export function requisitosDaSenha(senha: string): RequisitoSenha[] {
  return [
    { id: "tamanho", texto: `Pelo menos ${LIMITES_SENHA.min} caracteres`, ok: senha.length >= LIMITES_SENHA.min },
    { id: "maiuscula", texto: "Uma letra maiúscula", ok: /[A-Z]/.test(senha) },
    { id: "minuscula", texto: "Uma letra minúscula", ok: /[a-z]/.test(senha) },
    { id: "numero", texto: "Um número", ok: /[0-9]/.test(senha) },
  ];
}

// Valida a senha nova (e a repetição, quando houver). Devolve a mensagem de erro ou null.
export function erroDaSenha(senha: string, repeticao?: string): string | null {
  if (senha.length > LIMITES_SENHA.max) return `A senha pode ter no máximo ${LIMITES_SENHA.max} caracteres.`;
  const faltando = requisitosDaSenha(senha).filter((r) => !r.ok);
  if (faltando.length > 0) {
    return `A senha precisa ter: ${faltando.map((r) => r.texto.toLowerCase()).join(", ")}.`;
  }
  if (repeticao !== undefined && senha !== repeticao) return "As duas senhas não são iguais.";
  return null;
}
