# Checklist para migrar a repositorio privado

## Antes de subir

- [ ] Confirmar que la app abre con `npm run tauri dev`
- [ ] Confirmar que `.gitignore` cubre `node_modules` y `src-tauri/target`
- [ ] Revisar que no haya instaladores pesados dentro de la carpeta de código
- [ ] Confirmar versión actual del producto
- [ ] Revisar branding provisional

## Crear el repositorio

- [ ] Crear repositorio privado
- [ ] Definir nombre del repositorio
- [ ] Activar autenticación segura
- [ ] Guardar URL del remoto

## Subida inicial

- [ ] `git init`
- [ ] `git branch -M main`
- [ ] `git add .`
- [ ] `git commit -m "Base matriz 1.0.0"`
- [ ] `git remote add origin ...`
- [ ] `git push -u origin main`

## Después de subir

- [ ] Clonar en un segundo equipo o carpeta de prueba
- [ ] Ejecutar instalación de dependencias
- [ ] Abrir la app en desarrollo
- [ ] Confirmar que compila
- [ ] Registrar el acceso privado del repositorio

## Resultado esperado

La matriz debe poder abrirse, corregirse y compilarse desde cualquier equipo autorizado.

