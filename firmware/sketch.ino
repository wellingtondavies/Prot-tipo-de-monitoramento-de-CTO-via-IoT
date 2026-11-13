/*
 * Sistema IoT de Monitoramento Inteligente de CTOs em Redes FTTH
 * Disciplina: Internet das Coisas (IoT) - Engenharia de Software - Centro Universitario FAG
 * Integrantes: Wellington Davies dos Santos, Bruno Henrique da Silva, Flavio Antonio Schneider
 *
 * Placa: ESP32 DevKit V1 (simulada no Wokwi)
 * Sensores: DHT22 (temperatura/umidade) e pushbutton (representa o contato magnetico da tampa)
 * Atuador/indicador: LED RGB de catodo comum
 * Comunicacao: Wi-Fi (Wokwi-GUEST) + MQTT (broker.hivemq.com:1883)
 *
 * Comandos aceitos no topico .../comandos (texto simples):
 *   status        -> publica uma leitura atualizada
 *   temp_max=45   -> altera o limite de temperatura (graus C)
 *   umid_max=85   -> altera o limite de umidade (%)
 *   desativar     -> suspende os alertas (LED azul)
 *   ativar        -> retoma os alertas
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include "DHTesp.h"

// ------------------------- Pinos -------------------------
const int PIN_DHT   = 15;   // DHT22 - dados (SDA). Obs.: no Wokwi o DHT22 nao responde no GPIO 4
const int PIN_TAMPA = 13;   // Pushbutton com pull-up interno: LOW = pressionado = tampa ABERTA
const int PIN_LED_R = 25;   // LED RGB - vermelho
const int PIN_LED_G = 26;   // LED RGB - verde
const int PIN_LED_B = 27;   // LED RGB - azul

// ------------------------- Rede e credenciais -------------
// As credenciais ficam em "credenciais.h", que NAO vai para o repositorio
// (esta no .gitignore). Para criar o seu, copie "credenciais.example.h".
// Sem o arquivo (como no Wokwi), valem os valores padrao abaixo.
#if __has_include("credenciais.h")
#include "credenciais.h"
#else
#define CRED_WIFI_SSID     "Wokwi-GUEST"
#define CRED_WIFI_SENHA    ""
#define CRED_MQTT_BROKER   "broker.hivemq.com"
#define CRED_MQTT_PORTA    1883
#define CRED_MQTT_USUARIO  ""
#define CRED_MQTT_SENHA    ""
#endif

const char* WIFI_SSID     = CRED_WIFI_SSID;
const char* WIFI_SENHA    = CRED_WIFI_SENHA;
const char* MQTT_BROKER   = CRED_MQTT_BROKER;
const uint16_t MQTT_PORTA = CRED_MQTT_PORTA;
const char* MQTT_USUARIO  = CRED_MQTT_USUARIO;   // vazio = broker sem autenticacao
const char* MQTT_SENHA    = CRED_MQTT_SENHA;

const char* CTO_ID = "CTO-001";

// Prefixo unico para evitar colisao com outros grupos no broker publico
#define TOPICO_BASE "ftth/cto/fag-grupo01"
const char* TOPICO_TELEMETRIA = TOPICO_BASE "/telemetria";
const char* TOPICO_ALERTAS    = TOPICO_BASE "/alertas";
const char* TOPICO_COMANDOS   = TOPICO_BASE "/comandos";
const char* TOPICO_RESPOSTAS  = TOPICO_BASE "/respostas";

// ------------------------- Tempos (ms) -------------------
const unsigned long INTERVALO_LEITURA_DHT = 2500;   // DHT22 exige no minimo 2 s entre leituras
const unsigned long INTERVALO_TELEMETRIA  = 10000;  // publicacao periodica
const unsigned long INTERVALO_RECONEXAO   = 5000;   // nova tentativa de conexao MQTT
const unsigned long DEBOUNCE_MS           = 50;     // filtro do botao
const uint16_t MQTT_KEEPALIVE_S           = 90;     // ver comentario no setup()
const int MAX_FALHAS_DHT                  = 5;      // falhas seguidas antes de declarar o sensor em falha

// ------------------------- Limites (configuraveis por MQTT) ---
// Valores ilustrativos do prototipo, nao especificacoes tecnicas de CTOs.
float limiteTemp = 40.0;
float limiteUmid = 80.0;

// ------------------------- Estado ------------------------
bool  monitoramentoAtivo = true;
float temperatura = NAN;
float umidade     = NAN;
bool  sensorOk    = false;
int   falhasSeguidasDHT = 0;
bool  tampaAberta = false;
bool  tempAlta    = false;
bool  umidAlta    = false;
const char* statusAtual = "";

bool leituraBrutaAnterior = false;
unsigned long ultimaMudancaBotao  = 0;
unsigned long ultimaLeituraDHT    = 0;
unsigned long ultimaTelemetria    = 0;
unsigned long ultimaTentativaMQTT = 0;
bool wifiConectadoAntes = false;

DHTesp dht;
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// =========================================================
// Utilitarios
// =========================================================

// Escreve um numero com 1 casa decimal ou "null" se nao houver leitura valida
void formatarNumero(char* destino, size_t tamanho, float valor, bool valido) {
  if (valido && !isnan(valor)) {
    snprintf(destino, tamanho, "%.1f", valor);
  } else {
    snprintf(destino, tamanho, "null");
  }
}

void definirLed(bool r, bool g, bool b) {
  // Catodo comum: HIGH acende a cor
  digitalWrite(PIN_LED_R, r ? HIGH : LOW);
  digitalWrite(PIN_LED_G, g ? HIGH : LOW);
  digitalWrite(PIN_LED_B, b ? HIGH : LOW);
}

const char* calcularStatus() {
  if (!monitoramentoAtivo) return "desativado";
  if (tampaAberta || tempAlta || umidAlta) return "alerta";
  return "normal";
}

void atualizarLed() {
  if (strcmp(statusAtual, "desativado") == 0) {
    definirLed(false, false, true);   // azul
  } else if (strcmp(statusAtual, "alerta") == 0) {
    definirLed(true, false, false);   // vermelho
  } else {
    definirLed(false, true, false);   // verde
  }
}

// =========================================================
// Publicacoes MQTT
// =========================================================

void publicarTelemetria() {
  ultimaTelemetria = millis();

  char temp[12], umid[12];
  formatarNumero(temp, sizeof(temp), temperatura, sensorOk);
  formatarNumero(umid, sizeof(umid), umidade, sensorOk);

  char json[320];
  snprintf(json, sizeof(json),
           "{\"cto\":\"%s\",\"temperatura\":%s,\"umidade\":%s,\"tampa\":\"%s\","
           "\"status\":\"%s\",\"monitoramento\":\"%s\",\"sensor_ok\":%s,"
           "\"limite_temp\":%.1f,\"limite_umid\":%.1f}",
           CTO_ID, temp, umid, tampaAberta ? "aberta" : "fechada",
           statusAtual, monitoramentoAtivo ? "ativo" : "desativado",
           sensorOk ? "true" : "false", limiteTemp, limiteUmid);

  if (mqtt.connected()) {
    mqtt.publish(TOPICO_TELEMETRIA, json);
    Serial.print("[TELEMETRIA] ");
  } else {
    Serial.print("[TELEMETRIA - MQTT offline] ");
  }
  Serial.println(json);
}

void publicarAlerta(const char* evento, const char* mensagem) {
  char temp[12], umid[12];
  formatarNumero(temp, sizeof(temp), temperatura, sensorOk);
  formatarNumero(umid, sizeof(umid), umidade, sensorOk);

  char json[320];
  snprintf(json, sizeof(json),
           "{\"cto\":\"%s\",\"evento\":\"%s\",\"mensagem\":\"%s\","
           "\"temperatura\":%s,\"umidade\":%s,\"tampa\":\"%s\"}",
           CTO_ID, evento, mensagem, temp, umid, tampaAberta ? "aberta" : "fechada");

  if (mqtt.connected()) {
    mqtt.publish(TOPICO_ALERTAS, json);
    Serial.print("[ALERTA] ");
  } else {
    Serial.print("[ALERTA - MQTT offline] ");
  }
  Serial.println(json);
}

void publicarResposta(const char* comando, bool ok, const char* detalhe) {
  char json[256];
  snprintf(json, sizeof(json),
           "{\"cto\":\"%s\",\"comando\":\"%s\",\"resultado\":\"%s\",\"detalhe\":\"%s\"}",
           CTO_ID, comando, ok ? "ok" : "erro", detalhe);
  if (mqtt.connected()) {
    mqtt.publish(TOPICO_RESPOSTAS, json);
  }
  Serial.print("[RESPOSTA] ");
  Serial.println(json);
}

// =========================================================
// Logica de monitoramento (camada de processamento)
// =========================================================

// Compara as leituras com os limites, gera alertas nas mudancas e atualiza o status
void avaliarCondicoes() {
  char msg[96];

  if (sensorOk) {
    bool novaTempAlta = temperatura > limiteTemp;
    if (novaTempAlta != tempAlta) {
      tempAlta = novaTempAlta;
      if (monitoramentoAtivo) {
        if (tempAlta) {
          snprintf(msg, sizeof(msg), "Temperatura %.1f C acima do limite de %.1f C", temperatura, limiteTemp);
          publicarAlerta("temperatura_alta", msg);
        } else {
          snprintf(msg, sizeof(msg), "Temperatura normalizada: %.1f C", temperatura);
          publicarAlerta("temperatura_normalizada", msg);
        }
      }
    }

    bool novaUmidAlta = umidade > limiteUmid;
    if (novaUmidAlta != umidAlta) {
      umidAlta = novaUmidAlta;
      if (monitoramentoAtivo) {
        if (umidAlta) {
          snprintf(msg, sizeof(msg), "Umidade %.1f%% acima do limite de %.1f%%", umidade, limiteUmid);
          publicarAlerta("umidade_alta", msg);
        } else {
          snprintf(msg, sizeof(msg), "Umidade normalizada: %.1f%%", umidade);
          publicarAlerta("umidade_normalizada", msg);
        }
      }
    }
  }

  const char* novoStatus = calcularStatus();
  if (strcmp(novoStatus, statusAtual) != 0) {
    statusAtual = novoStatus;
    atualizarLed();
    Serial.print("[STATUS] CTO agora esta: ");
    Serial.println(statusAtual);
    publicarTelemetria();   // envia imediatamente quando o status muda
  }
}

// Uma falha isolada do DHT22 nao descarta a ultima leitura valida.
// O sensor so e considerado em falha apos MAX_FALHAS_DHT leituras seguidas sem sucesso.
void lerDHT() {
  TempAndHumidity dados = dht.getTempAndHumidity();

  if (dht.getStatus() != DHTesp::ERROR_NONE || isnan(dados.temperature) || isnan(dados.humidity)) {
    falhasSeguidasDHT++;
    Serial.print("[DHT22] Falha na leitura (");
    Serial.print(dht.getStatusString());
    Serial.print(") - ");
    Serial.print(falhasSeguidasDHT);
    Serial.print("/");
    Serial.print(MAX_FALHAS_DHT);
    Serial.println(sensorOk ? ", mantendo a ultima leitura valida" : "");

    if (falhasSeguidasDHT >= MAX_FALHAS_DHT && sensorOk) {
      sensorOk = false;
      publicarAlerta("falha_sensor", "Sem leituras validas do DHT22");
    }
    return;
  }

  if (!sensorOk) {
    Serial.println("[DHT22] Leituras validas restabelecidas");
  }
  falhasSeguidasDHT = 0;
  temperatura = dados.temperature;
  umidade = dados.humidity;
  sensorOk = true;
}

// Leitura do botao com debounce por millis() (sem delay)
void lerTampa() {
  bool leituraBruta = (digitalRead(PIN_TAMPA) == LOW);   // pressionado = aberta

  if (leituraBruta != leituraBrutaAnterior) {
    leituraBrutaAnterior = leituraBruta;
    ultimaMudancaBotao = millis();
  }

  if ((millis() - ultimaMudancaBotao) > DEBOUNCE_MS && leituraBruta != tampaAberta) {
    tampaAberta = leituraBruta;
    if (monitoramentoAtivo) {
      if (tampaAberta) {
        publicarAlerta("tampa_aberta", "Abertura da tampa da CTO detectada");
      } else {
        publicarAlerta("tampa_fechada", "Tampa da CTO fechada");
      }
    } else {
      Serial.println(tampaAberta ? "[TAMPA] Aberta (monitoramento desativado)"
                                 : "[TAMPA] Fechada (monitoramento desativado)");
    }
    avaliarCondicoes();
  }
}

// =========================================================
// Comandos recebidos por MQTT
// =========================================================

// Converte texto em numero; retorna false se o texto nao for numerico
bool converterNumero(String texto, float& valor) {
  texto.replace(',', '.');
  const char* inicio = texto.c_str();
  char* fim;
  valor = strtof(inicio, &fim);
  return (fim != inicio && *fim == '\0');
}

void callbackMQTT(char* topico, byte* payload, unsigned int tamanho) {
  String comando;
  for (unsigned int i = 0; i < tamanho && i < 60; i++) {
    char c = (char)payload[i];
    if (c == '"' || c == '\\') c = '\'';   // evita quebrar o JSON da resposta
    comando += c;
  }
  comando.trim();
  comando.toLowerCase();

  Serial.print("[COMANDO] Recebido: ");
  Serial.println(comando);

  char detalhe[96];

  if (comando == "status") {
    // Usa a leitura mais recente: o DHT22 nao pode ser lido em intervalos menores que 2 s
    avaliarCondicoes();
    publicarResposta(comando.c_str(), true, "leitura atualizada publicada em telemetria");
    publicarTelemetria();
    return;
  }

  if (comando == "desativar") {
    monitoramentoAtivo = false;
    publicarResposta(comando.c_str(), true, "monitoramento desativado");
    avaliarCondicoes();
    return;
  }

  if (comando == "ativar") {
    monitoramentoAtivo = true;
    // Zera os indicadores para que condicoes ainda presentes gerem novos alertas
    tempAlta = false;
    umidAlta = false;
    publicarResposta(comando.c_str(), true, "monitoramento ativado");
    if (tampaAberta) {
      publicarAlerta("tampa_aberta", "Tampa da CTO aberta ao reativar o monitoramento");
    }
    avaliarCondicoes();
    return;
  }

  int separador = comando.indexOf('=');
  if (separador > 0) {
    String chave = comando.substring(0, separador);
    String valorTexto = comando.substring(separador + 1);
    chave.trim();
    valorTexto.trim();
    float valor;

    if (chave == "temp_max") {
      if (converterNumero(valorTexto, valor) && valor >= -40.0 && valor <= 80.0) {
        limiteTemp = valor;
        snprintf(detalhe, sizeof(detalhe), "limite de temperatura = %.1f C", limiteTemp);
        publicarResposta(comando.c_str(), true, detalhe);
        avaliarCondicoes();
        publicarTelemetria();
      } else {
        publicarResposta(comando.c_str(), false, "valor invalido (use -40 a 80)");
      }
      return;
    }

    if (chave == "umid_max") {
      if (converterNumero(valorTexto, valor) && valor >= 0.0 && valor <= 100.0) {
        limiteUmid = valor;
        snprintf(detalhe, sizeof(detalhe), "limite de umidade = %.1f%%", limiteUmid);
        publicarResposta(comando.c_str(), true, detalhe);
        avaliarCondicoes();
        publicarTelemetria();
      } else {
        publicarResposta(comando.c_str(), false, "valor invalido (use 0 a 100)");
      }
      return;
    }
  }

  publicarResposta(comando.c_str(), false,
                   "comando desconhecido (use status, temp_max=N, umid_max=N, ativar, desativar)");
}

// =========================================================
// Conexoes (nao bloqueantes)
// =========================================================

void verificarWiFi() {
  bool conectado = (WiFi.status() == WL_CONNECTED);
  if (conectado && !wifiConectadoAntes) {
    Serial.print("[WIFI] Conectado. IP: ");
    Serial.println(WiFi.localIP());
  } else if (!conectado && wifiConectadoAntes) {
    Serial.println("[WIFI] Conexao perdida, aguardando reconexao automatica...");
  }
  wifiConectadoAntes = conectado;
}

void verificarMQTT() {
  if (WiFi.status() != WL_CONNECTED || mqtt.connected()) return;
  if (millis() - ultimaTentativaMQTT < INTERVALO_RECONEXAO) return;
  ultimaTentativaMQTT = millis();

  // Client ID aleatorio para nao conflitar com outras sessoes no broker publico
  String clientId = "cto001-" + String((uint32_t)esp_random(), HEX);
  Serial.print("[MQTT] Conectando a ");
  Serial.print(MQTT_BROKER);
  Serial.print(" como ");
  Serial.print(clientId);
  Serial.print("... ");

  // Com usuario configurado, autentica no broker; sem usuario, conecta anonimo
  bool conectou = strlen(MQTT_USUARIO) > 0
                    ? mqtt.connect(clientId.c_str(), MQTT_USUARIO, MQTT_SENHA)
                    : mqtt.connect(clientId.c_str());

  if (conectou) {
    Serial.println("conectado.");
    mqtt.subscribe(TOPICO_COMANDOS);
    Serial.print("[MQTT] Assinando: ");
    Serial.println(TOPICO_COMANDOS);
    publicarTelemetria();
  } else {
    Serial.print("falhou (codigo ");
    Serial.print(mqtt.state());
    Serial.println("). Nova tentativa em 5 s.");
  }
}

// =========================================================
// Setup e loop
// =========================================================

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("=== Monitoramento Inteligente de CTO - FTTH ===");

  pinMode(PIN_TAMPA, INPUT_PULLUP);
  pinMode(PIN_LED_R, OUTPUT);
  pinMode(PIN_LED_G, OUTPUT);
  pinMode(PIN_LED_B, OUTPUT);
  definirLed(false, false, false);

  dht.setup(PIN_DHT, DHTesp::DHT22);

  tampaAberta = (digitalRead(PIN_TAMPA) == LOW);
  leituraBrutaAnterior = tampaAberta;

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_SENHA, 6);   // canal 6 acelera a conexao no Wokwi
  Serial.println("[WIFI] Conectando a Wokwi-GUEST...");

  mqtt.setServer(MQTT_BROKER, MQTT_PORTA);
  mqtt.setCallback(callbackMQTT);
  mqtt.setBufferSize(512);   // o padrao (256 bytes) e pequeno para o JSON de telemetria
  // O Wokwi costuma rodar abaixo da velocidade real (ex.: 17%). O keep-alive padrao de 15 s
  // e contado no tempo simulado, mas o broker conta no tempo real e derruba a conexao.
  // Um keep-alive maior evita as reconexoes repetidas.
  mqtt.setKeepAlive(MQTT_KEEPALIVE_S);

  avaliarCondicoes();   // define o status inicial e a cor do LED
}

void loop() {
  verificarWiFi();
  verificarMQTT();
  mqtt.loop();

  lerTampa();

  if (millis() - ultimaLeituraDHT >= INTERVALO_LEITURA_DHT) {
    ultimaLeituraDHT = millis();
    lerDHT();
    avaliarCondicoes();
  }

  if (millis() - ultimaTelemetria >= INTERVALO_TELEMETRIA) {
    publicarTelemetria();
  }

  delay(10);   // pausa curta: alivia a simulacao sem prejudicar o botao (debounce de 50 ms)
}
