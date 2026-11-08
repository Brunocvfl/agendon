import { describe, expect, it } from "vitest";
import { formatarDiaMes, formatarMesAno, formatarTelefone, linkWhatsApp } from "./formato";

describe("formatarTelefone", () => {
  it("celular brasileiro", () => expect(formatarTelefone("+5511987654321")).toBe("(11) 98765-4321"));
  it("fixo brasileiro", () => expect(formatarTelefone("+552134567890")).toBe("(21) 3456-7890"));
  it("outro país fica em E.164", () => expect(formatarTelefone("+14155552671")).toBe("+14155552671"));
});

describe("linkWhatsApp", () => {
  it("usa só os dígitos", () => expect(linkWhatsApp("+5511987654321")).toBe("https://wa.me/5511987654321"));
});

describe("datas no fuso do salão", () => {
  // 02:00 UTC de 1º de dezembro ainda é 30 de novembro em São Paulo.
  it("dia e mês", () => expect(formatarDiaMes("2026-12-01T02:00:00Z", "America/Sao_Paulo")).toBe("30 nov"));
  it("mês e ano", () => expect(formatarMesAno("2026-12-01T02:00:00Z", "America/Sao_Paulo")).toBe("nov/2026"));
});
