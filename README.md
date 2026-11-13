# Protótipo de monitoramento de CTO via IoT

Sistema IoT que monitora remotamente uma caixa de atendimento óptico (CTO) de uma rede FTTH.
Um ESP32 instalado na caixa lê o estado da tampa, a temperatura e a umidade, envia os dados por
Wi-Fi e MQTT e recebe comandos da equipe técnica. Um painel web mostra tudo em tempo real.

Projeto da disciplina de Internet das Coisas — Engenharia de Software.

**Integrantes:** Wellington Davies dos Santos, Bruno Henrique da Silva e Flavio Antônio Schneider.

**Simulação no Wokwi:** https://wokwi.com/projects/479687845138019329

## Arquitetura

```
 ESP32 na CTO (Wokwi)            Broker MQTT                  Painel web
 DHT22 + botão + LED   ──────►  broker.hivemq.com  ──────►  React + MQTT.js
                       ◄──────   (4 tópicos)       ◄──────
   MQTT/TCP :1883                                   MQTT/WSS :8884
```

O ESP32 e o painel nunca se comunicam diretamente: os dois são clientes do mesmo broker e só
conhecem o endereço dele e os nomes dos tópicos.

| Camada        | Elementos                                                              |
| ------------- | ---------------------------------------------------------------------- |
| Percepção     | DHT22 (temperatura e umidade) e pushbutton (estado da tampa)           |
| Rede          | Wi-Fi do ESP32 e protocolo MQTT via broker público                     |
| Processamento | Firmware: leitura, comparação com limites, alertas e comandos          |
| Aplicação     | Painel web, LED RGB e monitor serial                                   |

## Estrutura do repositório

```
firmware/
├── sketch.ino               código do ESP32
├── diagram.json             circuito do Wokwi
├── libraries.txt            bibliotecas (PubSubClient, DHT sensor library for ESPx)
└── credenciais.example.h    modelo de credenciais (Wi-Fi e broker)
painel/                      painel web (React + TypeScript + Vite), ver painel/README.md
docs/
└── relatorio-tecnico.pdf    relatório do projeto
```

## Como executar

### 1. Firmware no Wokwi

1. Abra o projeto no Wokwi pelo link acima, ou crie um projeto ESP32 e cole os arquivos da pasta `firmware/`.
2. Clique em ▶ e aguarde no monitor serial a mensagem `[MQTT] ... conectado.`
3. Para simular, pressione o botão (tampa aberta) ou clique no DHT22 e mude temperatura e umidade.

### 2. Painel web

Requisitos: Node.js (LTS) e npm.

```bash
cd painel
npm install
npm run dev        # abre em http://localhost:5173
```

No Windows, também é possível dar dois cliques em `painel/iniciar-painel.bat`.

## Credenciais

Nenhuma credencial é versionada. Cada parte tem um arquivo de exemplo:

| Parte    | Exemplo (versionado)              | Arquivo real (ignorado pelo Git) |
| -------- | --------------------------------- | -------------------------------- |
| Firmware | `firmware/credenciais.example.h`  | `firmware/credenciais.h`         |
| Painel   | `painel/.env.example`             | `painel/.env`                    |

Sem os arquivos reais, o projeto usa os valores da simulação: rede `Wokwi-GUEST` e broker público
`broker.hivemq.com`, sem senha. Para usar outra rede ou um broker com autenticação, copie o exemplo
para o nome do arquivo real e preencha.

## Comunicação MQTT

| Tópico                            | Sentido         | Conteúdo                                     |
| --------------------------------- | --------------- | -------------------------------------------- |
| `ftth/cto/fag-grupo01/telemetria` | ESP32 → painel  | Leitura a cada 10 s e a cada mudança, em JSON |
| `ftth/cto/fag-grupo01/alertas`    | ESP32 → painel  | Tampa aberta/fechada, limites e normalização |
| `ftth/cto/fag-grupo01/comandos`   | Painel → ESP32  | Comandos da equipe técnica                   |
| `ftth/cto/fag-grupo01/respostas`  | ESP32 → painel  | Confirmação ou erro de cada comando          |

Exemplo de telemetria:

```json
{"cto":"CTO-001","temperatura":28.5,"umidade":65.0,"tampa":"fechada","status":"normal",
 "monitoramento":"ativo","sensor_ok":true,"limite_temp":40.0,"limite_umid":80.0}
```

Comandos aceitos (texto simples no tópico `comandos`):

| Comando       | Efeito                                      |
| ------------- | ------------------------------------------- |
| `status`      | Publica uma leitura atualizada              |
| `temp_max=45` | Altera o limite de temperatura (−40 a 80 °C) |
| `umid_max=85` | Altera o limite de umidade (0 a 100 %)      |
| `desativar`   | Suspende os alertas (LED azul)              |
| `ativar`      | Retoma os alertas                           |

## Indicação do LED RGB

| Cor      | Situação                                               |
| -------- | ------------------------------------------------------ |
| Verde    | Operação normal                                        |
| Vermelho | Tampa aberta ou temperatura/umidade acima do limite    |
| Azul     | Monitoramento desativado                               |

## Limitações

- Broker público, sem autenticação nem TLS: serve apenas para demonstração.
- O painel não guarda histórico; mostra o que chega com a página aberta.
- A PubSubClient publica apenas em QoS 0.
- A proposta original usava LoRaWAN; o protótipo usa Wi-Fi porque o laboratório não tem módulos LoRa, e representa uma única CTO.
