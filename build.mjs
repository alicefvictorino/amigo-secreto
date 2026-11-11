import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

// Fotos (pasta assets/) entram no jogo só se existirem nesta máquina.
// Elas ficam fora do repositório; sem elas, as pistas com foto simplesmente não aparecem.
const optionalImages = {
  name: 'optional-images',
  setup(build) {
    build.onResolve({ filter: /\.(jpe?g|png)$/ }, (args) => {
      const p = path.resolve(args.resolveDir, args.path);
      if (fs.existsSync(p)) return { path: p, namespace: 'img' };
      return { path: args.path, namespace: 'no-img' };
    });
    build.onLoad({ filter: /.*/, namespace: 'img' }, (args) => {
      const ext = path.extname(args.path).slice(1).replace('jpg', 'jpeg');
      const data = fs.readFileSync(args.path).toString('base64');
      return { contents: `export default "data:image/${ext};base64,${data}";`, loader: 'js' };
    });
    build.onLoad({ filter: /.*/, namespace: 'no-img' }, () => ({ contents: 'export default "";', loader: 'js' }));
  },
};

const res = await esbuild.build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
  plugins: [optionalImages],
});
let js = res.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('template.html', 'utf8').replace('/*__BUNDLE__*/', () => js);
// index.html na raiz é o que o GitHub Pages publica
const out = process.argv[2] || 'index.html';
fs.writeFileSync(out, html);
console.log(out, (html.length / 1024).toFixed(0), 'KB');
