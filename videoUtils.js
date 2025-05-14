const ytdl = require("@distube/ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

async function cleanPlayerScriptFiles() {
    const directory = process.cwd();
    const pattern = /-player-script\.js$/;

    const delay = Math.floor(1000 + Math.random() * 1000);
    await new Promise((resolve) => setTimeout(resolve, delay));

    fs.readdirSync(directory).forEach((file) => {
        if (pattern.test(file)) {
            try {
                fs.unlinkSync(path.join(directory, file));
                console.log(`[SUCCESS] Arquivo de erro excluído: ${file}`);
            } catch (err) {
                console.error(
                    `[ERROR] Erro ao excluir ${file}: ${err.message}`
                );
            }
        }
    });
}

async function downloadVideo(url, outputPath) {
    try {
        const stream = ytdl(url, {
            filter: (format) =>
                format.container === "mp4" && format.qualityLabel === "720p",
        });

        const writeStream = fs.createWriteStream(outputPath);
        stream.pipe(writeStream);

        stream.pipe(fs.createWriteStream(outputPath));
        return new Promise((resolve, reject) => {
            stream.on("end", () => {
                cleanPlayerScriptFiles();
                console.log("[SUCCESS] Vídeo baixado com sucesso!");
                resolve();
            });
            stream.on("error", (err) => {
                cleanPlayerScriptFiles();
                reject(err);
            });
            writeStream.on("error", (err) => {
                cleanPlayerScriptFiles();
                reject(err);
            });
        });
    } catch (err) {
        cleanPlayerScriptFiles();
        throw new Error(`Erro ao baixar vídeo: ${err.message}`);
    }
}

async function convertVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .videoFilters("scale=1280:720,setsar=1:1")
            .videoCodec("libx264")
            .outputOptions([
                "-profile:v main",
                "-preset fast",
                "-crf 23",
                "-map 0:v:0",
                "-map 0:a:0?",
                "-y",
                "-movflags +faststart",
                "-metadata:s:v:0 title=",
                "-metadata:s:a:0 title=",
            ])
            .audioCodec("aac")
            .audioBitrate("128k")
            .save(outputPath)
            .on("end", () => {
                console.log("[SUCCESS] Vídeo convertido com sucesso!");
                resolve();
            })
            .on("error", (err) => {
                console.error("[ERROR] Erro ao converter o vídeo:", err);
                reject(err);
            });
    });
}

async function convertMp4ToGif(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions([
                "-vf",
                "fps=15,scale=w=256:h=256:force_original_aspect_ratio=decrease,pad=256:256:(ow-iw)/2:(oh-ih)/2:color=black",
                "-t",
                "6",
                "-loop",
                "0",
            ])
            .on("end", () => {
                console.log("[SUCCESS] Conversão MP4 → GIF concluída!");
                resolve();
            })
            .on("error", (err) => {
                console.error("[ERROR] Falha na conversão:", err);
                reject(err);
            })
            .save(outputPath);
    });
}

module.exports = { downloadVideo, convertVideo, convertMp4ToGif };