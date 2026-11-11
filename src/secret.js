// O nome do amigo secreto fica codificado para não aparecer no código-fonte publicado.
// Para trocar: node -e "const k=0x2a;console.log(Buffer.from(Array.from('NOME',c=>String.fromCharCode(c.charCodeAt(0)^k)).join(''),'latin1').toString('base64'))"
const K = 0x2a;
const dec = (s) => Array.from(atob(s), (c) => String.fromCharCode(c.charCodeAt(0) ^ K)).join('');

export const SECRET_NAME = dec('Zl9DUA==');
export const SECRET_KEY = 'x';

// modo apresentação: atalhos de pulo só funcionam com #apresentar no endereço
export const PRESENTER = typeof location !== 'undefined' && location.hash === '#apresentar';
