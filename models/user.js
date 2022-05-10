const sequelize = require('../db')
const {DataTypes} = require('sequelize')

const user = sequelize.define('user', {
    id: {type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true},
    chatId: {type: DataTypes.STRING, unique: true},
    fullName: {type: DataTypes.STRING},
    iin: {type: DataTypes.STRING},
    phoneNumber: {type: DataTypes.STRING},
    role: {type: DataTypes.STRING, defaultValue: 'client'}
})

module.exports = user