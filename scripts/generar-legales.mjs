/* Genera las páginas públicas de los textos legales en dist/, a partir de los
   mismos archivos de legal/ que muestra la app. Las publica GitHub Pages con
   .github/workflows/legales.yml. Para probarlo: node scripts/generar-legales.mjs */

import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMarkdown } from '../src/lib/markdown.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'dist');
const FUENTES = join(RAIZ, 'node_modules/@expo-google-fonts/atkinson-hyperlegible-next');

const DOCUMENTOS = [
  { ruta: 'terminos', archivo: 'terminos-y-condiciones.md', corto: 'Términos' },
  { ruta: 'privacidad', archivo: 'politica-de-privacidad.md', corto: 'Privacidad' },
];

function escapar(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tramos(segmentos) {
  return segmentos
    .map(({ text, bold }) => (bold ? `<strong>${escapar(text)}</strong>` : escapar(text)))
    .join('');
}

/** Agrupa los ítems y las filas seguidas en una sola lista o tabla. */
function cuerpo(bloques) {
  const html = [];
  for (let i = 0; i < bloques.length; i++) {
    const bloque = bloques[i];
    if (bloque.type === 'heading') {
      html.push(`<h2>${escapar(bloque.text)}</h2>`);
    } else if (bloque.type === 'paragraph') {
      html.push(`<p>${tramos(bloque.segments)}</p>`);
    } else {
      const tipo = bloque.type;
      const grupo = [];
      while (bloques[i]?.type === tipo) grupo.push(bloques[i++]);
      i--;
      if (tipo === 'item') {
        html.push(`<ul>${grupo.map((item) => `<li>${tramos(item.segments)}</li>`).join('')}</ul>`);
      } else {
        const filas = grupo.map((fila) => `<div><dt>${escapar(fila.label)}</dt><dd>${escapar(fila.value)}</dd></div>`);
        html.push(`<dl>${filas.join('')}</dl>`);
      }
    }
  }
  return html.join('\n');
}

function pagina(doc, actual) {
  const enlaces = DOCUMENTOS.map(({ ruta, corto }) => {
    const marca = ruta === actual ? ' aria-current="page"' : '';
    return `<a href="../${ruta}/"${marca}>${corto}</a>`;
  }).join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapar(doc.title)}</title>
<meta name="description" content="${escapar(doc.title)}. Última actualización: ${escapar(doc.updated)}.">
<link rel="icon" href="../favicon.png">
<link rel="stylesheet" href="../estilos.css">
</head>
<body>
<header>
<span class="marca"><img src="../icono.png" alt="" width="36" height="36">GestoApp</span>
<nav aria-label="Documentos">${enlaces}</nav>
</header>
<main>
<h1>${escapar(doc.title)}</h1>
<p class="fecha">Última actualización: ${escapar(doc.updated)}</p>
${cuerpo(doc.blocks)}
</main>
</body>
</html>
`;
}

const ESTILOS = `@font-face { font-family: "Atkinson Hyperlegible Next"; src: url("fuentes/regular.ttf") format("truetype"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Atkinson Hyperlegible Next"; src: url("fuentes/bold.ttf") format("truetype"); font-weight: 700; font-display: swap; }

:root {
  --ink: oklch(0.21 0.012 250);
  --texto: oklch(0.30 0.012 250);
  --tenue: oklch(0.47 0.012 250);
  --borde: oklch(0.89 0.006 250);
  --fondo: oklch(0.975 0.003 250);
  --superficie: oklch(1 0 0);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--fondo);
  color: var(--texto);
  font: 400 1rem/1.55 "Atkinson Hyperlegible Next", system-ui, sans-serif;
}

header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 760px;
  margin: 0 auto;
  padding: 20px 16px 0;
}

.marca { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 700; }
.marca img { border-radius: 9px; }

nav { display: flex; gap: 4px; }
nav a { padding: 6px 12px; border-radius: 8px; color: var(--texto); text-decoration: none; }
nav a:hover { background: var(--borde); }
nav a:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
nav a[aria-current="page"] { background: var(--ink); color: var(--superficie); }

main { max-width: 760px; margin: 0 auto; padding: 24px 16px 64px; overflow-wrap: anywhere; }

h1 { margin: 0 0 4px; color: var(--ink); font-size: 1.75rem; line-height: 1.25; }
h2 { margin: 32px 0 8px; color: var(--ink); font-size: 1.15rem; line-height: 1.35; }
p { margin: 0 0 12px; }
ul { margin: 0 0 12px; padding-left: 20px; }
li { margin-bottom: 6px; }
strong { color: var(--ink); }

.fecha { margin-bottom: 24px; color: var(--tenue); font-size: 0.875rem; }

dl { margin: 0 0 12px; border: 1px solid var(--borde); border-radius: 10px; background: var(--superficie); }
dl div { padding: 10px 12px; }
dl div + div { border-top: 1px solid var(--borde); }
dt { color: var(--ink); font-weight: 700; }
dd { margin: 0; }
`;

const INICIO = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GestoApp · Textos legales</title>
<link rel="icon" href="favicon.png">
<link rel="stylesheet" href="estilos.css">
</head>
<body>
<main>
<h1>GestoApp</h1>
<ul>
${DOCUMENTOS.map(({ ruta, corto }) => `<li><a href="${ruta}/">${corto}</a></li>`).join('\n')}
</ul>
</main>
</body>
</html>
`;

await rm(SALIDA, { recursive: true, force: true });
await mkdir(join(SALIDA, 'fuentes'), { recursive: true });

for (const { ruta, archivo } of DOCUMENTOS) {
  const doc = parseMarkdown(await readFile(join(RAIZ, 'legal', archivo), 'utf8'));
  if (!doc.title || !doc.updated) throw new Error(`Falta el título o la fecha en ${archivo}`);
  await mkdir(join(SALIDA, ruta));
  await writeFile(join(SALIDA, ruta, 'index.html'), pagina(doc, ruta));
}

await writeFile(join(SALIDA, 'index.html'), INICIO);
await writeFile(join(SALIDA, 'estilos.css'), ESTILOS);
await copyFile(join(RAIZ, 'assets/images/favicon.png'), join(SALIDA, 'favicon.png'));
await copyFile(join(RAIZ, 'assets/images/icon.png'), join(SALIDA, 'icono.png'));
await copyFile(join(FUENTES, '400Regular/AtkinsonHyperlegibleNext_400Regular.ttf'), join(SALIDA, 'fuentes/regular.ttf'));
await copyFile(join(FUENTES, '700Bold/AtkinsonHyperlegibleNext_700Bold.ttf'), join(SALIDA, 'fuentes/bold.ttf'));

console.log(`Páginas legales generadas en ${SALIDA}`);
