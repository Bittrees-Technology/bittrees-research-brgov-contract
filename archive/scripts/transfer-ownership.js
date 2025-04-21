// scripts/transfer-ownership.js
async function main () {
    const gnosisSafe = '0x41Be6bDB81695c44631162e906Ba19e5233D3144';
  
    console.log('Transferring ownership of ProxyAdmin...');
    // The owner of the ProxyAdmin can upgrade our contracts
    await upgrades.admin.transferProxyAdminOwnership(gnosisSafe);
    console.log('Transferred ownership of ProxyAdmin to:', gnosisSafe);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });