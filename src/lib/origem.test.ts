import { describe, expect, it } from "vitest";
import { origemPublica } from "./origem";

const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers });

describe("origemPublica", () => {
  it("usa o domínio do proxy, não o endereço interno do contêiner", () => {
    const r = req("https://0.0.0.0:3000/auth/callback?code=x", {
      host: "staging.agendon.app.br",
      "x-forwarded-host": "staging.agendon.app.br",
      "x-forwarded-proto": "https",
    });
    expect(origemPublica(r)).toBe("https://staging.agendon.app.br");
  });

  it("sem X-Forwarded-Host usa o Host", () => {
    const r = req("http://0.0.0.0:3000/x", { host: "agendon.app.br", "x-forwarded-proto": "https" });
    expect(origemPublica(r)).toBe("https://agendon.app.br");
  });

  it("com vários proxies usa o primeiro valor", () => {
    const r = req("http://0.0.0.0:3000/x", {
      "x-forwarded-host": "agendon.app.br, interno",
      "x-forwarded-proto": "https, http",
    });
    expect(origemPublica(r)).toBe("https://agendon.app.br");
  });

  it("ignora host malformado e protocolo desconhecido", () => {
    const r = req("http://localhost:3000/x", {
      "x-forwarded-host": "evil.com/@x",
      host: "localhost:3000",
      "x-forwarded-proto": "javascript",
    });
    expect(origemPublica(r)).toBe("http://localhost:3000");
  });

  it("sem cabeçalhos de proxy fica com a URL da requisição", () => {
    expect(origemPublica(req("http://localhost:3000/x"))).toBe("http://localhost:3000");
  });
});
