const sequelize = require('../db')
const {DataTypes} = require('sequelize')

const application = sequelize.define('application', {
    id: {type: DataTypes.INTEGER, primaryKey: true, unique: true, autoIncrement: true},
    doctorRole: {type: DataTypes.STRING, require: true},
    clientChatId: {type: DataTypes.INTEGER, require: true},
    doctorChatId: {type: DataTypes.INTEGER},
    status: {type: DataTypes.INTEGER, defaultValue: 1}
})

module.exports = application