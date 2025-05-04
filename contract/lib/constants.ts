// ABI for Gnosis Creat2 Factory contract at address 0x0000000000FFe8B47B3e2130213B802212439497
export const CREATE2_FACTORY_ABI = [
    {
        'inputs': [
            { 'internalType': 'bytes32', 'name': 'salt', 'type': 'bytes32' },
            { 'internalType': 'bytes', 'name': 'initializer', 'type': 'bytes' },
        ],
        'name': 'safeCreate2',
        'outputs': [{ 'internalType': 'address', 'name': 'proxy', 'type': 'address' }],
        'stateMutability': 'nonpayable',
        'type': 'function',
    },
    {
        'inputs': [
            { 'internalType': 'bytes32', 'name': 'salt', 'type': 'bytes32' },
            { 'internalType': 'bytes', 'name': 'initializer', 'type': 'bytes' },
        ],
        'name': 'findCreate2Address',
        'outputs': [{ 'internalType': 'address', 'name': 'proxy', 'type': 'address' }],
        'stateMutability': 'view',
        'type': 'function',
    },
];