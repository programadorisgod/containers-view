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

Copiar `.env.example` a `.env` y rellenar las variables (ver el archivo para el
detalle). El destinatario y el remitente también pueden editarse desde la
interfaz (Ajustes → Notificaciones).

### Múltiples destinatarios de correo

Para enviar alertas a varios correos, activa la opción **Enviar a múltiples
destinatarios** desde la UI (panel Notificaciones) y separa los correos con
comas en el campo destinatario:

```
admin@ejemplo.com, ops@ejemplo.com, alerts@ejemplo.com
```

También se puede activar por variable de entorno:

```bash
NOTIFY_MULTI_TO=true
```

Cuando está desactivado (valor por defecto), solo se envía a un único
destinatario.

### Variables de notificación

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `NOTIFY_TO` | Destinatario(s) de correo | `''` |
| `NOTIFY_FROM` | Remitente de correo | `''` |
| `NOTIFY_MULTI_TO` | Permite varios destinatarios separados por coma | `false` |
| `SMTP_HOST` | Servidor SMTP | `''` |
| `SMTP_PORT` | Puerto SMTP | `587` |
| `SMTP_SECURE` | Usar TLS | `false` |
| `SMTP_USER` | Usuario SMTP | `''` |
| `SMTP_PASS` | Contraseña SMTP | `''` |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | `''` |
| `TELEGRAM_CHAT_ID` | ID del chat de Telegram | `''` |

### Motor de contenedores

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PODMAN_SOCKET` | Ruta al socket de Podman | `''` |
| `CONTAINERS_SOCKET` | Ruta genérica al socket del motor | `''` |
| `DOCKER_HOST` | URL de conexión (unix:// o tcp://) | `''` |

### Preview

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PREVIEW_ALLOWED_HOSTS` | Hosts permitidos en preview (separados por coma) | `''` |

## Estado persistente

El estado del watcher y los ajustes se guardan en `./data` (watcher.json,
settings.json). Usa `CONTAINERS_VIEW_DATA` para cambiar la ubicación.

## Motor de contenedores

La app detecta automáticamente Podman y Docker buscando sockets en rutas
conocidas. Si no encuentra ninguno, muestra un error de conexión.

Para especificar manualmente el socket o usar una conexión remota:

```bash
# Socket directo
PODMAN_SOCKET=/run/user/1000/podman/podman.sock

# O usar DOCKER_HOST (soporta unix:// y tcp://)
DOCKER_HOST=unix:///run/user/1000/podman/podman.sock

# O apuntar directamente al socket
CONTAINERS_SOCKET=/run/user/1000/podman/podman.sock
```

Para encontrar la ruta del socket de Podman:

```sh
podman info --format '{{.Host.RemoteSocket.Path}}'
```

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
