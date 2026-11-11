# Quem sou eu?

Jogo de bloquinhos do amigo secreto da Chapaternização 2026.

Jogue em: https://alicefvictorino.github.io/amigo-secreto/
Modo apresentação (libera os atalhos de pulo): https://alicefvictorino.github.io/amigo-secreto/#apresentar

## Controles

Setas ou WASD para andar, E para interagir, Enter para continuar, F para tela cheia, M para o som, H para ajuda.
Shift + N pula a cena atual. No modo apresentação, Shift + 1 a 8 vai direto para cada memória.

## Desenvolvimento

```
npm install
node build.mjs   # gera o index.html na raiz, que é o que o GitHub Pages publica
```

Fotos usadas como pistas ficam na pasta `assets/`. Se uma foto faltar, o jogo funciona normalmente e só deixa de mostrar aquela pista.

- `src/scenes.js`: prólogo, corredor e as memórias (cenários, personagens, falas)
- `src/chars.js`: aparência dos personagens (`LOOKS`)
- `src/main.js`: motor do jogo (câmera, movimento, balões, nomes, transições, atalhos)
- `src/world.js`: blocos de construção (caixas, paredes, placas, espelhos)
- `src/audio.js`: sons sintetizados
- `src/secret.js`: nome codificado e modo apresentação
