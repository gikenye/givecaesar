// scripts/deploy-fundnpc.js

const { ethers, upgrades } = require("hardhat");
const fs = require("fs/promises");
const path = require("path");

async function main() {
  const multisigAddress = process.env.MULTISIG_ADDRESS;

  // Deploy upgradeable proxy
  const FundNPC = await ethers.getContractFactory("FundNPC");
  const fundNPC = await upgrades.deployProxy(FundNPC, [], {
    initializer: "initialize",
  });
  await fundNPC.deployed();

  console.log("FundNPC proxy deployed to:", fundNPC.address);

  const tx = await fundNPC.setFeeRecipient(multisigAddress);
  await tx.wait();
  console.log("Fee recipient set to:", multisigAddress);

  const deployment = {
    contract: "FundNPC",
    address: fundNPC.address,
    network: (await ethers.provider.getNetwork()).name,
    feeRecipient: multisigAddress,
    timestamp: new Date().toISOString(),
  };
  const filename = path.join(__dirname, "../fundnpc.json");
  await fs.writeFile(filename, JSON.stringify(deployment, null, 2));
  console.log(`Deployment info saved to: ${filename}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
