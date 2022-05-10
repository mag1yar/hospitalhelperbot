const UserModel = require('../models/user')

const createUser = (dto) => UserModel.create(dto)

const getUserByChatId = (chatId) => UserModel.findOne({where: {chatId}})
const getUsersByRole = (role) => UserModel.findAll({where: {role}});

module.exports = {
    createUser, getUserByChatId, getUsersByRole
}