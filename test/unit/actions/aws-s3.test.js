/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

const awsS3Action = require('../../../actions/aws-s3')

const { AwsS3Tvm } = require('../../../lib/impl/AwsS3Tvm')
jest.mock('../../../lib/impl/AwsS3Tvm')

beforeEach(() => {
  AwsS3Tvm.prototype.processRequest.mockReset()
})
test('aws-s3 action has a main function and calls AwsS3Tvm.processRequest', async () => {
  const fakeParams = { a: { nested: 'param' }, another: 'param' }
  await awsS3Action.main(fakeParams)
  expect(AwsS3Tvm.prototype.processRequest).toHaveBeenCalledWith(fakeParams)
})
