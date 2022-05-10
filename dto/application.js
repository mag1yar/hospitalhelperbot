const ApplicationModel = require('../models/application')

const createApplication = (dto) => ApplicationModel.create(dto)
const updateApplication = (applicationId, dto) => ApplicationModel.findOne({where: {id: applicationId}}).then((application) => {
    if (application) return application.update(dto)
})


const getApplicationByClientChatId = (clientChatId) => ApplicationModel.findOne({where: {clientChatId}});
const getApplicationByDoctorChatId = (doctorChatId) => ApplicationModel.findOne({where: {doctorChatId}});
const getApplicationById = (applicationId) => ApplicationModel.findOne({where: {id: applicationId}});

module.exports = {
    createApplication, updateApplication, getApplicationByClientChatId, getApplicationByDoctorChatId, getApplicationById
}