# Publicar en GitHub

## Objetivo

Conectar esta matriz local a un repositorio de GitHub y empujar la rama `main` para activar GitHub Pages.

## Antes de empezar

Necesitas:

- un repositorio ya creado en GitHub
- su URL HTTPS, por ejemplo:
  - `https://github.com/TU-USUARIO/sistema-costeo-bionegocios.git`

## Opcion rapida

Desde la carpeta del proyecto:

```powershell
npm run github:push -- -RepositoryUrl "https://github.com/TU-USUARIO/sistema-costeo-bionegocios.git"
```

Ese comando:

1. agrega el remoto `github` si no existe
2. lo actualiza si ya existia
3. publica la rama `main`

## Opcion manual

```powershell
git remote add github "https://github.com/TU-USUARIO/sistema-costeo-bionegocios.git"
git push -u github main
```

Si el remoto ya existia:

```powershell
git remote set-url github "https://github.com/TU-USUARIO/sistema-costeo-bionegocios.git"
git push -u github main
```

## Despues del push

1. entra al repositorio en GitHub
2. abre `Settings`
3. abre `Pages`
4. selecciona `GitHub Actions`
5. espera el workflow `Publicar GitHub Pages`

## Resultado esperado

GitHub publicara una URL como:

`https://TU-USUARIO.github.io/sistema-costeo-bionegocios`

Y desde ahi podras servir:

- `updates/matriz/manifest.json`
- `updates/clientes/aliados/manifest.json`
- notas de entrega dentro de `releases/`
