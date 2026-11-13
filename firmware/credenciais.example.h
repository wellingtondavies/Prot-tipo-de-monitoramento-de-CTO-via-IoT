// Exemplo de credenciais do firmware.
//
// Como usar:
//   1. Copie este arquivo para "credenciais.h", na mesma pasta do sketch.ino.
//   2. Preencha com os dados da sua rede e do seu broker.
//   3. Nunca envie o credenciais.h para o GitHub (ele ja esta no .gitignore).
//
// Sem o credenciais.h, o sketch usa os valores padrao da simulacao
// (rede Wokwi-GUEST e broker publico broker.hivemq.com, sem senha).

#pragma once

// Rede Wi-Fi
#define CRED_WIFI_SSID     "nome-da-sua-rede"
#define CRED_WIFI_SENHA    "senha-da-sua-rede"

// Broker MQTT
#define CRED_MQTT_BROKER   "broker.hivemq.com"
#define CRED_MQTT_PORTA    1883

// Autenticacao no broker (deixe vazio para broker sem senha)
#define CRED_MQTT_USUARIO  ""
#define CRED_MQTT_SENHA    ""
