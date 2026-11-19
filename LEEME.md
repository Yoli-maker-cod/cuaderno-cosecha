# Cuaderno de Cosecha

App para el celular que anota las pesadas de cada cosechador y calcula:

- **Suma de libras** = todas las pesadas
- **Teradas** = suma de libras ÷ 12
- **Pago en Bs** = teradas × monto a pagar por terada (el monto se puede cambiar en cada cosecha)

Funciona **sin internet** después de abrirla una vez con internet. Los datos se guardan en el celular.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página principal |
| `styles.css` | Colores, letras y tamaños |
| `app.js` | Los cálculos y las pantallas |
| `sw.js` | Hace que funcione sin internet. **Si cambias algún archivo, sube `VERSION`** (por ejemplo `cosecha-v2`) |
| `manifest.webmanifest` | Nombre e ícono cuando se instala en el celular |
| `icons/` | Íconos de la app |
| `servidor.js` | Solo para probar en la computadora |

## Probar en la computadora

```bash
node servidor.js
```

Luego abre http://localhost:3000 en Chrome.

## Poner la app en el celular de tus papás

Para instalarse y funcionar sin internet, la app necesita estar publicada en internet con `https`. Opciones gratis:

1. **Netlify Drop:** entra a https://app.netlify.com/drop y arrastra esta carpeta. Te da un enlace.
2. **GitHub Pages:** sube la carpeta a un repositorio y activa Pages en la configuración.

En el celular:

1. Abre el enlace en **Chrome**, con internet.
2. Toca el menú ⋮ y luego **Agregar a pantalla de inicio** (o **Instalar app**).
3. Listo: aparece el ícono "Cosecha" y abre aunque no haya internet.

## Respaldo

Los datos viven solo en ese celular. En la pantalla principal está **Guardar respaldo**: descarga un archivo que conviene mandar por WhatsApp. Con **Recuperar respaldo** se carga de nuevo, en el mismo celular o en otro.
