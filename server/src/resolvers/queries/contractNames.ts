import _ from 'lodash';
import { mkBetterCallDev, BetterCallDev, Address } from './betterCallDev';
import { Context } from '../../components/context';

interface ContractBigMapValue {
  owner: string;
  name: string;
}

export interface ContractIdentifier {
  address: string;
  name: string;
}

const contractNftOwners = async (
  betterCallDev: BetterCallDev,
  contractAddress: Address
): Promise<Address[]> => {
  const contract = await betterCallDev.contractByAddress(contractAddress);
  if (contract.contractType !== 'FA2Contract') {
    return [];
  }

  const ledgerBigMap = betterCallDev.bigMapById<string>(
    contract.bigMaps.ledger
  );
  const values = await ledgerBigMap.values();
  return values.map(v => v.value);
};

const filterContractsByNftOwner = async (
  betterCallDev: BetterCallDev,
  contracts: ContractIdentifier[],
  nftOwnerAddress: Address
) => {
  const PairPromises = contracts.map(
    async (c): Promise<[string, Set<string>]> => {
      const owners = await contractNftOwners(betterCallDev, c.address);
      return [c.address, new Set(owners)];
    }
  );

  const pairs = await Promise.all(PairPromises);
  const contractToNftOwners = _.fromPairs(pairs);
  return contracts.filter(c =>
    contractToNftOwners[c.address].has(nftOwnerAddress)
  );
};

export const contractNames = async (
  contractOwnerAddress: string | null | undefined,
  nftOwnerAddress: string | null | undefined,
  ctx: Context
): Promise<ContractIdentifier[]> => {
  const factoryAddress = ctx.configStore.get('contracts.nftFactory') as string;
  const faucetAddress = ctx.configStore.get('contracts.nftFaucet') as string;
  const faucetContract = { address: faucetAddress, name: 'Minter' };
  const betterCallDev = mkBetterCallDev(ctx.bcdApiUrl, ctx.bcdNetwork);
  const contract = await betterCallDev.contractByAddress(factoryAddress);

  switch (contract.contractType) {
    case 'GenericContract':
      return [];
    case 'FA2Contract':
      return [faucetContract];
    case 'FA2FactoryContract': {
      const contracts = await betterCallDev
        .bigMapById<ContractBigMapValue>(contract.contractsBigMapId)
        .values();

      const filterContracts = !_.isNil(contractOwnerAddress)
        ? contracts.filter(i => i.value.owner === contractOwnerAddress)
        : contracts;

      const result = filterContracts.map(i => ({
        address: i.key,
        name: i.value.name
      }));

      const allContracts = [faucetContract, ...result];

      if (_.isNil(nftOwnerAddress)) return allContracts;

      return filterContractsByNftOwner(
        betterCallDev,
        allContracts,
        nftOwnerAddress
      );
    }
  }
};
