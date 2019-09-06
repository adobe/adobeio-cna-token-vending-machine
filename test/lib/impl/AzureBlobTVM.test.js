const { AzureBlobTVM } = require('../../../lib/impl/AzureBlobTVM')

const azure = require('@azure/storage-blob')
jest.mock('@azure/storage-blob')

// mock azure blob
const azureContainerCreateMock = jest.fn()

azure.SharedKeyCredential = jest.fn()
azure.StorageURL.newPipeline = jest.fn()
azure.ServiceURL = jest.fn()
azure.ContainerURL.fromServiceURL = jest.fn().mockReturnValue({
  create: azureContainerCreateMock
})
azure.ContainerURL.prototype.create = jest.fn()
azure.generateBlobSASQueryParameters = jest.fn()
azure.Aborter.none = {}

class FakePermission {
  toString () {
    return (this.add && this.read && this.create && this.delete && this.write && this.list && 'ok') || 'not ok'
  }
}
azure.ContainerSASPermissions.mockImplementation(() => new FakePermission())

// date mock
const fakeDate = '1970-01-01T00:00:00.000Z'
const fakeCurrSeconds = 1234567890
global.Date.prototype.getSeconds = () => fakeCurrSeconds
global.Date.prototype.setSeconds = jest.fn()
global.Date.prototype.toISOString = () => fakeDate

// params
const fakeParams = JSON.parse(JSON.stringify(global.baseNoErrorParams))
fakeParams.azureStorageAccount = 'fakeAccount'
fakeParams.azureStorageAccessKey = 'fakeKey'

describe('processRequest (Azure Cosmos)', () => {
  // setup
  /** @type {AzureBlobTVM} */
  let tvm
  const fakeSas = 'fakeSas'
  beforeEach(() => {
    tvm = new AzureBlobTVM()
    azureContainerCreateMock.mockReset()
    azure.generateBlobSASQueryParameters.mockReset()

    // defaults that work
    azure.generateBlobSASQueryParameters.mockResolvedValue({ toString: () => fakeSas })
  })

  describe('param validation', () => {
    test('when owNamespace is smaller than 3 chars', async () => global.testParam(tvm, fakeParams, 'owNamespace', 'aa'))
    test('when owNamespace is missing', async () => global.testParam(tvm, fakeParams, 'owNamespace', undefined))
    test('when azureStorageAccount is missing', async () => global.testParam(tvm, fakeParams, 'azureStorageAccount', undefined))
    test('when azureStorageAccessKey is missing', async () => global.testParam(tvm, fakeParams, 'azureStorageAccessKey', undefined))
  })

  describe('token generation', () => {
    const expectTokenGenerated = async () => {
      const response = await tvm.processRequest(fakeParams)

      // todo remove duplicated implementation of partitionKey name creation
      const containerName = Buffer.from(fakeParams.owNamespace, 'utf8').toString('hex')

      expect(response.statusCode).toEqual(200)
      expect(response.body).toEqual({
        sasURLPrivate: expect.stringContaining(containerName),
        sasURLPublic: expect.stringContaining('public'),
        expiration: fakeDate
      })

      expect(azure.generateBlobSASQueryParameters).toHaveBeenCalledTimes(2)
      expect(azure.generateBlobSASQueryParameters).toHaveBeenCalledWith(expect.objectContaining({ permissions: 'ok' }), expect.any(Object))

      expect(azureContainerCreateMock).toHaveBeenCalledTimes(2)
      expect(azureContainerCreateMock).toHaveBeenCalledWith(expect.any(Object), { metadata: { namespace: fakeParams.owNamespace } }) // private
      expect(azureContainerCreateMock).toHaveBeenCalledWith(expect.any(Object), { access: 'blob', metadata: { namespace: fakeParams.owNamespace } }) // public
    }

    test('when azure blob containers do not exist', expectTokenGenerated)
    test('when azure blob containers already exist', async () => {
      azureContainerCreateMock.mockRejectedValue({ body: { Code: 'ContainerAlreadyExists' } })
      await expectTokenGenerated()
    })
    test('when azure blob container create rejects with an error', async () => {
      azureContainerCreateMock.mockRejectedValue(new Error('an azure blob error'))
      const response = await tvm.processRequest(fakeParams)
      global.expectServerError(response, 'an azure blob error')
    })
    test('when azure blob container create rejects with a non expected code', async () => {
      azureContainerCreateMock.mockRejectedValue({ message: 'an azure blob error', body: { code: 'UNEXPECTED CODE' } })
      const response = await tvm.processRequest(fakeParams)
      global.expectServerError(response, 'an azure blob error')
    })
  })
})
