import { describe, expect, it } from "vitest";
import { paraCsv } from "./csv";
import { arquivoDaLista, lerFiltroWhatsApp } from "./regras/cliente";

describe("paraCsv", () => {
  it("usa ; e CRLF, com BOM para o Excel ler os acentos", () => {
    expect(paraCsv(["Nome", "Visitas"], [["Ana", 2]])).toBe("﻿Nome;Visitas\r\nAna;2\r\n");
  });
  it("põe entre aspas o que tem ; aspas ou quebra de linha", () => {
    expect(paraCsv(["a"], [['Diz "oi"; tchau'], ["linha\n2"]])).toBe('﻿a\r\n"Diz ""oi""; tchau"\r\n"linha\n2"\r\n');
  });
  it("neutraliza fórmulas e deixa vazio o que é nulo", () => {
    expect(paraCsv(["a", "b", "c"], [["=HYPERLINK(1)", "@soma", null]])).toBe("﻿a;b;c\r\n'=HYPERLINK(1);'@soma;\r\n");
  });
});

describe("exportação da lista de clientes", () => {
  it("filtro de WhatsApp desconhecido vira 'todos'", () => {
    expect(lerFiltroWhatsApp("autorizou")).toBe("autorizou");
    expect(lerFiltroWhatsApp("toString")).toBe("todos");
    expect(lerFiltroWhatsApp(undefined)).toBe("todos");
  });
  it("nome do arquivo com a data", () => {
    expect(arquivoDaLista("2026-11-18")).toBe("clientes-2026-11-18.csv");
  });
});
