#!/usr/bin/env node
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
/* eslint-disable jsdoc/require-jsdoc */
const path = require('path')
const fs = require('fs')
const yaml = require('js-yaml')

async function _runRaw (args) {
  // action Path
  const actionPath = path.resolve(args[0])
  delete require.cache[require.resolve(actionPath)] // make sure to reload the action
  const actionMain = require(actionPath).main

  // extract params
  const params = args.slice(1).reduce((prevObj, p) => {
    const kv = p.split(/=(.+)/) // only first equal in case you have key=val=ue
    // support JSON
    try {
      prevObj[kv[0]] = JSON.parse(kv[1])
      if (typeof prevObj[kv[0]] === 'boolean') {
        // like in runtime (especially needed for disable gw check)
        prevObj[kv[0]] = prevObj[kv[0]].toString()
      }
    } catch (e) {
      prevObj[kv[0]] = kv[1]
    }
    return prevObj
  }, {})

  console.error(`[ DEBUG_RUNNER ] invoking with params: ${JSON.stringify(params, null, 2)}`) // todo change to debug

  // run - cheap redirect all logs to stderr
  // todo proper stdout redirection
  const stdout = console.log
  console.log = console.error
  const res = JSON.stringify(await actionMain(params), null, 2)

  // output on stdout
  console.log = stdout
  console.log(res)
  return res
}

async function run (args) {
  require('dotenv').config()

  const actionName = args[0]

  // user can specify path to action
  const specifiedPath = args[1] && args[1].indexOf('=') < 0 && args[1]

  const action = yaml.safeLoad(fs.readFileSync('manifest.yml', 'utf8')).packages.tvm.actions[actionName]
  if (!action) { throw new Error(`Action ${actionName} does not exist`) }

  const defaultParams = { ...action.inputs }

  args = args.concat(Object.keys({ ...action.inputs }).map(k => {
    let value = defaultParams[k]
    if (value.indexOf('$') > -1) {
      value.replace('{', '')
      value.replace('}', '')
      value.replace('\'', '')
      const envName = value.match(/\$(.*)/)[1]
      value = process.env[envName] && process.env[envName].toString()
    }
    if (typeof value === 'object') {
      return `${k}=${JSON.stringify(value)}`
    }
    return `${k}=${value}`
  }))

  // prepare args for _runRaw
  if (specifiedPath) {
    args = args.slice(1)
  } else {
    args[0] = action.function
  }

  return _runRaw(args)
}

run(process.argv.slice(2))
