<h1 align="center">botWhatsApp</h1>

<img src="https://lh3.googleusercontent.com/pw/AP1GczMryvyUyCUeELEMNl_G042huhCGVIA6GhPx_z_4c9zrj35GEYAqtUrnTPEfAmxgZ0nTXN_dX8HvvQSgvrgPXQUkvXnIFsWEBhNJRfE-VjDTicd6CNN3hzx-LcL7Mr7sVa8-I2-6cudCCRRKFhQCSn04Hg=w600-h338-s-no-gm" align="right" width="400">

Este projeto é um bot automatizado para WhatsApp, desenvolvido com a biblioteca [WppConnect](https://github.com/wppconnect-team/wppconnect) em Node.js, que responde a comandos dos usuários e executa diversas funções, como transcrição de áudios, interação com inteligência artificial, tradução de textos, envio de documentos em PDF, criação de figurinhas a partir de imagens ou GIFs, conversão de vídeos, incluindo vídeos do YouTube.

### Comandos Detalhados

Os comandos disponíveis no bot são listados abaixo, com detalhes sobre o processamento:

| Comando | Ação |
|---------|------|
| `!bot` | Envia uma mensagem com a lista de comandos disponíveis, definida na variável `botMsg`. |
| `!chat [pergunta]` | Faz uma chamada à API de IA configurada no `.env` (via `ENDPOINT_URL`) e retorna a resposta em texto. |
| `!ebook [nome]` | Busca um arquivo PDF na pasta `documents/` com o nome especificado e o envia como documento. |
| `!fercaetano` | Envia um link com visualização prévia do portfólio do desenvolvedor (`https://fercaetano.vercel.app/`). |
| `!gif` | Descriptografa o vídeo enviado, converte para base64 e envia como GIF usando `sendVideoAsGifFromBase64`. |
| `!test` | Envia uma mensagem `!test` para o próprio número (definido em `MSG_TO` no `.env`) confirmando que o bot está ativo, reconhecendo comandos e funcionando corretamente. |
| `!traduzir [idioma] [texto]` | Faz uma requisição à API de tradução (`lingva.ml`) para traduzir o texto para o idioma especificado. |
| `!sticker` | Descriptografa a imagem ou GIF enviado, converte para o formato de figurinha e envia usando `sendImageAsSticker` ou `sendImageAsStickerGif`. |
| `!sticker [URL]` | Valida a URL com `probe`, verifica dimensões (máximo 512x512 para GIFs) e envia diretamente como figurinha usando `sendImageAsSticker` ou `sendImageAsStickerGif`. |
| `!yt [URL]` | Baixa o vídeo do YouTube com `ytdl`, converte para MP4 com FFmpeg (via `convertVideo` em `videoUtils.js`), e envia se for menor que 100 MB. |
| `Áudio` | Descriptografa o áudio, converte para WAV com FFmpeg, processa com o modelo Vosk (`vosk-model-small-pt-0.3`) e retorna a transcrição em texto. |

### Pré-requisitos

- Node.js (versão 18 ou superior).
- FFmpeg instalado no sistema (para conversão de áudio, gif e vídeo).
- Conta no WhatsApp para vinculação.
- Chave de API para integração com IA (configurada no `.env`).
- Modelo Vosk para transcrição de áudio (`vosk-model-small-pt-0.3`).

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/FerdiCayet/botWhatsApp.git
   cd botWhatsApp
   ```
2. Instale as dependências:
    ```bash
    npm install
    ```
    **Nota**: O pacote `@wppconnect-team/wppconnect` recebe atualizações frequentes. Para garantir a versão mais recente, execute:
    ```bash
    npm install @wppconnect-team/wppconnect@latest
    ```
    Se o projeto já está configurado, atualize a dependência com o mesmo comando.

3. Crie um arquivo .env na raiz do projeto e configure as variáveis:
    ```env
    SESSION_NAME=nome-da-sessao
    MY_CELL_NUM=seu-numero-de-telefone
    MSG_TO=numero-destino
    ENDPOINT_URL=url-do-endpoint-da-ia
    AUTH_KEY=chave-de-autorizacao
    MODEL_SELECTED=modelo-da-ia
    ```

4. [Baixe](https://alphacephei.com/vosk/models) e extraia o modelo Vosk (`vosk-model-small-pt-0.3`) na pasta `model/`.
5. Instale o FFmpeg:
   - No Ubuntu: `sudo apt-get install ffmpeg`
   - No macOS: `brew install ffmpeg`
   - No Windows: [Baixe do site oficial](https://ffmpeg.org/download.html#build-windows) e adicione ao PATH.

###  Uso

1. Inicie o bot:
    ```bash
    node botWhatsApp.js
    ```
2. Vincule o dispositivo ao WhatsApp:
    No WhatsApp, acesse **Configurações** > **Dispositivos vinculados** > **Vincular um dispositivo** > **Conectar com número de telefone**.
    Insira o código de acesso exibido no console do terminal (ex.: `[INFO] Código de acesso: 2468ZXYK`).
3. Envie mensagens com os comandos (ex.: `!bot`, `!test`) para o número configurado.

### Estrutura do Projeto

- `botWhatsApp.js`: Arquivo principal do bot.
- `videoUtils.js`: Funções auxiliares para manipulação de vídeos.
- `documents/`: Pasta para documentos PDF (usada pelo comando !ebook).
- `model/`: Pasta para o modelo Vosk de transcrição.
- `video/`: Pasta temporária para vídeos processados.
- `yt/`: Pasta temporária para vídeos do YouTube.