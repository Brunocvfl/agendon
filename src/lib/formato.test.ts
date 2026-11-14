import { describe, expect, it } from "vitest";
import { formatarTelefone, linkWhatsApp } from "./formato";

describe("formatarTelefone", () => {
  it("celular brasileiro", () => expect(formatarTelefone("+5511987654321")).toBe("(11) 98765-4321"));
  it("fixo brasileiro", () => expect(formatarTelefone("+552134567890")).toBe("(21) 3456-7890"));
  it("outro país fica em E.164", () => expect(formatarTelefone("+14155552671")).toBe("+14155552671"));
});

describe("linkWhatsApp", () => {
  it("usa só os dígitos", () => expect(linkWhatsApp("+5511987654321")).toBe("https://wa.me/5511987654321"));
});

