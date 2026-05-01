# Soporte remoto express

## Uso recomendado

Esta guía sirve para atender una incidencia aunque estés de viaje o usando otra laptop.

## Qué pedir al cliente

- Captura del problema.
- Archivo JSON del costeo.
- Versión de la app.
- Archivo de marca si aplica.
- Explicación corta de qué estaba haciendo.

## Secuencia de atención

1. Traer la matriz actualizada.
2. Revisar que el entorno esté listo.
3. Reproducir el caso con el mismo JSON.
4. Corregir solo en la matriz.
5. Compilar la nueva versión.
6. Preparar la entrega del cliente.
7. Publicar el canal correcto.
8. Entregar y cerrar.

## Comandos rápidos

```powershell
cd C:\Proyectos\sistema-costeo-bionegocios
npm run support:update
npm run support:check
npm run tauri dev
```

Cuando la corrección esté lista:

```powershell
npm run tauri build
```

## Regla de negocio

La matriz manda.

Eso significa:

- no se corrige sobre la copia del cliente
- el historial vive en el repositorio
- el cliente recibe instalador y versión compilada
- el branding queda separado del código
