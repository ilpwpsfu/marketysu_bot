require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')
const axios = require('axios').default
const messagePack = require('./modules/messagePack')
const keyboardPack = require('./modules/keyboardPack')
const fs = require('fs')

const bot = new TelegramBot(process.env.TG_TOKEN, {polling: true})
const amo = str => `https://2delo.amocrm.ru${ str }`
const memory = {}
const amoData = {
    client_id: process.env.AMO_ID,
    client_secret: process.env.AMO_SECRET,
    redirect_uri: process.env.AMO_REDIRECT
}

let authData

bot.onText(/\/start/, (msg, match) => {  
    const chatId = msg.chat.id
    bot.sendMessage(chatId, messagePack.hello, { reply_markup: { inline_keyboard: keyboardPack.hello } })
})

bot.on('message', async msg => {
    const chatId = msg.chat.id

    if (msg.text.match(/[а-я]{1,} [а-я]{1,} [а-я]{1,}/i)) {
        memory[chatId] = msg.text.match(/[а-я]{1,} [а-я]{1,} [а-я]{1,}/i)[0]
        bot.sendMessage(chatId, messagePack.form_next, { reply_markup: { inline_keyboard: keyboardPack.cancel } })
    } else if (msg.text.match(/\+\d{11,14}/)) {
        if (!memory[chatId]) return bot.sendMessage(chatId, messagePack.error, { reply_markup: { inline_keyboard: keyboardPack.error } })
        const userForm = { name: memory[chatId], phone: msg.text.match(/\+\d{11,14}/)[0] }
        
        delete memory[chatId]
        const uid = `${ Date.now() }`

        axios.post(amo('/api/v4/leads/unsorted/forms'), [{
            source_uid: `source_${ uid }`,
            source_name: `Заявка через TG Bot #${ uid }`,
            pipeline_id: +process.env.AMO_FUNNEL,
            created_at: Math.round(+uid / 1000),
            metadata: {
                ip: '192.168.0.1',
                form_id: '1',
                form_sent_at: Math.round(+uid / 1000),
                form_name: 'Форма заявки от Телеграм Бота',
                form_page: process.env.TG_URL,
                referer: process.env.TG_URL
            },
            _embedded: {
                leads: [{
                    name: 'Необработанная заявка от бота',
                    visitor_uid: `visitor_${ uid }`,
                    price: 0
                }],
                contacts: [{
                    name: userForm.name,
                    first_name: `${ userForm.name.split(' ')[1] } ${ userForm.name.split(' ')[2] }`,
                    last_name: userForm.name.split(' ')[0],
                    custom_fields_values: [
                        {
                            field_code: "PHONE",
                            values: [
                                {
                                    value: userForm.phone,
                                }
                            ]
                        }
                    ]
                }],
            }
        }], {
            headers: {
                Authorization: `Bearer ${ authData.access_token }`
            }
        }).catch(e => console.dir(e, { depth: 100 }))

        bot.sendMessage(chatId, messagePack.form_end, { reply_markup: { inline_keyboard: keyboardPack.back } })
    } else {
        bot.sendMessage(chatId, messagePack.error, { reply_markup: { inline_keyboard: keyboardPack.error } })
    }
})

bot.on('callback_query', async query => {
    const chat_id = query.message.chat.id
    const message_id = query.message.message_id

    if (query.data == 'back') {
        bot.editMessageText(messagePack.hello, { message_id, chat_id })
        setTimeout(() => bot.editMessageReplyMarkup({ inline_keyboard: keyboardPack.hello }, { message_id, chat_id }), 100)
    }
    if (query.data == 'cancel') {
        delete memory[chat_id]

        bot.editMessageText(messagePack.hello, { message_id, chat_id })
        setTimeout(() => bot.editMessageReplyMarkup({ inline_keyboard: keyboardPack.hello }, { message_id, chat_id }), 100)
    }
    if (query.data == 'hello_about') {
        bot.editMessageText(messagePack.about, { message_id, chat_id })
        setTimeout(() => bot.editMessageReplyMarkup({ inline_keyboard: keyboardPack.about }, { message_id, chat_id }), 100)
    }
    if (query.data == 'hello_2') {
        bot.editMessageText('Вы нажали 2 кнопку', { message_id, chat_id })
        setTimeout(() => bot.editMessageReplyMarkup({ inline_keyboard: keyboardPack.back }, { message_id, chat_id }), 100)
    }
    if (query.data == 'hello_3') {
        bot.editMessageText('Вы нажали 3 кнопку', { message_id, chat_id })
        setTimeout(() => bot.editMessageReplyMarkup({ inline_keyboard: keyboardPack.back }, { message_id, chat_id }), 100)
    }
    if (query.data == 'faq') {
        bot.editMessageText(messagePack.faq, { message_id, chat_id, parse_mode: 'HTML' })
        setTimeout(() => bot.editMessageReplyMarkup({ inline_keyboard: keyboardPack.back }, { message_id, chat_id }), 100)
    }
    if (query.data == 'form') {
        bot.editMessageText(messagePack.form, { message_id, chat_id })
        setTimeout(() => bot.editMessageReplyMarkup({ inline_keyboard: keyboardPack.back }, { message_id, chat_id }), 100)
    }
    if (query.data == 'error') {
        bot.sendMessage(chatId, messagePack.error, { reply_markup: { inline_keyboard: keyboardPack.error } })
    }
})

;(async () => {
    if (!fs.existsSync('./authData.json')) return auth()

    authData = JSON.parse(fs.readFileSync('./authData.json').toString())

    if (authData.date + authData.expires_in * 1000 < Date.now()) return auth()

    auth(true)
})()

async function auth(refresh) {
    let data = {
        ...amoData,
        grant_type: refresh ? 'refresh_token' : 'authorization_code'
    }

    if (refresh) data = { ...data, refresh_token: authData.refresh_token }
    else data = { ...data, code: process.env.AMO_AUTH }

    const authReq = await axios.post(amo('/oauth2/access_token'), data)
    authData = authReq.data

    fs.writeFileSync('./authData.json', JSON.stringify({ ...authData, date: Date.now() }))
}