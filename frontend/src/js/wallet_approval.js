/* /frontend/src/wallet_approval.js   */
import { config } from './config'

const approvalRequest = {
    appName: 'Our Places',
    description: 'Approve this website to start creating and owning unique pixel animations!',
    contractName: config.smartContract,
    networkType: 'testnet',
    preApproval: {
        stampsToPreApprove: 1000000,
        message: 'This pre-approval will allow you to draw faster as you won\'t have to approve each color change via a wallet popup.'
    }
}

approvalRequest.logo = 'logo-192.png'
approvalRequest.background = 'wallet/background.png'

export { approvalRequest };
