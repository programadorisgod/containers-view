# Containers View

Visor web para Podman y Docker: contenedores, imágenes, volúmenes y redes, con
vigilancia de contenedores destacados y notificaciones cuando dejan de ejecutarse.

## Desarrollo

```sh
pnpm install
pnpm dev
```

El servidor de desarrollo arranca en `http://localhost:5173`. La página recarga
automáticamente con los cambios (HMR).

> Nota: usa el puerto 5173 (el 6000 está bloqueado por Chrome/Edge, `ERR_UNSAFE_PORT`).

## Notificaciones

Las alertas se envían cuando un contenedor destacado deja de ejecutarse. La
vigilancia y los canales se configuran desde el botón **Notificaciones** de la
cabecera.

Canales disponibles:

- **Consola** — siempre disponible, escribe las alertas en el log del servidor.
- **Email (SMTP)** — requiere las variables `SMTP_*` de `.env`.
- **Telegram** — requiere `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`.
- **WhatsApp** — placeholder, aún no implementado.

Copia `.env.example` a `.env` y rellena las variables (ver el archivo para el
detalle). El destinatario y el remitente también pueden editarse desde la
interfaz (Ajustes → Notificaciones).

## Estado persistente

El estado del watcher y los ajustes se guardan en `./data` (watcher.json,
settings.json). Usa `CONTAINERS_VIEW_DATA` para cambiar la ubicación.

## Despliegue

### Compilar y ejecutar

```sh
pnpm build
pnpm preview --port 5173 --host 0.0.0.0
```

> En desarrollo, Vite carga `.env` automáticamente. En producción (servidor
> compilado) **no** se carga solo: las variables deben estar en el entorno del
> proceso (systemd `EnvironmentFile`, o `export` en el shell).

### Como servicio en el sistema operativo

El proyecto incluye un script envoltorio más una unidad `systemd` que dejan la
app corriendo en el puerto 5173: se reinicia si falla y arranca con tu sesión.

Envoltorio, `~/.local/bin/cv-dev.sh`:

```sh
#!/bin/bash
. "$HOME/.nvm/nvm.sh"              # carga tu Node version manager
cd /ruta/al/proyecto/containers-view
exec pnpm dev --port 5173 --host 0.0.0.0
```

Unidad, `~/.config/systemd/user/cv-dev.service`:

```ini
[Unit]
Description=Containers View dev server (port 5173)

[Service]
Type=simple
ExecStart=/home/camidev/.local/bin/cv-dev.sh
Restart=on-failure
RestartSec=2
# Carga SMTP_*, TELEGRAM_*, NOTIFY_* desde el .env del proyecto.
# El prefijo '-' hace el archivo opcional (no rompe el arranque si falta).
EnvironmentFile=-/home/camidev/projects/containers-view/.env

[Install]
WantedBy=default.target
```

Comandos:

```sh
systemctl --user daemon-reload
systemctl --user enable --now cv-dev   # arranca y se habilita al iniciar sesión
systemctl --user status cv-dev
systemctl --user restart cv-dev
systemctl --user stop cv-dev
journalctl --user -u cv-dev -f         # logs
```

Notas:

- Es un **servicio de usuario**: no requiere `sudo` y vive en tu sesión. Para que
  siga corriendo sin sesión gráfica abierta, habilita el *lingering*:
  `loginctl enable-linger <usuario>`.
- Para producción real, cambia en el envoltorio `pnpm dev` por `pnpm preview`
  (o usa un adaptador como `@sveltejs/adapter-node`).

## Calidad

```sh
pnpm check      # typecheck + svelte-check
pnpm lint       # prettier + eslint
pnpm test       # vitest (servidor y componentes)
```
# containers-view
