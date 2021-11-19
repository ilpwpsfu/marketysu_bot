module.exports = {
    hello: [
        [{ text: 'О нас', callback_data: 'hello_about' }],
        [{ text: 'Часто задаваемые вопросы', callback_data: 'faq' }],
        [{ text: 'Оставить заявку', callback_data: 'form' }],
   ],
   about: [
        [{ text: 'Наш сертификат', url: 'https://google.com' }],
        [{ text: 'Назад', callback_data: 'back' }]
    ],
    back: [[{ text: 'Назад', callback_data: 'back' }]],
    cancel: [[{ text: 'Отменить заявку', callback_data: 'cancel' }]],
    error: [[{ text: 'Оставить заявку', callback_data: 'form' }], [{ text: 'Назад', callback_data: 'back' }]],
    hello_simple: [['Text 1', 'Sample 1'], ['key'], ['board']]
}