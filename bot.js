const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Servidor web falso para que Render no cierre la aplicación
app.get('/', (req, res) => {
    res.send('🤖 ¡El Bot de Finanzas de Humberto está activo y funcionando!');
});

app.listen(PORT, () => {
    console.log(`Servidor web corriendo en el puerto ${PORT}`);
});

// 1. Pega aquí el Token que te dio @BotFather
const TOKEN = 8825355800:AAHm126NS7s1085i3Bl28T2HOpePG1jnqSw; 
const bot = new TelegramBot(TOKEN, { polling: true });

// Almacenamiento temporal en memoria (se puede conectar a Google Sheets)
let gastosMensuales = [
    { id: 1, concepto: 'Internet Totalplay', monto: 599, diaVencimiento: 10, pagado: false },
    { id: 2, concepto: 'Renta', monto: 7500, diaVencimiento: 5, pagado: false }
];

let gastosDiarios = [];

// --- COMANDO /start O /menu ---
bot.onText(/\/(start|menu)/, (msg) => {
    const chatId = msg.chat.id;
    const mensaje = `👋 ¡Hola Daniel! Bienvenido a tu Control Financiero.\n\n` +
                    `¿Qué deseas hacer?\n` +
                    `• Para registrar un gasto diario escribe: \`Diario Comida 150\`\n` +
                    `• Para registrar un gasto fijo escribe: \`Fijo Luz 850 15\` (Concepto, Monto, Día de Pago)\n` +
                    `• Para ver tu resumen del mes pulsa los botones de abajo:`;

    const opciones = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "📅 Ver Gastos Mensuales", callback_data: "ver_mensuales" }],
                [{ text: "🛒 Ver Gastos Diarios", callback_data: "ver_diarios" }]
            ]
        }
    };

    bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown", ...opciones });
});

// --- RESPUESTA A LOS BOTONES ---
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;

    if (query.data === 'ver_mensuales') {
        let texto = "📅 *TUS GASTOS MENSUALES:*\n\n";
        let total = 0;
        gastosMensuales.forEach(g => {
            texto += `${g.pagado ? '✅' : '🔴'} *${g.concepto}*: $${g.monto} (Vence día ${g.diaVencimiento})\n`;
            total += g.monto;
        });
        texto += `\n*Total Fijo Mensual:* $${total}`;
        bot.sendMessage(chatId, texto, { parse_mode: "Markdown" });
    }

    if (query.data === 'ver_diarios') {
        let texto = "🛒 *GASTOS DIARIOS DE ESTE MES:*\n\n";
        let total = 0;
        if (gastosDiarios.length === 0) {
            texto += "No has registrado gastos diarios aun.";
        } else {
            gastosDiarios.forEach(d => {
                texto += `• ${d.concepto}: $${d.monto} (${d.fecha})\n`;
                total += d.monto;
            });
            texto += `\n*Total Gastos Diarios:* $${total}`;
        }
        bot.sendMessage(chatId, texto, { parse_mode: "Markdown" });
    }
});

// --- REGISTRO DE GASTOS POR TEXTO LIBRE ---
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const texto = msg.text;

    if (!texto || texto.startsWith('/')) return;

    const partes = texto.split(' ');

    // Ejemplo: "Diario Gasolina 300"
    if (partes[0].toLowerCase() === 'diario' && partes.length >= 3) {
        const monto = parseFloat(partes[partes.length - 1]);
        const concepto = partes.slice(1, -1).join(' ');

        if (!isNaN(monto)) {
            const fecha = new Date().toLocaleDateString('es-MX');
            gastosDiarios.push({ concepto, monto, fecha });
            bot.sendMessage(chatId, `✅ *Gasto diario registrado:*\n"${concepto}" por *$${monto}*`, { parse_mode: "Markdown" });
            return;
        }
    }

    // Ejemplo: "Fijo Agua 250 18" (Concepto, Monto, Día de pago)
    if (partes[0].toLowerCase() === 'fijo' && partes.length >= 4) {
        const diaVencimiento = parseInt(partes[partes.length - 1]);
        const monto = parseFloat(partes[partes.length - 2]);
        const concepto = partes.slice(1, -2).join(' ');

        if (!isNaN(monto) && !isNaN(diaVencimiento)) {
            gastosMensuales.push({ id: Date.now(), concepto, monto, diaVencimiento, pagado: false });
            bot.sendMessage(chatId, `📌 *Gasto fijo guardado:*\n"${concepto}" por *$${monto}* (Vence el día ${diaVencimiento} de cada mes)`, { parse_mode: "Markdown" });
            return;
        }
    }
});

// --- 🔔 ALERTAS AUTOMÁTICAS DE PAGO (SISTEMA DE RECORDATORIO) ---
// Se ejecuta automáticamente todos los días a las 8:00 AM
cron.schedule('0 8 * * *', () => {
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const chatIdDaniel = 9101339945; // Tu ID de chat de Telegram

    gastosMensuales.forEach(gasto => {
        if (gasto.diaVencimiento === diaActual && !gasto.pagado) {
            bot.sendMessage(
                chatIdHumberto, 
                `⚠️ *RECORDATORIO DE PAGO HACIENDO HOY*\n\nHola Daniel, hoy día ${diaActual} vence tu servicio de *${gasto.concepto}* por un monto de *$${gasto.monto}*.`,
                { parse_mode: "Markdown" }
            );
        }
    });
});
