# Activar GitLab Pages

## Objetivo

Publicar los manifiestos `manifest.json` y las notas de entrega en una URL pública estable para que la app pueda revisar actualizaciones por internet.

## Ruta esperada

La base pública configurada para este proyecto es:

`https://sistema-costeo-bionegocios-4e2c8f.gitlab.io`

## Pasos

1. Entra al proyecto `sistema-costeo-bionegocios` en GitLab.
2. Abre `Ajustes`.
3. Entra a `General`.
4. Busca la sección `Visibility, project features, permissions`.
5. Verifica que `Pages` esté habilitado.
6. Haz `push` de la rama `main`.
7. Abre `Compilar > Pipelines` y confirma que el job `pages` termine en verde.
8. Luego abre la URL pública del proyecto.

## Qué debe verse

Al abrir la URL base debe aparecer una página simple con enlaces como:

- `Canal matriz`
- `Canal cliente Aliados`

## Validación rápida

Estas URLs deben responder:

- `https://sistema-costeo-bionegocios-4e2c8f.gitlab.io/updates/matriz/manifest.json`
- `https://sistema-costeo-bionegocios-4e2c8f.gitlab.io/updates/clientes/aliados/manifest.json`

## Si no funciona

Revisa:

- que el proyecto tenga el pipeline ejecutado en `main`
- que `pages` esté habilitado
- que la visibilidad permita acceso público a Pages
- que el archivo `.gitlab-ci.yml` esté presente en la raíz del repositorio

## Resultado esperado

Cuando GitLab Pages esté activo:

- la app podrá usar `Verificar actualización`
- cada cliente podrá consultar su canal
- Jungle Lab podrá publicar nuevas versiones sin reenviar archivos manualmente cada vez
