"use client";

// Versão 3, topo: o dia do salão como um mostrador 3D (three.js). Cada fatia é meia hora, das 08:00 às 20:00.
// Quando um cliente "marca", a fatia sobe e acende azul (agendado) e, logo depois, verde (confirmação enviada).
// - three.js é carregado só no navegador (import dinâmico), fora do pacote inicial.
// - "Reduzir movimento": desenha uma vez, já com o dia cheio, sem girar.
// - Fora da tela: para o laço de desenho. Sem WebGL: anel em SVG.
// Dados fictícios; nada é enviado.
import { useEffect, useRef, useState } from "react";

const FATIAS = 24; // 08:00 a 20:00, de 30 em 30 min
const INICIO_HORA = 8;

export type Marcacao = { fatia: number; cliente: string; servico: string };

// Ordem em que os horários "chegam" (fatia = índice de meia hora a partir das 08:00).
export const MARCACOES: Marcacao[] = [
  { fatia: 4, cliente: "Juliana", servico: "Escova com Ana" },
  { fatia: 2, cliente: "Marina", servico: "Corte feminino com Ana" },
  { fatia: 13, cliente: "Fernanda", servico: "Coloração com Carla" },
  { fatia: 5, cliente: "Rafael", servico: "Barba com Bruno" },
  { fatia: 19, cliente: "Beatriz", servico: "Manicure com Carla" },
  { fatia: 9, cliente: "Diego", servico: "Cabelo e barba com Bruno" },
  { fatia: 16, cliente: "Patrícia", servico: "Corte feminino com Ana" },
  { fatia: 0, cliente: "Lucas", servico: "Barba com Bruno" },
  { fatia: 21, cliente: "Camila", servico: "Escova com Ana" },
  { fatia: 11, cliente: "Bruna", servico: "Manicure com Carla" },
];

export function horaDaFatia(fatia: number) {
  const minutos = INICIO_HORA * 60 + fatia * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${minutos % 60 === 0 ? "00" : "30"}`;
}

const INTERVALO = 1.5; // segundos entre uma marcação e outra
const ATE_CONFIRMAR = 0.7; // azul → verde
const PAUSA_CHEIO = 3.5; // dia cheio antes de recomeçar

export function Mostrador3D({ aoMarcar }: { aoMarcar: (quantas: number) => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [semWebgl, setSemWebgl] = useState(false);
  const aoMarcarRef = useRef(aoMarcar);
  useEffect(() => {
    aoMarcarRef.current = aoMarcar;
  }, [aoMarcar]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    let desfazer: (() => void) | undefined;
    let cancelado = false;

    (async () => {
      const THREE = await import("three");
      if (cancelado) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      } catch {
        setSemWebgl(true);
        return;
      }
      const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.style.display = "block";
      el.appendChild(renderer.domElement);

      const cena = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      camera.position.set(0, 0, 13.2);

      cena.add(new THREE.HemisphereLight(0xdfe6ff, 0x0f1b4d, 1.4));
      const sol = new THREE.DirectionalLight(0xffffff, 2.2);
      sol.position.set(-4, 6, 8);
      cena.add(sol);
      const brilho = new THREE.PointLight(0x2f5bff, 10, 14);
      brilho.position.set(0, 0, 2.5);
      cena.add(brilho);

      // Mostrador inclinado, como um relógio sobre a bancada.
      const mostrador = new THREE.Group();
      mostrador.rotation.x = -0.95;
      cena.add(mostrador);
      const roda = new THREE.Group();
      mostrador.add(roda);

      const R = 3.3;
      const r = 2.15;
      const folga = 0.035; // espaço entre fatias (radianos)
      const passo = (Math.PI * 2) / FATIAS;
      const corBase = new THREE.Color(0x1a2763);
      const corAgendado = new THREE.Color(0x2f5bff);
      const corConfirmado = new THREE.Color(0x19c37d);
      const preto = new THREE.Color(0x000000);

      const geometrias: InstanceType<typeof THREE.ExtrudeGeometry>[] = [];
      const fatias = Array.from({ length: FATIAS }, (_, i) => {
        // 08:00 no topo, sentido horário.
        const a1 = Math.PI / 2 - i * passo - folga;
        const a0 = Math.PI / 2 - (i + 1) * passo + folga;
        const forma = new THREE.Shape();
        forma.absarc(0, 0, R, a0, a1, false);
        forma.absarc(0, 0, r, a1, a0, true);
        const geo = new THREE.ExtrudeGeometry(forma, {
          depth: 0.22,
          bevelEnabled: true,
          bevelSize: 0.04,
          bevelThickness: 0.04,
          bevelSegments: 2,
          curveSegments: 10,
        });
        geometrias.push(geo);
        const material = new THREE.MeshStandardMaterial({ color: corBase.clone(), roughness: 0.6, metalness: 0.1 });
        const malha = new THREE.Mesh(geo, material);
        roda.add(malha);
        return { malha, material, altura: 0, alvoAltura: 0, cor: corBase.clone(), alvoCor: corBase.clone(), emissao: 0, alvoEmissao: 0 };
      });

      // Marcas das horas cheias pares (08, 10, ... 18) por fora do anel.
      const fonte = getComputedStyle(document.body).fontFamily;
      const texturas: InstanceType<typeof THREE.CanvasTexture>[] = [];
      const materiaisRotulo: InstanceType<typeof THREE.SpriteMaterial>[] = [];
      for (let h = 0; h < 12; h += 2) {
        const tela = document.createElement("canvas");
        tela.width = 256;
        tela.height = 128;
        const ctx = tela.getContext("2d")!;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = `200 96px ${fonte}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(INICIO_HORA + h).padStart(2, "0"), 128, 68);
        const textura = new THREE.CanvasTexture(tela);
        textura.colorSpace = THREE.SRGBColorSpace;
        texturas.push(textura);
        const mat = new THREE.SpriteMaterial({ map: textura, transparent: true, depthWrite: false });
        materiaisRotulo.push(mat);
        const rotulo = new THREE.Sprite(mat);
        const ang = Math.PI / 2 - h * 2 * passo;
        rotulo.position.set(Math.cos(ang) * (R + 0.75), Math.sin(ang) * (R + 0.75), 0.2);
        rotulo.scale.set(0.9, 0.45, 1);
        roda.add(rotulo);
      }

      function marcar(m: Marcacao, confirmada: boolean) {
        const f = fatias[m.fatia];
        f.alvoAltura = 0.55;
        f.alvoCor.copy(confirmada ? corConfirmado : corAgendado);
        f.alvoEmissao = confirmada ? 0.35 : 0.5;
      }
      function limpar() {
        for (const f of fatias) {
          f.alvoAltura = 0;
          f.alvoCor.copy(corBase);
          f.alvoEmissao = 0;
        }
      }

      function redimensionar() {
        const w = el!.clientWidth;
        const h = el!.clientHeight;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = `${w}px`;
        renderer.domElement.style.height = `${h}px`;
        camera.aspect = w / h;
        // Em telas estreitas, afasta a câmera para o anel caber.
        camera.position.z = w / h < 0.9 ? 16 : 13.2;
        camera.updateProjectionMatrix();
      }
      redimensionar();
      const observadorTamanho = new ResizeObserver(() => {
        redimensionar();
        if (reduzir) renderer.render(cena, camera);
      });
      observadorTamanho.observe(el);

      // Leve inclinação seguindo o ponteiro.
      const ponteiro = { x: 0, y: 0 };
      function aoMover(e: PointerEvent) {
        ponteiro.x = (e.clientX / window.innerWidth) * 2 - 1;
        ponteiro.y = (e.clientY / window.innerHeight) * 2 - 1;
      }
      if (!reduzir) window.addEventListener("pointermove", aoMover, { passive: true });

      if (reduzir) {
        MARCACOES.forEach((m) => marcar(m, true));
        for (const f of fatias) {
          f.altura = f.alvoAltura;
          f.cor.copy(f.alvoCor);
          f.emissao = f.alvoEmissao;
          f.malha.position.z = f.altura;
          f.material.color.copy(f.cor);
          f.material.emissive.copy(f.cor).multiplyScalar(f.emissao);
        }
        roda.rotation.z = 0.2;
        renderer.render(cena, camera);
        aoMarcarRef.current(MARCACOES.length);
      } else {
        let antes = performance.now();
        let ciclo = 0;
        let ultimaContagem = -1;
        const duracaoCiclo = MARCACOES.length * INTERVALO + PAUSA_CHEIO;

        const desenhar = () => {
          const agora = performance.now();
          const dt = Math.min((agora - antes) / 1000, 0.1);
          antes = agora;
          ciclo += dt;
          if (ciclo > duracaoCiclo) {
            ciclo = 0;
            limpar();
          }
          const t = ciclo - 0.6;
          const quantas = Math.max(0, Math.min(MARCACOES.length, Math.floor(t / INTERVALO) + 1));
          for (let i = 0; i < quantas; i++) marcar(MARCACOES[i], t - i * INTERVALO > ATE_CONFIRMAR);
          if (quantas !== ultimaContagem) {
            ultimaContagem = quantas;
            aoMarcarRef.current(quantas);
          }

          const k = 1 - Math.exp(-dt * 7);
          for (const f of fatias) {
            f.altura += (f.alvoAltura - f.altura) * k;
            f.cor.lerp(f.alvoCor, k);
            f.emissao += (f.alvoEmissao - f.emissao) * k;
            f.malha.position.z = f.altura;
            f.material.color.copy(f.cor);
            f.material.emissive.copy(f.cor).multiplyScalar(f.emissao);
            if (f.emissao < 0.001) f.material.emissive.copy(preto);
          }
          roda.rotation.z -= dt * 0.06;
          mostrador.rotation.x += (-0.95 + ponteiro.y * 0.12 - mostrador.rotation.x) * k * 0.5;
          mostrador.rotation.y += (ponteiro.x * 0.18 - mostrador.rotation.y) * k * 0.5;
          renderer.render(cena, camera);
        };

        // Só desenha enquanto o topo está visível.
        const observadorTela = new IntersectionObserver(([e]) => {
          antes = performance.now();
          renderer.setAnimationLoop(e.isIntersecting ? desenhar : null);
        });
        observadorTela.observe(el);
        desfazer = () => {
          observadorTela.disconnect();
        };
      }

      const desfazerAnimacao = desfazer;
      desfazer = () => {
        desfazerAnimacao?.();
        renderer.setAnimationLoop(null);
        observadorTamanho.disconnect();
        window.removeEventListener("pointermove", aoMover);
        for (const g of geometrias) g.dispose();
        for (const f of fatias) f.material.dispose();
        for (const t of texturas) t.dispose();
        for (const m of materiaisRotulo) m.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      cancelado = true;
      desfazer?.();
    };
  }, []);

  return (
    <div ref={caixa} className="absolute inset-0">
      {semWebgl && <AnelSvg />}
    </div>
  );
}

// Sem WebGL: o mesmo anel, plano, já com o dia cheio.
function AnelSvg() {
  const marcadas = new Set(MARCACOES.map((m) => m.fatia));
  const passo = 360 / FATIAS;
  return (
    <svg aria-hidden viewBox="-110 -110 220 220" className="size-full p-6">
      {Array.from({ length: FATIAS }, (_, i) => {
        const a0 = ((i * passo + 0.8 - 90) * Math.PI) / 180;
        const a1 = (((i + 1) * passo - 0.8 - 90) * Math.PI) / 180;
        const [R, r] = [92, 60];
        const p = (raio: number, a: number) => `${(Math.cos(a) * raio).toFixed(2)} ${(Math.sin(a) * raio).toFixed(2)}`;
        return (
          <path
            key={i}
            d={`M ${p(R, a0)} A ${R} ${R} 0 0 1 ${p(R, a1)} L ${p(r, a1)} A ${r} ${r} 0 0 0 ${p(r, a0)} Z`}
            fill={marcadas.has(i) ? "#19c37d" : "#1d2c70"}
          />
        );
      })}
    </svg>
  );
}
