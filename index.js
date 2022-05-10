require('dotenv').config();

const TelegramApi = require('node-telegram-bot-api')
const sequelize = require('./db')

const userController = require('./dto/user')
const applicationController = require('./dto/application')

const chat = require('./chat')

// Подключение к боту
const bot = new TelegramApi(process.env.BOT_TOKEN, {polling: true})

// Подключение к БД
sequelize.authenticate().then(() => console.log('Успешное подключение к базе данных!')).catch(() => {
    throw new Error('Не удалось подключиться к базе данных!')
})
sequelize.sync()

// Доктора
const doctors = [{case: 'doctor_1', title: 'Врач-офтальмолог', text: 'врачу офтальмологу', role: 'eye', available: true}, {
    case: 'doctor_2', title: 'Врач-отоларинголог(лор)', text: 'врачу отоларингологу(лор) ', role: 'lor', available: false
},{case: 'doctor_3', title: 'Врач-аллерголог', text: 'врачу аллергологу', role: 'allergist', available: true}]

// Доступные команды
const COMMANDS = {
    start: '/start', help: '/help', application: '/application', take: '/take', done: '/done'
}

// Описание для команд
const commands = [{command: COMMANDS.start, description: 'Приветствие'}, {
    command: COMMANDS.help, description: 'Помощь'
}, {command: COMMANDS.application, description: 'Подать заявку'}, {
    command: COMMANDS.take, description: 'Принять заявку'
}, {command: COMMANDS.done, description: 'Закрыть заявку'}]

// Установка команд боту
bot.setMyCommands(commands)

// start
bot.onText(new RegExp(`${COMMANDS.start}`), async (msg) => {
    const {chat: {id, first_name}} = msg

    await userController.getUserByChatId(id).then(async (res) => {
        if (!!res) {
            const user = res.toJSON();
            await bot.sendMessage(id, `Здраствуйте ${user.fullName}, я помогу вам быстро и удобно подать заявку к врачу. \nДля продолжения узнайте команды /help`)

            chat.clearChat(id)
        } else {
            await bot.sendMessage(id, `Привет ${first_name}, я помогу вам быстро и удобно подать заявку к врачу. \nДля продолжения работы нам необходимы кое-какие данные. \nДля начала напишите своё Ф.И.О.`)

            chat.changeChat(id, {
                command: 'registration', step: 0
            })
        }
    })
})

// help
bot.onText(new RegExp(`${COMMANDS.help}`), async (msg) => {
    const {chat: {id}} = msg

    await bot.sendMessage(id, 'Подавай заявки быстро и удобно. Доступные команды: \n' + '/start - Приветствие и регистрация\n' + '/help - Помощь\n' + '/application - подать заявку на очередь к врачу')

    chat.clearChat(id)
})

// application
bot.onText(new RegExp(`${COMMANDS.application}`), async (msg) => {
    const {chat: {id}} = msg

    await bot.sendMessage(id, `Выберите кому хотите записаться.`, {
        "reply_markup": JSON.stringify({
            "inline_keyboard": doctors.map((doctor) => ([{text: doctor.title, callback_data: doctor.case}]))
        })
    })
})

// take
bot.onText(/\/take (.+)/, async (msg, match) => {
    const {chat: {id}} = msg
    const [applicationId, time] = match[1].split(' ')
    await userController.getUserByChatId(id).then(async (res) => {
        const user = res.toJSON();
        if (!user) {
            await bot.sendMessage(id, `Вы не зарегестрированы, введите /start.`)
            return
        }
        if (user && user.role === 'client') {
            await bot.sendMessage(id, `У вас нет прав для вызова этой команды.`)
            return
        }
        if (!applicationId || !time) {
            await bot.sendMessage(id, `Вы ввели неправильно, необходимо /take applicationId time`)
            return
        }

        const tookApplication = await applicationController.getApplicationById(applicationId)
        if (!tookApplication) {
            await bot.sendMessage(id, `Такой заявки не существует!`)
            return
        }
        if (tookApplication.toJSON().status === 2) {
            await bot.sendMessage(id, `Эта заявка уже принята`)
            return
        }

        await applicationController.updateApplication(applicationId, {
            status: 2, doctorChatId: id
        }).then(async () => {
            await bot.sendMessage(id, `Вы приняли заявку на ${time}.`)
            await applicationController.getApplicationById(applicationId).then(async (application) => {
                const app = application.toJSON()

                await bot.sendMessage(app.clientChatId, `Вашу заявку приняли. Ждём вас в ${time}`)
                await bot.sendMessage(app.clientChatId, `Ф.И.О. врача: ${user.fullName}`)
                await bot.sendMessage(app.clientChatId, `Номер телефона врача: ${user.phoneNumber}`)
            })

        })
    })
})

bot.onText(/\/done (.+)/, async (msg, match) => {
    const {chat: {id}} = msg

    const [applicationId] = match[1].split(' ')
    await userController.getUserByChatId(id).then(async (res) => {
        const user = res.toJSON();
        if (!user) {
            await bot.sendMessage(id, `Вы не зарегестрированы, введите /start.`)
            return
        }
        if (user && user.role === 'client') {
            await bot.sendMessage(id, `У вас нет прав для вызова этой команды.`)
            return
        }
        if (!applicationId || isNaN(+applicationId)) {
            await bot.sendMessage(id, `Вы ввели неправильно, нужно /done applicationId`)
            return
        }

        const tookApplication = (await applicationController.getApplicationById(applicationId))
        if (!tookApplication) {
            await bot.sendMessage(id, `Такой заявки не существует!`)
            return
        }
        const tookApplicationJson = tookApplication.toJSON()
        if (tookApplicationJson.status === 1 || tookApplicationJson.status === 0) {
            await bot.sendMessage(id, `Вы не можете принять эту заявку, так как его статус не соотвествует ожидаемуему!`)
            return
        } else if (tookApplicationJson.status === 3) {
            await bot.sendMessage(id, `Эта заявка уже закрыта`)
            return
        }

        await applicationController.updateApplication(applicationId, {
            status: 3
        }).then(async () => {
            await bot.sendMessage(id, `Заявка закрыта. Благодарим вас за работу.`)
            await applicationController.getApplicationById(applicationId).then(async (application) => {
                const app = application.toJSON()
                await bot.sendMessage(app.clientChatId, `Ваша заявка закрыта. Приходите еще.`)
            })

        })
    })
})

bot.on('message', async msg => {
    const {text, chat: {id}} = msg
    if (!chat.chats[id] || !chat.chats[id].command) return
    switch (chat.chats[id].command) {
        case 'registration':
            switch (chat.chats[id].step) {
                case 0:
                    chat.changeChat(id, {step: 1, fullName: text})
                    await bot.sendMessage(id, `Введите ваш номер телефона.`)
                    break
                case 1:
                    chat.changeChat(id, {step: 2, phoneNumber: text})
                    await bot.sendMessage(id, `Введите ваш ИИН.`)
                    break
                case 2:
                    if (text.length < 12 || text.length > 12) {
                        chat.changeChat(id, {step: 2})
                        await bot.sendMessage(id, `Вы ввели неправильно ИИН, пожалуйства перепроверьте и напишите еще раз.`)

                        break
                    }
                    chat.changeChat(id, {iin: text})
                    await bot.sendMessage(id, `Спасибо, мы зарегестрировали вас. Теперь напишите команду /help, чтобы ознакомиться с дальнейшими коммандами.`)
                    await userController.createUser({
                        chatId: id,
                        fullName: chat.chats[id].fullName,
                        iin: chat.chats[id].iin,
                        phoneNumber: chat.chats[id].phoneNumber
                    })
                    chat.clearChat(id)
                    break
            }
            break
        case 'application':
            switch (chat.chats[id].step) {
                case 0:
                    break
            }
            break
        default:
            await bot.sendMessage(id, "Простите, но я не понимаю, что вы написали. Проверьте список команд /help.")
            break
    }
})

bot.on('callback_query', async ({data, message}) => {
    const opts = {
        chat_id: message.chat.id, message_id: message.message_id,
    };

    for (const doctor of doctors) {
        if (data === doctor.case) {
            if (!doctor.available) {
                await bot.editMessageText(`На данный момент невозможно обратиться к ${doctor.text}. Приносим извенения`, opts)
                return
            }
            applicationController.createApplication({
                doctorRole: doctor.role, clientChatId: message.chat.id
            }).then(async (res) => {
                const application = res.toJSON()
                await userController.getUsersByRole(doctor.role).then(async (res) => {
                    res.map((async doctor => {
                        const d = doctor.toJSON()
                        await bot.sendMessage(d.chatId, `К вам заявка.\nНомер заявки: ${application.id}`)
                    }))
                    await bot.editMessageText(`Ваша заявка в очереди к ${doctor.text}, вам скоро ответит...`, opts);
                })
            })
            break
        }
    }
});


