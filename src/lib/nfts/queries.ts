/* eslint-disable no-redeclare */
import { Buffer } from 'buffer';
import * as t from 'io-ts';
import _ from 'lodash';
import { SystemWithToolkit, SystemWithWallet } from '../system';
import { TzKt } from '../service/tzkt';
import { isLeft } from 'fp-ts/lib/Either';

export type AssetMetadataResponse = t.TypeOf<typeof AssetMetadataResponse>;
export const AssetMetadataResponse = t.array(
  t.type({
    id: t.number,
    active: t.boolean,
    hash: t.string,
    key: t.string,
    value: t.string,
    firstLevel: t.number,
    lastLevel: t.number,
    updates: t.number
  })
);

export type LedgerResponse = t.TypeOf<typeof LedgerResponse>;
export const LedgerResponse = t.array(
  t.type({
    id: t.number,
    active: t.boolean,
    hash: t.string,
    key: t.string,
    value: t.string,
    firstLevel: t.number,
    lastLevel: t.number,
    updates: t.number
  })
);

export type TokenMetadataResponse = t.TypeOf<typeof TokenMetadataResponse>;
export const TokenMetadataResponse = t.array(
  t.type({
    id: t.number,
    active: t.boolean,
    hash: t.string,
    key: t.string,
    value: t.type({
      token_id: t.string,
      token_info: t.type({
        '': t.string
      })
    }),
    firstLevel: t.number,
    lastLevel: t.number,
    updates: t.number
  })
);

export type FixedPriceSaleResponse = t.TypeOf<typeof FixedPriceSaleResponse>;
const FixedPriceSaleResponse = t.array(
  t.type({
    id: t.number,
    active: t.boolean,
    hash: t.string,
    key: t.type({
      sale_token: t.type({
        token_for_sale_address: t.string,
        token_for_sale_token_id: t.string
      }),
      sale_seller: t.string
    }),
    value: t.string,
    firstLevel: t.number,
    lastLevel: t.number,
    updates: t.number
  })
);

export const NftMetadataFormatDimensions = t.partial({
  value: t.string,
  unit: t.string
});

export type NftMetadataFormatDimensions = t.TypeOf<
  typeof NftMetadataFormatDimensions
>;

export const NtfMetadataFormatDataRate = t.partial({
  value: t.number,
  unit: t.string
});

export type NtfMetadataFormatDataRate = t.TypeOf<
  typeof NtfMetadataFormatDataRate
>;

export const NftMetadataFormat = t.partial({
  uri: t.string,
  hash: t.string,
  mimeType: t.string,
  fileSize: t.number,
  fileName: t.string,
  duration: t.string,
  dimensions: NftMetadataFormatDimensions,
  dataRate: NtfMetadataFormatDataRate
});

export type NftMetadataFormat = t.TypeOf<typeof NftMetadataFormat>;

export const NftMetadataAttribute = t.intersection([
  t.type({ name: t.string, value: t.string }),
  t.partial({ type: t.string })
]);

export type NftMetadataAttribute = t.TypeOf<typeof NftMetadataAttribute>;

export const NftMetadata = t.partial({
  '': t.string,
  name: t.string,
  minter: t.string,
  symbol: t.string,
  decimals: t.number,
  rightUri: t.string,
  artifactUri: t.string,
  displayUri: t.string,
  thumbnailUri: t.string,
  externalUri: t.string,
  description: t.string,
  creators: t.array(t.string),
  contributors: t.array(t.string),
  publishers: t.array(t.string),
  date: t.string,
  blocklevel: t.number,
  type: t.string,
  tags: t.array(t.string),
  genres: t.array(t.string),
  language: t.string,
  identifier: t.string,
  rights: t.string,
  isTransferable: t.boolean,
  isBooleanAmount: t.boolean,
  shouldPreferSymbol: t.boolean,
  formats: t.array(NftMetadataFormat),
  attributes: t.array(NftMetadataAttribute)
});

export type NftMetadata = t.TypeOf<typeof NftMetadata>;

interface NftSale {
  id: number;
  seller: string;
  price: number;
  mutez: number;
  type: string;
}

export interface Nft {
  id: number;
  title: string;
  owner: string;
  description: string;
  artifactUri: string;
  metadata: NftMetadata;
  sale?: NftSale;
  address?: string;
}

function fromHexString(input: string) {
  if (/^([A-Fa-f0-9]{2})*$/.test(input)) {
    return Buffer.from(input, 'hex').toString();
  }
  return input;
}

//// Data retrieval and decoding functions

async function getAssetMetadata(
  tzkt: TzKt,
  address: string
): Promise<AssetMetadataResponse> {
  const path = 'metadata';
  const data = await tzkt.getContractBigMapKeys(address, path);
  const decoded = LedgerResponse.decode(data);
  if (isLeft(decoded)) {
    throw Error('Failed to decode `getAssetMetadata` response');
  }
  return decoded.right;
}

async function getLedger(tzkt: TzKt, address: string): Promise<LedgerResponse> {
  const path = 'assets.ledger';
  const data = await tzkt.getContractBigMapKeys(address, path);
  const decoded = LedgerResponse.decode(data);
  if (isLeft(decoded)) {
    throw Error('Failed to decode `getLedger` response');
  }
  return decoded.right;
}

async function getTokenMetadata(
  tzkt: TzKt,
  address: string
): Promise<TokenMetadataResponse> {
  const path = 'assets.token_metadata';
  const data = await tzkt.getContractBigMapKeys(address, path);
  const decoded = TokenMetadataResponse.decode(data);
  if (isLeft(decoded)) {
    throw Error('Failed to decode `getTokenMetadata` response');
  }
  return decoded.right;
}

async function getFixedPriceSales(
  tzkt: TzKt,
  address: string
): Promise<FixedPriceSaleResponse> {
  const fixedPriceBigMapId = await tzkt.getContractStorage(address);
  if (isLeft(t.number.decode(fixedPriceBigMapId))) {
    throw Error('Failed to decode `getFixedPriceSales` bigMap ID');
  }
  const fixedPriceSales = await tzkt.getBigMapKeys(fixedPriceBigMapId);
  const decoded = FixedPriceSaleResponse.decode(fixedPriceSales);
  if (isLeft(decoded)) {
    throw Error('Failed to decode `getFixedPriceSales` response');
  }
  return decoded.right;
}

//// Main query functions

// const fixedPriceSalesCache: Record<string, FixedPriceSaleResponse> = {};

export async function getContractNfts(
  system: SystemWithToolkit | SystemWithWallet,
  address: string
): Promise<Nft[]> {
  const ledger = await getLedger(system.tzkt, address);
  const tokens = await getTokenMetadata(system.tzkt, address);
  const mktAddress = system.config.contracts.marketplace.fixedPrice.tez;
  const tokenSales = await getFixedPriceSales(system.tzkt, mktAddress);
  const activeSales = tokenSales.filter(sale => sale.active);

  console.log(
    ledger.find(l => l.value === 'tz1NhN4dqrFegi5mrwVtWJ2cQBTPETykAVAy')
  );

  return Promise.all(
    tokens.map(
      async (token): Promise<any> => {
        const { token_id: tokenId, token_info: tokenInfo } = token.value;

        const decodedInfo = _.mapValues(tokenInfo, fromHexString) as any;
        const resolvedInfo = await system.resolveMetadata(decodedInfo['']);
        const metadata = { ...decodedInfo, ...resolvedInfo.metadata };

        const saleData = activeSales.find(
          v =>
            v.key.sale_token.token_for_sale_address === address &&
            v.key.sale_token.token_for_sale_token_id === tokenId
        );

        const sale = saleData && {
          seller: saleData.key.sale_seller,
          price: Number.parseInt(saleData.value, 10) / 1000000,
          mutez: Number.parseInt(saleData.value, 10),
          type: 'fixedPrice'
        };

        return {
          id: parseInt(tokenId, 10),
          owner: ledger.find(e => e.key === tokenId)?.value,
          title: metadata.name,
          description: metadata.description,
          artifactUri: metadata.artifactUri,
          metadata: metadata,
          sale
        };
      }
    )
  );
}

export interface AssetContract {
  address: string;
  metadata: Record<string, any>;
}

const AssetMetadata = t.type({
  name: t.string
});

export async function getNftAssetContract(
  system: SystemWithToolkit | SystemWithWallet,
  address: string
): Promise<AssetContract> {
  const metaBigMap = await getAssetMetadata(system.tzkt, address);
  const metaUri = metaBigMap.find(v => v.key === '')?.value;
  if (!metaUri) {
    throw Error(`Could not extract metadata URI from ${address} storage`);
  }
  const { metadata } = await system.resolveMetadata(fromHexString(metaUri));

  const decoded = AssetMetadata.decode(metadata);
  if (isLeft(decoded)) {
    throw Error('Metadata validation failed');
  }
  return { address, metadata };
}

export async function getWalletNftAssetContracts(system: SystemWithWallet) {
  // TODO: Write decoder function for data retrieval
  const response = await system.tzkt.getAccountContracts(system.tzPublicKey);
  const assetContracts = response.filter((v: any) => v.kind === 'asset');
  const addresses = assetContracts.map((a: any) => a.address);
  const results: AssetContract[] = [];

  if (addresses.length === 0) {
    return results;
  }

  // TODO: Write decoder function for data retrieval
  const assetBigMapRows = (
    await system.tzkt.getBigMapUpdates({
      path: 'metadata',
      action: 'add_key',
      'contract.in': addresses,
      limit: '10000'
    })
  ).filter((v: any) => v.content.key === '');

  for (const row of assetBigMapRows) {
    try {
      const metaUri = row.content.value;
      const { metadata } = await system.resolveMetadata(fromHexString(metaUri));
      results.push({ address: row.contract.address, metadata });
    } catch (e) {
      console.log(e);
    }
  }

  return results;
}

export async function getMarketplaceNfts(
  system: SystemWithToolkit | SystemWithWallet,
  address: string
): Promise<MarketplaceNftLoadingData[]> {
  const tokenSales = await getFixedPriceSales(system.tzkt, address);
  const activeSales = tokenSales.filter(v => v.active);
  const addresses = activeSales
    .map(s => s.key.sale_token.token_for_sale_address)
    .join(',');

  // TODO: Write decoder function for data retrieval
  type TokenStorage = { 
    contract: { address:string },
    content: { value: { token_id: number, token_info: { '': string } } },
  };
  const tokenBigMapItems = await system.tzkt.getBigMapUpdates({
    path: 'assets.token_metadata',
    action: 'add_key',
    'contract.in': addresses,
    limit: '10000'
  }) as { find: (predicate: (item: TokenStorage) => boolean) => undefined | TokenStorage };

  // Sort descending (newest first)
  const salesToView = [...activeSales].reverse();
  const salesWithTokenMetadata = salesToView.map(x => ({
    tokenSale: x,
    tokenItem: tokenBigMapItems
      .find(item => x.key.sale_token.token_for_sale_address === item.contract.address 
        && x.key.sale_token.token_for_sale_token_id === (item.content.value.token_id + '')),
  })).map(x=>({
    loaded: false,
    token: null,
    tokenSale: x.tokenSale,
    tokenMetadata: x.tokenItem?.content?.value?.token_info[''],
  }));

  return salesWithTokenMetadata;
}

export type MarketplaceNftLoadingData = { 
  loaded: boolean,
  error?: string,
  token: null | Nft,
  tokenSale: FixedPriceSaleResponse[number], 
  tokenMetadata: undefined | string,
};
export const loadMarketplaceNft = async (
  system: SystemWithToolkit | SystemWithWallet,
  tokenLoadData: MarketplaceNftLoadingData
): Promise<MarketplaceNftLoadingData> => {

  const {
    token,
    loaded,
    tokenSale,
    tokenMetadata,
  } = tokenLoadData;
  const result = {...tokenLoadData};

  if(token || loaded){ return result; }
  result.loaded = true;

  const {
    token_for_sale_address: saleAddress,
    token_for_sale_token_id: tokenIdStr
  } = tokenSale.key.sale_token;

  const tokenId = parseInt(tokenIdStr, 10);
  const mutez = Number.parseInt(tokenSale.value, 10);
  const sale = {
    id: tokenSale.id,
    seller: tokenSale.key.sale_seller,
    price: mutez / 1000000,
    mutez: mutez,
    type: 'fixedPrice'
  };

  if (!tokenMetadata) {
    tokenLoadData.error = "Couldn't retrieve tokenMetadata";
    console.error("Couldn't retrieve tokenMetadata", {tokenSale});
    throw Error("Couldn't retrieve tokenMetadata");
  }

  const { metadata } = (await system.resolveMetadata(
    fromHexString(tokenMetadata)
  )) as any;

  result.token = {
    address: saleAddress,
    id: tokenId,
    title: metadata.name || '',
    owner: sale.seller,
    description: metadata.description || '',
    artifactUri: metadata.artifactUri || '',
    metadata: metadata,
    sale: sale
  };

  return result;
};
