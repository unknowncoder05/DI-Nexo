/** Incluye Compodoc y el manual en la salida estática de Vercel. */
import {cp,copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
const output='dist/nexo/browser/documentacion';
await mkdir(output,{recursive:true});
await cp('documentation',output,{recursive:true});
await copyFile('README.md',`${output}/manual.md`);
const index=await readFile(`${output}/index.html`,'utf8');
await writeFile(`${output}/index.html`,index.replace('<head>','<head><base href="/documentacion/">'));
console.log('Compodoc y manual preparados para su publicación en /documentacion/.');
