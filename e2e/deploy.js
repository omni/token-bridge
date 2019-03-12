const path = require('path')
const shell = require('shelljs')

const envsDir = path.join(__dirname, 'envs')
const deployContractsDir = path.join(__dirname, 'submodules/poa-bridge-contracts/deploy')
const scriptDir = path.join(__dirname, 'scripts')

// NATIVE_TO_ERC
shell.cp(path.join(envsDir, 'contracts-deploy.env'), path.join(deployContractsDir, '.env'))
shell.cd(deployContractsDir)
shell.exec('node deploy.js')
shell.cd(scriptDir)
shell.exec('node deployERC20.js')
shell.cd(deployContractsDir)
shell.rm('.env')

// ERC_TO_ERC
shell.cp(path.join(envsDir, 'erc-contracts-deploy.env'), path.join(deployContractsDir, '.env'))
shell.exec('node deploy.js')
shell.rm('.env')

// ERC_TO_NATIVE
shell.cp(
  path.join(envsDir, 'erc-native-contracts-deploy.env'),
  path.join(deployContractsDir, '.env')
)
shell.exec('node src/utils/deployBlockReward.js')
shell.exec('node deploy.js')

// ERC_TO_ERC_MULTIPLE
shell.cp(
  path.join(envsDir, 'erc-multiple-contracts-deploy.env'),
  path.join(deployContractsDir, '.env')
)
shell.exec('node deploy.js')
shell.cd(scriptDir)
shell.exec('node deployERC20.js')
shell.exec('node deployERC20.js')
shell.exec('node deployBridgesAndUpdateMapper.js')
shell.cd(deployContractsDir)
shell.rm('.env')
