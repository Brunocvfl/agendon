import { describe, expect, it } from "vitest";
import { lerEndereco, lerInscricao } from "./push";

const boa = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BPx", auth: "xyz" } };

describe("lerInscricao", () => {
  it("aceita a inscrição do navegador", () => {
    expect(lerInscricao(boa)).toEqual({ endpoint: boa.endpoint, p256dh: "BPx", auth: "xyz" });
  });
  it("recusa o que não é https, sem chaves ou grande demais", () => {
    expect(lerInscricao({ ...boa, endpoint: "http://exemplo.com/x" })).toBeNull();
    expect(lerInscricao({ endpoint: boa.endpoint })).toBeNull();
    expect(lerInscricao({ ...boa, keys: { p256dh: "a".repeat(201), auth: "x" } })).toBeNull();
    expect(lerInscricao({ ...boa, endpoint: `https://${"a".repeat(1000)}` })).toBeNull();
    expect(lerInscricao(null)).toBeNull();
    expect(lerInscricao("texto")).toBeNull();
  });
});

describe("lerEndereco", () => {
  it("só https", () => {
    expect(lerEndereco(boa.endpoint)).toBe(boa.endpoint);
    expect(lerEndereco("javascript:alert(1)")).toBeNull();
    expect(lerEndereco(42)).toBeNull();
  });
});
