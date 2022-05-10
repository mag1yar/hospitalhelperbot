const chats = {}

const changeChat = (id, options) => {
    if (!chats[id]) chats[id] = {command: null, step: null}
    chats[id] = Object.assign(chats[id], options)
}

const clearChat = (id) => {
    chats[id] = null
}

module.exports = {
    chats, changeChat, clearChat
}