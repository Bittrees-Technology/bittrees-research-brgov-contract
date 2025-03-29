import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const ProxyModule = buildModule('ProxyModule', (builder) => {
    // Deploy the implementation contract
    const bNote = builder.contract('BNote');

    // Encode the initialize function call for the contract.
    const initialize = builder.encodeFunctionCall(bNote, 'initialize', [
        'https://something.com', // baseURI
        '0x0000000000', // treasury Address
        '0x0000000000', // admin Address
    ]);

    // Deploy the ERC1967 Proxy, pointing to the implementation
    const proxy = builder.contract('ERC1967Proxy', [bNote, initialize]);

    return { proxy };
});

export const BNoteModule = buildModule('BNoteModule', (builder) => {
    // Get the proxy from the previous module.
    const { proxy } = builder.useModule(ProxyModule);

    // Create a contract instance using the deployed proxy's address.
    const bNote = builder.contractAt('BNote', proxy);

    return { bNote, proxy };
});

export default BNoteModule;