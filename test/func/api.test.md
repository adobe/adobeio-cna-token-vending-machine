# Adobe I/O Token Vending Machine Functional Tests

These tests are designed to be run before a release.

## Requirements

### Env

Following environment variables must be set:

```bash
TEST_NAMESPACE_1, TEST_AUTH_1
TEST_NAMESPACE_2, TEST_AUTH_2
AIO_RUNTIME_APIHOST,
EXPIRATION_DURATION
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
AZURE_STORAGE_ACCOUNT, AZURE_STORAGE_ACCESS_KEY
AZURE_COSMOS_ACCOUNT, AZURE_COSMOS_DATABASE_ID, AZURE_COSMOS_CONTAINER_ID, AZURE_COSMOS_MASTER_KEY
```

## Run

`npm run func`

## Test overview

Before all tests, the tvm is deployed into ns1. Each tvm endpoint has only ns2 approvedListed. Requests are sent from ns2
unless specified otherwise. At the end the tvm endpoints are undeployed.

Here is an overview of what is tested in [api.test.js](./api.test.js):

- aws s3 functional test:
  - get aws tokens from tvm using valid OpenWhisk auth and namespace
  - initialize s3 sdk
  - list blobs in namespace subfolder
  - `expect status=200`
  - list blobs in other namespace subfolder
  - `expect errorCode = AccessDenied`
  - list buckets
  - `expect errorCode = AccessDenied`
- azure blob functional test:
  - get azure SAS urls from tvm using valid OpenWhisk auth and namespace
  - initialize azure-blob sdk
  - list blobs in private container using sasURLPrivate
  - `expect status=200`
  - list blobs in public container using sasURLPublic
  - `expect status=200`
- azure cosmos functional test:
  - get cosmos tokens from tvm using valid OpenWhisk auth and namespace
  - initialize azure-cosmos sdk
  - put a key using allowed partitionKey, containerId and databaseId
  - `expect 200<=status<300`
  - delete key
  - put key using other databaseId
  - `expect status=403`
  - put key using other containerId
  - `expect status=403`
  - put key using other partitionKey
  - `expect status=403`
- test missing OpenWhisk auth
  - for each endpoint:
    - `expect status=401`
- test namespace=ns1 and vauth=auth2 (auth of ns2)
  - for each endpoint:
    - `expect status=403`
- test bad Authorization header format
  - for each endpoint:
    - `expect status=403` (later we should change this to 401)
- test overwrite default final action parameters
  - for each endpoint:
    - for each final param in endpoint
      - send request with param to overwrite in query arg
      - `expect status=400`
- test passing non allowed parameter
  - for each endpoint:
    - `expect status=400`
