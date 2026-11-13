# Painel CTO — Monitoramento FTTH

Painel web do projeto **Sistema IoT de Monitoramento Inteligente de CTOs em Redes FTTH**.
Ele se conecta ao mesmo broker MQTT do ESP32 (simulado no Wokwi), mostra as leituras
em tempo real e envia comandos à CTO.

Feito com React + TypeScript + Vite, na mesma estrutura do projeto Full-Net.

## Como rodar

Requisitos: Node.js (LTS) e npm.

```bash
npm install      # só na primeira vez
npm run dev      # abre em http://localhost:5173
```

Depois, inicie a simulação no Wokwi. A primeira telemetria chega em até 10 s.

Outros comandos:

| Comando           | O que faz                                  |
| ----------------- | ------------------------------------------ |
| `npm run build`   | Gera a versão de produção na pasta `dist`  |
| `npm run preview` | Serve a pasta `dist` para conferir o build |
| `npm run lint`    | Verifica o código com o ESLint             |

## Como funciona

O painel e o ESP32 não conversam diretamente: os dois são clientes do mesmo broker
(`broker.hivemq.com`), que repassa as mensagens.

| Tópico                            | Quem publica | Quem assina |
| --------------------------------- | ------------ | ----------- |
| `ftth/cto/fag-grupo01/telemetria` | ESP32        | Painel      |
| `ftth/cto/fag-grupo01/alertas`    | ESP32        | Painel      |
| `ftth/cto/fag-grupo01/respostas`  | ESP32        | Painel      |
| `ftth/cto/fag-grupo01/comandos`   | Painel       | ESP32       |

O navegador não abre conexões TCP diretas, por isso o painel usa MQTT sobre WebSocket
seguro (`wss://broker.hivemq.com:8884/mqtt`), enquanto o ESP32 usa MQTT puro na porta 1883.

Para usar outro broker sem mexer no código, copie o `.env.example` para `.env` e ajuste o endereço:

```
VITE_BROKER_URL=wss://seu-broker:porta/mqtt
```

O `.env` está no `.gitignore` e nunca vai para o repositório.

## Estrutura

```
src/
├── components/   header, statusBanner, card, grafico, comandos, eventos, button, footer
├── hooks/        useMqtt.ts — conexão, assinatura e envio de comandos
├── pages/        Painel.tsx — monta a página
├── styles/       um CSS por componente + variáveis globais (index.css)
├── assets/       ícones SVG
├── config.ts     broker, tópicos e limites (devem bater com o sketch.ino)
└── types.ts      formato das mensagens do ESP32
```

## Publicar no Netlify

1. Suba o projeto para um repositório no GitHub.
2. No Netlify, escolha **Add new site → Import an existing project** e selecione o repositório.
3. O `netlify.toml` já define o build (`npm run build`) e a pasta publicada (`dist`).

## Limitações

- O broker é público e sem autenticação: qualquer pessoa que conheça os tópicos pode ler
  os dados e enviar comandos. Serve apenas para a demonstração.
- O painel não guarda histórico: os gráficos mostram só o que chegou com a página aberta.
