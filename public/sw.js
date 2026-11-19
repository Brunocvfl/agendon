// Service worker do AgendOn: só os avisos da equipe (Web Push). Não guarda nada em cache
// (o app não funciona offline). O conteúdo vem de src/lib/push/aviso.ts: { titulo, corpo, url, tag }.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let aviso = {};
  try {
    aviso = event.data ? event.data.json() : {};
  } catch {
    aviso = {};
  }
  const url = typeof aviso.url === "string" && aviso.url.startsWith("/painel") ? aviso.url : "/painel/notificacoes";
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(aviso.titulo || "AgendOn", {
        body: aviso.corpo || "Você tem um aviso novo.",
        icon: "/app/icone-192.png",
        badge: "/app/icone-192.png",
        tag: aviso.tag || undefined,
        lang: "pt-BR",
        data: { url },
      }),
      // Painel aberto: atualiza o contador do sininho.
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((janelas) => janelas.forEach((j) => j.postMessage({ tipo: "aviso-novo" }))),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/painel/notificacoes", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      const aberta = janelas.find((j) => new URL(j.url).origin === self.location.origin);
      // navigate() só funciona em janela controlada por este service worker; senão, abre outra.
      if (aberta) return aberta.focus().then((j) => j.navigate(url)).catch(() => self.clients.openWindow(url));
      return self.clients.openWindow(url);
    }),
  );
});
