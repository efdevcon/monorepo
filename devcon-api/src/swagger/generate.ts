import swaggerAutogen from 'swagger-autogen'
import { API_INFO, SERVER_CONFIG } from 'utils/config'

console.log(`Generate Swagger docs in ${SERVER_CONFIG.NODE_ENV} mode`)
const doc = {
  info: {
    title: API_INFO.title,
    description: API_INFO.description,
    version: API_INFO.version,
    contact: {
      email: API_INFO.email,
    },
    license: {
      name: API_INFO.license,
    },
    externalDocs: {
      url: API_INFO.repository,
    },
  },
  host: SERVER_CONFIG.NODE_ENV === 'production' ? API_INFO.host : 'localhost:4000',
  schemes: SERVER_CONFIG.NODE_ENV === 'production' ? ['https'] : ['http'],
}
const outputFile = './definition.json'
const endpointsFiles = ['../routes', '../controllers/*.ts']

console.log('API Info', doc)
swaggerAutogen(outputFile, endpointsFiles, doc)
