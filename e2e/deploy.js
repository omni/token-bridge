const path = require('path')
const shell = require('shelljs')

const envsDir = path.join(__dirname, 'envs')
const deployContractsDir = path.join(__dirname, 'submodules/poa-bridge-contracts/deploy')

shell.cp(path.join(envsDir, 'contracts-deploy.env'), path.join(deployContractsDir, '.env'))
shell.cd(deployContractsDir)
shell.exec('node deploy.js')
shell.rm('.env')
shell.cp(path.join(envsDir, 'erc-contracts-deploy.env'), path.join(deployContractsDir, '.env'))
shell.exec('node deploy.js')
