require('dotenv').config();

const { downloadVideo, convertVideo, convertMp4ToGif } = require('./videoUtils.js');
const wppconnect = require('@wppconnect-team/wppconnect');
const vosk = require('vosk');
const ytdl = require('@distube/ytdl-core');
const probe = require('probe-image-size');
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { execSync } = require('child_process');


if (!process.env.SESSION_NAME) throw new Error('[ERROR] O nome da sessão não foi encontrado no arquivo .env.');
if (!process.env.MY_CELL_NUM) throw new Error('[ERROR] O número de telefone não foi encontrado no arquivo .env.');
if (!process.env.MSG_TO) throw new Error('[ERROR] O número de telefone de destinário não foi encontrado no arquivo .env.');
if (!process.env.ENDPOINT_URL) throw new Error('[ERROR] A URL do endpoint não foi encontrada no arquivo .env.');
if (!process.env.AUTH_KEY) throw new Error('[ERROR] A chave de autorização do endpoint não foi encontrada no arquivo .env.');
if (!process.env.MODEL_SELECTED) throw new Error('[ERROR] O modelo selecionado não foi encontrado no arquivo .env.');

vosk.setLogLevel(0);
const model = new vosk.Model('model/vosk-model-small-pt-0.3');

wppconnect
    .create({
        session: process.env.SESSION_NAME,
        autoClose: false,
        deviceName: process.env.SESSION_NAME,
        phoneNumber: process.env.MY_CELL_NUM,
        catchLinkCode: (code) => console.log(`[INFO] Código de acesso: ${code}\n`),
        statusFind: (statusSession, session) => console.log(`[INFO] Status da sessão: ${statusSession}`),
        onLoadingScreen: (percent, message) => console.log(`[INFO] Carregando: ${percent}% - ${message}`),
        puppeteerOptions: {
            headless: true,
            protocolTimeout: 120000, // representa 120 segundos ou 2 minutos
        },
    })
    .then(client => start(client))
    .catch(error => console.error('[ERROR] Erro ao iniciar o cliente:', error));

function start(client) {
    client.setOnlinePresence(false);

    client.onStateChange((state) => {
        console.info(`[INFO] Sessão atualizada: o estado foi alterado para "${state}".`);

        if (state === 'DISCONNECTED' || state === 'CONFLICT') {
            console.warn('[WARN] Sessão desconectada ou em conflito. Tentando reconectar...');
            client.forceRefocus();
        }
    });

    client.onIncomingCall(async (call) => {
        const contact = await client.getContact(call.peerJid);
        console.log(`${new Date().toLocaleTimeString('pt-BR')} | [INFO] Chamada recebida de ${contact.name || call.peerJid}`);

        if (!call.isVideo) {
            try {
                await client.rejectCall(call.id, call.peerJid);
                console.log('[SUCCESS] Chamada de voz recusada com sucesso!');
            } catch (err) {
                console.error('[ERROR] Erro ao recusar chamada:', err.message || err);
            }
        }
    });

    client.onAnyMessage(async (message) => {
        // console.log(`${new Date().toLocaleTimeString('pt-BR')} | [DEBUG] Mensagem recebida:`, message);

        if (message.from === process.env.MSG_TO && message.type === 'chat' && message.body.trim() === '!test') {
            const testMsg = '> Mensagem de Teste\n' +
                '_O bot está funcionando corretamente!_\n' +
                '_Seu comando foi reconhecido com sucesso e esta mensagem confirma que tudo está operando como esperado._';

            await client.sendText(message.to, testMsg)
                .then(() => console.log('[SUCCESS] Mensagem de teste enviada com sucesso.'))
                .catch(error => console.error('[ERROR] Erro ao enviar mensagem de teste.\nError:', error.message || error));
        }

        if (message.from !== process.env.MSG_TO && message.type !== 'gp2' && message.type !== 'call_log' && message.type !== 'ciphertext' && message.chatId !== 'status@broadcast' && !message.chatId.includes('@newsletter') && message.chatId.split('@')[0].length <= 12) {
            console.log(`${new Date().toLocaleTimeString('pt-BR')} | [INFO] Nova mensagem de ${message.sender.name} (${message.from}): '${(message.body.length > 170 ? message.body.slice(0, 170) + '...' : message.body)}' | Tipo: ${message.type}`);

            const isCaption = message.caption && typeof message.caption === 'string';

            if (message.to === process.env.MSG_TO && message.type === 'chat' && message.body.includes('!bot')) {
                const botMsg = '> 🤖 Lista de comandos do bot:\n' +
                    '_Use os comandos abaixo para interagir com o bot. É fácil e divertido!_\n\n' +
                    '📌 _*Comandos disponíveis:*_\n\n' +
                    '■ _*!bot* – Mostra todos os comandos disponíveis._\n' +
                    '■ _*!chat [pergunta]* – Faça qualquer pergunta e receba uma resposta em texto da assistente de IA._\n' +
                    '   _Exemplo: `!chat Quem inventou a internet?`_\n' +
                    '■ _*!ebook [nome do livro]* – Receba um eBook em PDF com base no nome informado._\n' +
                    '   _Exemplo: `!ebook Aprendendo JavaScript`_\n' +
                    '■ _*!fercaetano* – Receba o link do meu portfólio, projetos e experiências profissionais._\n' +
                    '■ _*!traduzir [idioma] [texto]* – Traduza qualquer texto para o idioma desejado._\n' +
                    '   _Exemplo: `!traduzir en Preciso estudar inglês para me tornar um desenvolvedor`_\n' +
                    '■ _*!sticker* – Envie uma imagem ou GIF com a legenda `!sticker` para transformar em figurinha._\n' +
                    '■ _*!sticker [URL da imagem]* – Envie uma URL de imagem/GIF para gerar uma figurinha automaticamente._\n' +
                    //'   _Exemplo: `!sticker https://media.tenor.com/sd1/f8hj.gif`_\n' +
                    '■ _*!gif* – Envie um vídeo curto com a legenda `!gif` para transformá-lo em um GIF animado._\n' +
                    '■ _*!yt [link do YouTube]* – Envia um link de um vídeo curto do YouTube e receba o vídeo._\n' +
                    //'   _Exemplo: `!yt https://www.youtube.com/watch?v=T5fkH6JcH28`_\n' +
                    '■ _*Áudio (sem comando)* – Basta enviar um áudio para receber a transcrição do que foi falado._\n\n' +
                    '⚡ _Experimente os comandos e aproveite ao máximo!_ 🚀';

                await client.sendText(message.from, botMsg);
            }

            if (message.to === process.env.MSG_TO && message.type === 'chat' && message.body.includes('!chat')) {
                const msgPrompt = message.body.replace(/^!chat\s*/, '');
                if (!msgPrompt) return await client.sendText(message.from, '> Ops! Ocorreu um erro!:\n_Por favor, forneça uma pergunta para a IA._');

                try {
                    const response = await fetch(process.env.ENDPOINT_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': process.env.AUTH_KEY,
                        },
                        body: JSON.stringify({
                            'model': process.env.MODEL_SELECTED,
                            'messages': [{
                                    'role': 'system',
                                    'content': 'Você é um assistente do Fernando Caetano que responde de forma clara e objetiva, fornecendo textos de tamanho médio e fáceis de entender.'
                                },
                                {
                                    'role': 'user',
                                    'content': msgPrompt
                                }
                            ]
                        })
                    });

                    const data = await response.json();
                    if (data.choices && data.choices.length > 0) {
                        const resposta = data.choices[0].message.content;
                        console.log('[SUCCESS] Resposta da assistente de IA:', resposta);
                        await client.sendText(message.from, `> Resposta da assistente de IA:\n${resposta.trim().replaceAll('**', '*').split('\n').map(linha => linha.trim() === '' ? linha : `_${linha.trim()}_`).join('\n')}`);
                    } else {
                        console.error('[ERROR] Nenhuma escolha de resposta encontrada!\nError:', data);
                        await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Desculpe, ocorreu um erro ao processar sua mensagem._');
                    }
                } catch (error) {
                    console.error('[ERROR] Erro ao chamar a API!\nError:', error.message || error);
                    await client.sendText(message.from, '> Ops! Ocorreu um erro inesperado!\n_Desculpe, não conseguimos processar sua mensagem._');
                }
            }

            if (message.to === process.env.MSG_TO && message.type === 'chat' && message.body.includes('!ebook')) {
                const rawName = message.body.replace('!ebook', '').trim();
                if (!rawName) {
                    console.warn('[WARN] Nenhum nome de arquivo fornecido pelo usuário.');
                    return await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Por favor, informe o nome do ebook após o comando._\n_Exemplo: `!ebook Bem-vindo ao mundo Node.js`_');
                }

                const fileName = rawName.concat('.pdf');
                const filePath = path.join(__dirname, 'documents', fileName);
                if (!fs.existsSync(filePath)) {
                    console.error('[ERROR] Arquivo de documento não encontrado.');
                    return await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Desculpe, o documento solicitado não foi encontrado._');
                }

                console.log('[INFO] Iniciando envio de documento.');
                await client.sendFile(message.from, filePath, fileName, 'Segue o documento solicitado.').then(() => {
                    console.log('[SUCCESS] Documento enviado com sucesso!');
                }).catch(async (error) => {
                    let userMessage = '';
                    if (error.code === 'ENOENT') {
                        console.error('[ERROR] Arquivo de documento não encontrado.');
                        userMessage = '> Ops! Ocorreu um erro!\n_Desculpe, o documento solicitado não foi encontrado._';
                    } else if (error.code === 'EBUSY') {
                        console.error('[ERROR] Arquivo está ocupado ou bloqueado.');
                        userMessage = '> Ops! Ocorreu um erro!\n_O documento está temporariamente indisponível. Por favor, tente novamente em alguns instantes._';
                    } else {
                        console.error('[ERROR] Falha ao enviar documento!\nError:', error);
                        userMessage = '> Ops! Ocorreu um erro!\n_Desculpe, ocorreu um erro ao enviar o documento. Por favor, tente novamente mais tarde._';
                    }
                    await client.sendText(message.from, userMessage);
                });
            }

            if (message.to === process.env.MSG_TO && message.type === 'chat' && message.body.includes('!fercaetano')) {
                await client.sendLinkPreview(message.from, 'https://fercaetano.vercel.app/', 'Conheça meu portfólio! Acesse o link para ver meus projetos, experiências e habilidades em desenvolvimento.');
            }

            if (message.to === process.env.MSG_TO && message.type === 'video' && isCaption && message.caption.includes('!gif')) {
                const mediaBuffer = await client.decryptFile(message);
                const base64Gif = mediaBuffer.toString('base64');

                await client.sendVideoAsGifFromBase64(message.from, `data:${message.mimetype};base64,${base64Gif}`).then(() => {
                    console.log('[SUCCESS] GIF enviado com sucesso!');
                }).catch((error) => {
                    console.error(`[ERROR] Falha ao enviar GIF!\nError:`, error);
                });
            }

            if (message.to === process.env.MSG_TO && message.type === 'chat' && message.body.includes('!sticker')) {
                const url = message.body.match(/https?:\/\/\S+/)?.[0];

                if (url) {
                    console.log(`[INFO] URL detectada: ${url}`);
                    try {
                        const result = await probe(url);
                        if (result && result.type === 'gif') {
                            if (result.width <= 512 && result.height <= 512) {
                                console.log(`[INFO] Enviando GIF como sticker...`);
                                await client.sendImageAsStickerGif(message.from, url).then(() => {
                                    console.log('[SUCCESS] GIF como sticker enviado com sucesso!');
                                }).catch((error) => {
                                    console.error('[ERROR] Falha ao enviar o sticker!\nError:', error);
                                });
                            } else {
                                console.error('[ERROR] O GIF enviado tem dimensões muito grandes para ser enviado como sticker.\nLimite: até 512x512 pixels.');
                                await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_O GIF tem dimensões muito grandes para ser enviado como sticker._\n_Limite: até 512x512 pixels._');
                            }
                        } else {
                            console.log('[INFO] Enviando sticker...');
                            await client.sendImageAsSticker(message.from, url).then(() => {
                                console.log('[SUCCESS] Sticker enviado com sucesso!');
                            }).catch((error) => {
                                console.error('[ERROR] Falha ao enviar o sticker!\nError:', error);
                            });
                        }
                    } catch (error) {
                        console.error('[ERROR] Erro ao verificar a URL enviada.\nError:', error);
                        await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Desculpe, a validação da URL enviada é inválida._');
                    }
                } else {
                    console.warn('[WARN] Nenhuma URL encontrada na mensagem para processar como sticker.');
                    await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Por favor, envie uma URL válida_');
                }
            }

            if (message.to === process.env.MSG_TO && isCaption && message.caption.includes('!sticker')) {
                if (message.type === 'image') {
                    console.log('[INFO] Iniciando processamento da imagem...');
                    const mediaBuffer = await client.decryptFile(message);
                    const base64Gif = mediaBuffer.toString('base64');

                    console.log('[INFO] Enviando imagem como sticker...');
                    await client.sendImageAsSticker(message.from, `data:${message.mimetype};base64,${base64Gif}`).then(() => {
                        console.log('[SUCCESS] Imagem com sticker enviada com sucesso!');
                    }).catch((error) => {
                        console.error('[ERROR] Falha ao enviar sticker da imagem!\nError:', error);
                    });
                } else if (message.type === 'video' && message.isGif === true) {
                    console.log('[INFO] Iniciando download do video...');
                    const mediaData = await client.downloadMedia(message);
                    const mimeType = message.mimetype;
                    const extension = mimeType.split('/')[1];
                    const filename = `media_${Date.now()}.${extension}`;
                    const savePath = `./video/${filename}`;
                    const videoDir = './video';

                    if (!fs.existsSync(videoDir)) {
                        console.log('[INFO] Pasta ./video/ não existe, criando...');
                        fs.mkdirSync(videoDir, {
                            recursive: true
                        });
                    }

                    console.log('[INFO] Salvando arquivo temporário...');
                    const base64Data = mediaData.replace(/^data:.*;base64,/, '');
                    const mediaBuffer = Buffer.from(base64Data, 'base64');

                    fs.writeFileSync(savePath, mediaBuffer);
                    console.log(`[SUCCESS] Arquivo salvo em: ${savePath}`);

                    console.log('[INFO] Iniciando conversão de vídeo para GIF...');
                    const fileGif = savePath.replace('.mp4', '.gif');
                    await convertMp4ToGif(savePath, fileGif);

                    if (!fs.existsSync(fileGif) || fs.statSync(fileGif).size === 0) {
                        console.error('[ERROR] Arquivo GIF convertido inválido ou não encontrado');
                        return await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Desculpe, ocorreu um erro e tente novamente mais tarde._');
                    }

                    const stats = fs.statSync(fileGif);
                    const sizeMB = stats.size / (1024 * 1024);
                    console.log(`[INFO] Tamanho do GIF convertido: ${sizeMB.toFixed(2)} MB`);

                    if (sizeMB > 1.5) {
                        console.error(`[ERROR] GIF excede limite de tamanho (${sizeMB.toFixed(2)} MB). Cancelando envio.`);
                        return await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Limite de tamanho do gif excedido! Envie outro gif menor!_');
                    }

                    console.log('[INFO] Enviando GIF como sticker...');
                    await client.sendImageAsStickerGif(message.from, fileGif).then(() => {
                        console.log('[SUCCESS] GIF como sticker enviado com sucesso!');
                    }).catch(async (error) => {
                        if (message.error.includes('Maximum call stack size exceeded')) {
                            console.error('[ERRO] Tamanho máximo da pilha excedido ao enviar GIF como sticker:', error);
                            await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Desculpe, houve um problema ao enviar o sticker GIF devido a um erro interno. Tente novamente mais tarde._');
                        } else {
                            console.error('[ERROR] Falha ao enviar GIF como sticker:', error);
                            await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Desculpe, ocorreu um erro e tente novamente mais tarde._');
                        }
                    });

                    await Promise.all([
                        fs.existsSync(savePath) ? fsPromises.unlink(savePath).then(() => console.log(`[SUCCESS] Arquivo ${savePath} removido com sucesso!`)).catch(err => console.error(`[ERROR] Falha ao remover ${savePath}:`, err)) : null,
                        fs.existsSync(fileGif) ? fsPromises.unlink(fileGif).then(() => console.log(`[SUCCESS] Arquivo ${fileGif} removido com sucesso!`)).catch(err => console.error(`[ERROR] Falha ao remover ${fileGif}:`, err)) : null
                    ]);
                }
            }

            if (message.to === process.env.MSG_TO && message.type === 'chat' && message.body.includes('!traduzir ')) {
                const lang = message.body.split(' ')[1];
                const text = message.body.split(' ').splice(2).join(' ');

                if (!lang || !text) {
                    console.log('[ERROR] Formato inválido. Use: !traduzir [idioma] [texto]');
                    return await client.sendText(message.from, `> Formato inválido\n_Use: !traduzir [idioma] [texto]_`);
                }

                const url = `https://lingva.ml/api/v1/auto/${encodeURIComponent(lang)}/${encodeURIComponent(text)}`;

                try {
                    const res = await fetch(url);
                    const data = await res.json();

                    if (data.translation) {
                        console.log(`[SUCCESS] Tradução bem-sucedida:\n${data.translation}`);
                        await client.sendText(message.from, `> Tradução bem-sucedida!\n${data.translation.split('\n').map(linha => linha.trim() === '' ? linha : `_${linha.trim()}_`).join('\n')}`);
                    } else if (data.error === 'Not Found') {
                        console.log('[ERROR] Não foi possível encontrar o conteúdo para traduzir.');
                        await client.sendText(message.from, `> Não encontrado!\n_Não foi possível encontrar o conteúdo para traduzir._`);
                    } else if (data.error === 'Invalid target language') {
                        console.log('[ERROR] Código de idioma inválido. Verifique se usou algo como "en", "es", "fr", etc.');
                        await client.sendText(message.from, `> Código de idioma inválido\n_Verifique se usou algo como "*en*", "*es*", "*fr*", etc._`);
                    } else {
                        console.log('[ERROR] Ocorreu um erro inesperado durante a tradução.');
                        await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Desculpe, ocorreu um erro ao processar sua mensagem._');
                    }
                } catch (error) {
                    console.error('[ERROR] Erro ao tentar se conectar ao serviço de tradução:', error.message || error);
                    await client.sendText(message.from, '> Ops! Ocorreu um erro inesperado!\n_Desculpe, não conseguimos processar sua mensagem._');
                }
            }

            if (message.to === process.env.MSG_TO && message.type === 'chat' && message.body.includes('!yt ')) {
                const url = message.body.match(/https?:\/\/\S+/)?.[0];

                if (!ytdl.validateURL(url)) {
                    console.log('[ERROR] A URL do YouTube não pôde ser validada, pois o link parece estar incorreto ou é inválido.');
                    return await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_A URL do YouTube fornecida é inválida. Por favor, confira o link e tente novamente._');
                }

                const info = await ytdl.getInfo(url);
                const videoTitle = info.videoDetails.title || '';
                const fileName = videoTitle.replace(/[^a-zA-Z0-9\s.-]/g, '').replace(/\s+/g, '').slice(0, 20);
                const videoDir = 'yt';

                const tempPath = path.join(__dirname, videoDir, `${fileName}.mp4`);
                const outputPath = path.join(__dirname, videoDir, `${fileName}_converted.mp4`);

                if (!fs.existsSync(path.join(__dirname, videoDir))) {
                    console.log('[INFO] Pasta ./yt/ não existe, criando...');
                    fs.mkdirSync(path.join(__dirname, videoDir), { recursive: true });
                }

                console.log(`[INFO] Baixando vídeo:\n- Título: ${videoTitle}\n- URL: ${url}`);
                try {
                    await downloadVideo(url, tempPath);
                } catch (error) {
                    if (error.message.includes('Status code: 403') || error.statusCode === 403) {
                        console.error('[ERROR] Vídeo com restrição de acesso (403):', error.message);
                        return await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_O vídeo está restrito. Tente outro vídeo ou verifique as permissões._');
                    } else {
                        console.error('[ERROR] Erro ao baixar o vídeo:', error);
                        return await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Erro ao baixar o vídeo. Tente novamente mais tarde._');
                    }
                };

                if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
                    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
                    throw new Error('[ERROR] Arquivo baixado inválido ou vazio.');
                }

                console.log(`[INFO] Convertendo vídeo...`);
                await convertVideo(tempPath, outputPath);

                if (!fs.existsSync(outputPath)) {
                    throw new Error('[ERROR] Arquivo convertido não encontrado.');
                }

                const stats = fs.statSync(outputPath);
                const fileSizeInMB = stats.size / (1024 * 1024);

                if (fileSizeInMB > 100) {
                    console.warn(`[WARN] O vídeo excede o limite de tamanho de 100 MB (${fileSizeInMB.toFixed(2)} MB).`);
                    await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_O vídeo excede o limite de tamanho de 100 MB. Tente outro vídeo com menor duração._');
                } else {
                    // const videoBuffer = fs.readFileSync(outputPath);
                    // const videoBase64 = videoBuffer.toString('base64');

                    // console.log(`[INFO] Iniciando envio do vídeo...`);
                    // const startTime = Date.now();
                    // await client.sendFileFromBase64(message.from, `data:video/mp4;base64,${videoBase64}`, 'video.mp4', videoTitle).then(() => {
                    //     console.log(`[SUCCESS] Vídeo enviado com sucesso em ${(Date.now() - startTime) / 1000} segundos.`);
                    // }).catch(error => {
                    //     console.error(`[ERROR] Erro ao enviar o vídeo em ${(Date.now() - startTime) / 1000} segundos:`, error);
                    //     client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Erro ao enviar o vídeo. Tente novamente mais tarde._');
                    // });

                    console.log(`[INFO] Iniciando envio do vídeo...`);
                    const startTime = Date.now();
                    await client.sendFile(message.from, outputPath, 'video.mp4', videoTitle).then(() => {
                        console.log(`[SUCCESS] Vídeo enviado com sucesso em ${(Date.now() - startTime) / 1000} segundos.`);
                    }).catch(async (error) => {
                        console.error(`[ERROR] Erro ao enviar o vídeo em ${(Date.now() - startTime) / 1000} segundos:`, error);
                        await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Erro ao enviar o vídeo. Tente novamente mais tarde._');
                    });
                }

                await Promise.all([
                    fs.existsSync(tempPath) ? fsPromises.unlink(tempPath).then(() => console.log(`[SUCCESS] Arquivo ${tempPath} removido com sucesso!`)).catch(err => console.error(`[ERROR] Falha ao remover ${tempPath}:`, err)) : null,
                    fs.existsSync(outputPath) ? fsPromises.unlink(outputPath).then(() => console.log(`[SUCCESS] Arquivo ${outputPath} removido com sucesso!`)).catch(err => console.error(`[ERROR] Falha ao remover ${outputPath}:`, err)) : null
                ]);
            }

            if (message.to === process.env.MSG_TO && (message.type === 'ptt' || message.type === 'audio')) {
                console.log(`[INFO] ${message.sender.name} (${message.from}) enviou um áudio de ${message.duration} ${message.duration > 1 ? 'segundos' : 'segundo'}.`);

                const duration = parseInt(message.duration) || 0;
                if (duration < 1) return await client.sendText(message.from, '> Ops! Ocorreu um erro!\n_Áudio muito curto para transcrição._');

                await client.sendText(message.from, '> Processando transcrição\n_Estou processando a transcrição do áudio em texto..._');

                const recognizer = new vosk.Recognizer({ model, sampleRate: 16000 });
                const opusPath = 'audio_temp.opus';
                const wavPath = 'audio_temp.wav';

                try {
                    const mediaBuffer = await client.decryptFile(message);
                    fs.writeFileSync(opusPath, mediaBuffer);
                    execSync(`ffmpeg -i ${opusPath} -acodec pcm_s16le -ar 16000 ${wavPath} -y`, { stdio: 'ignore' });
                    const audioData = fs.readFileSync(wavPath);
                    recognizer.acceptWaveform(audioData);
                    const transcript = recognizer.result().text || 'Não foi possível transcrever';
                    console.log('[SUCCESS] Transcrição concluída:', transcript);

                    await client.sendText(message.from, `> A transcrição foi concluída!\n_${transcript.trim()}_`);

                    recognizer.free();
                    await Promise.all([
                        fs.existsSync(opusPath) ? fsPromises.unlink(opusPath).then(() => console.log(`[SUCCESS] Arquivo ${opusPath} removido com sucesso!`)).catch(err => console.error(`[ERROR] Falha ao remover ${opusPath}:`, err)) : null,
                        fs.existsSync(wavPath) ? fsPromises.unlink(wavPath).then(() => console.log(`[SUCCESS] Arquivo ${wavPath} removido com sucesso!`)).catch(err => console.error(`[ERROR] Falha ao remover ${wavPath}:`, err)) : null
                    ]);
                } catch (error) {
                    console.error('[ERROR] Erro ao processar o áudio:', error);
                    let errorMsg = 'Erro ao processar o áudio.';
                    if (error.message && error.message.includes('ffmpeg')) {
                        errorMsg = 'Erro ao converter o áudio.';
                    } else if (error.message && error.message.includes('vosk')) {
                        errorMsg = 'Erro ao transcrever o áudio.';
                    }
                    await client.sendText(message.from, `> Ops! Ocorreu um erro!\n_${errorMsg}_`);
                }
            }
        }
    });
};