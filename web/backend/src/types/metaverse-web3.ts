/**
 * DNSweeper メタバース・Web3統合型定義
 * ブロックチェーン・ENS・NFT・DeFi・DAO・分散型DNS・デジタルアイデンティティ
 */

/**
 * ブロックチェーンネットワーク
 */
export type BlockchainNetwork = 
  | 'ethereum'               // Ethereum メインネット
  | 'ethereum_goerli'        // Ethereum Goerli テストネット
  | 'ethereum_sepolia'       // Ethereum Sepolia テストネット
  | 'polygon'                // Polygon (Matic)
  | 'polygon_mumbai'         // Polygon Mumbai テストネット
  | 'bsc'                    // Binance Smart Chain
  | 'bsc_testnet'            // BSC テストネット
  | 'arbitrum'               // Arbitrum One
  | 'arbitrum_goerli'        // Arbitrum Goerli
  | 'optimism'               // Optimism
  | 'optimism_goerli'        // Optimism Goerli
  | 'avalanche'              // Avalanche C-Chain
  | 'avalanche_fuji'         // Avalanche Fuji テストネット
  | 'fantom'                 // Fantom Opera
  | 'fantom_testnet'         // Fantom テストネット
  | 'solana'                 // Solana
  | 'solana_devnet'          // Solana Devnet
  | 'near'                   // NEAR Protocol
  | 'near_testnet'           // NEAR テストネット
  | 'cosmos'                 // Cosmos Hub
  | 'cosmos_testnet'         // Cosmos テストネット
  | 'handshake'              // Handshake
  | 'ens'                    // Ethereum Name Service
  | 'unstoppable'            // Unstoppable Domains
  | 'namecoin';              // Namecoin

/**
 * Web3プロトコル
 */
export type Web3Protocol = 
  | 'dns_over_blockchain'    // ブロックチェーンベースDNS
  | 'ens'                    // Ethereum Name Service
  | 'ipfs'                   // InterPlanetary File System
  | 'ipns'                   // InterPlanetary Name System
  | 'arweave'                // Arweave
  | 'filecoin'               // Filecoin
  | 'storj'                  // Storj
  | 'swarm'                  // Ethereum Swarm
  | 'ceramic'                // Ceramic Network
  | 'orbit_db'               // OrbitDB
  | 'gun'                    // GUN
  | 'textile'                // Textile
  | 'the_graph'              // The Graph
  | 'livepeer'               // Livepeer
  | 'brave_bat'              // Brave BAT
  | 'handshake_hns';         // Handshake HNS

/**
 * デジタルアイデンティティタイプ
 */
export type DigitalIdentityType = 
  | 'did'                    // Decentralized Identifier
  | 'ens'                    // Ethereum Name Service
  | 'unstoppable'            // Unstoppable Domains
  | 'handshake'              // Handshake
  | 'lens_protocol'          // Lens Protocol
  | 'civic'                  // Civic
  | 'self_key'               // SelfKey
  | 'uport'                  // uPort
  | 'bright_id'              // BrightID
  | 'proof_of_humanity'      // Proof of Humanity
  | 'polygon_id'             // Polygon ID
  | 'worldcoin'              // Worldcoin
  | 'gitcoin_passport'       // Gitcoin Passport
  | 'nft_identity'           // NFTベースアイデンティティ
  | 'soul_bound_token';      // Soul Bound Token

/**
 * メタバースプラットフォーム
 */
export type MetaversePlatform = 
  | 'sandbox'                // The Sandbox
  | 'decentraland'           // Decentraland
  | 'crypto_voxels'          // CryptoVoxels
  | 'somnium_space'          // Somnium Space
  | 'horizon_worlds'         // Horizon Worlds
  | 'vrchat'                 // VRChat
  | 'rec_room'               // Rec Room
  | 'roblox'                 // Roblox
  | 'fortnite'               // Fortnite
  | 'minecraft'              // Minecraft
  | 'spatial'                // Spatial
  | 'mozilla_hubs'           // Mozilla Hubs
  | 'gather_town'            // Gather Town
  | 'virbela'                // Virbela
  | 'frame_vr'               // Frame VR
  | 'immersed';              // Immersed

/**
 * ブロックチェーン設定
 */
export interface BlockchainConfig {
  network: BlockchainNetwork;
  chainId: number;
  name: string;
  symbol: string;
  rpcEndpoints: string[];
  explorerUrls: string[];
  
  // ネットワーク設定
  networkConfig: {
    blockTime: number;         // seconds
    confirmations: number;
    gasPrice: {
      slow: string;           // wei
      standard: string;       // wei
      fast: string;           // wei
    };
    maxGasLimit: string;      // wei
    nativeCurrency: {
      name: string;
      symbol: string;
      decimals: number;
    };
  };
  
  // 接続設定
  connection: {
    timeout: number;          // milliseconds
    retryAttempts: number;
    retryDelay: number;       // milliseconds
    maxConcurrentRequests: number;
    rateLimiting: {
      requestsPerSecond: number;
      burstLimit: number;
    };
  };
  
  // セキュリティ設定
  security: {
    enableSSL: boolean;
    verifySSL: boolean;
    apiKeyRequired: boolean;
    whitelistedAddresses: string[];
    blacklistedAddresses: string[];
  };
  
  // 監視設定
  monitoring: {
    enabled: boolean;
    blockHeightTracking: boolean;
    transactionTracking: boolean;
    eventMonitoring: boolean;
    alertThresholds: {
      blockDelay: number;     // seconds
      gasPrice: string;       // wei
      networkLatency: number; // milliseconds
    };
  };
  
  // コントラクト設定
  contracts: {
    ensRegistry?: string;
    ensResolver?: string;
    dnsRegistrar?: string;
    customContracts: Record<string, ContractConfig>;
  };
  
  isTestnet: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * コントラクト設定
 */
export interface ContractConfig {
  address: string;
  abi: any[];
  bytecode?: string;
  deployedBlock: number;
  version: string;
  verified: boolean;
  proxy?: {
    implementation: string;
    admin: string;
    type: 'transparent' | 'uups' | 'beacon';
  };
}

/**
 * ENS（Ethereum Name Service）ドメイン
 */
export interface EnsDocument {
  id: string;
  name: string;               // example.eth
  tokenId: string;
  owner: string;              // Ethereum address
  controller: string;         // Ethereum address
  resolver: string;           // Resolver contract address
  
  // ドメイン情報
  domain: {
    registrationDate: Date;
    expirationDate: Date;
    renewalDate?: Date;
    gracePeriodEnd?: Date;
    premiumPeriodEnd?: Date;
    isExpired: boolean;
    isInGracePeriod: boolean;
    isInPremiumPeriod: boolean;
  };
  
  // DNS レコード
  records: EnsRecord[];
  
  // リソース
  resources: {
    ipfsHash?: string;
    arweaveHash?: string;
    storjHash?: string;
    swarmHash?: string;
    skynetHash?: string;
    avatar?: string;
    website?: string;
    email?: string;
    description?: string;
    keywords?: string[];
    github?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  
  // メタデータ
  metadata: {
    textRecords: Record<string, string>;
    coinTypes: Record<string, string>; // coin type -> address
    contentHash?: string;
    publicKey?: string;
    abi?: any;
    interfaceImplementer?: Record<string, string>;
  };
  
  // トランザクション履歴
  transactions: EnsTransaction[];
  
  // 統計
  statistics: {
    totalTransactions: number;
    totalTransfers: number;
    lastActivity: Date;
    resolutionCount: number;
    reverseResolutionCount: number;
  };
  
  // Web3統合
  web3Integration: {
    isWeb3Native: boolean;
    supportedProtocols: Web3Protocol[];
    metaverseConnections: MetaverseConnection[];
    dappIntegrations: DappIntegration[];
  };
  
  // セキュリティ
  security: {
    dnssecEnabled: boolean;
    multiSigEnabled: boolean;
    timelock?: number;        // seconds
    guardians: string[];      // addresses
    socialRecovery: boolean;
  };
  
  status: 'active' | 'expired' | 'grace_period' | 'premium_period' | 'available';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ENS レコード
 */
export interface EnsRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX' | 'NS' | 'PTR' | 'SRV' | 'CAA' | 'TEXT' | 'ADDR' | 'CONTENTHASH';
  name: string;
  value: string;
  ttl: number;
  priority?: number;
  weight?: number;
  port?: number;
  target?: string;
  coinType?: number;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ENS トランザクション
 */
export interface EnsTransaction {
  hash: string;
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  value: string;              // wei
  gasPrice: string;           // wei
  gasUsed: string;
  timestamp: Date;
  type: 'registration' | 'renewal' | 'transfer' | 'update' | 'setResolver' | 'setController';
  details: Record<string, any>;
  status: 'success' | 'failed' | 'pending';
}

/**
 * メタバース接続
 */
export interface MetaverseConnection {
  platform: MetaversePlatform;
  worldId?: string;
  landId?: string;
  coordinates?: {
    x: number;
    y: number;
    z?: number;
  };
  connectionType: 'land_ownership' | 'avatar_link' | 'world_portal' | 'asset_link';
  metadata: {
    name?: string;
    description?: string;
    imageUrl?: string;
    animationUrl?: string;
    externalUrl?: string;
  };
  verificationStatus: 'verified' | 'pending' | 'failed' | 'not_verified';
  lastVerified?: Date;
  createdAt: Date;
}

/**
 * DApp統合
 */
export interface DappIntegration {
  dappId: string;
  name: string;
  category: 'defi' | 'nft' | 'gaming' | 'social' | 'dao' | 'identity' | 'storage' | 'other';
  protocol: Web3Protocol;
  contractAddress?: string;
  integrationLevel: 'basic' | 'advanced' | 'native';
  
  // 権限
  permissions: {
    read: boolean;
    write: boolean;
    execute: boolean;
    delegate: boolean;
  };
  
  // 設定
  configuration: {
    autoConnect: boolean;
    notifications: boolean;
    dataSharing: boolean;
    apiAccess: boolean;
  };
  
  status: 'active' | 'inactive' | 'revoked' | 'pending';
  lastUsed?: Date;
  createdAt: Date;
}

/**
 * 分散型アイデンティティ
 */
export interface DecentralizedIdentity {
  id: string;
  did: string;               // Decentralized Identifier
  method: DigitalIdentityType;
  
  // プロファイル
  profile: {
    name?: string;
    bio?: string;
    avatar?: string;
    banner?: string;
    location?: string;
    website?: string;
    email?: string;
    verified: boolean;
  };
  
  // 認証情報
  credentials: VerifiableCredential[];
  
  // 公開鍵
  publicKeys: DidPublicKey[];
  
  // サービスエンドポイント
  services: DidService[];
  
  // 関連ドメイン
  domains: string[];
  
  // ソーシャルプルーフ
  socialProofs: SocialProof[];
  
  // 評判システム
  reputation: {
    score: number;            // 0-100
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    badges: ReputationBadge[];
    attestations: Attestation[];
  };
  
  // プライバシー設定
  privacy: {
    profileVisibility: 'public' | 'contacts' | 'private';
    allowLookup: boolean;
    shareAnalytics: boolean;
    dataMinimization: boolean;
  };
  
  // Web3アクティビティ
  web3Activity: {
    totalTransactions: number;
    nftCollections: number;
    defiProtocols: number;
    daoMemberships: number;
    lastActivity: Date;
  };
  
  // 設定
  settings: {
    defaultNetwork: BlockchainNetwork;
    preferredWallet: string;
    notifications: NotificationSettings;
    security: IdentitySecuritySettings;
  };
  
  status: 'active' | 'inactive' | 'suspended' | 'compromised';
  createdAt: Date;
  updatedAt: Date;
  lastAccessAt: Date;
}

/**
 * 検証可能な資格情報
 */
export interface VerifiableCredential {
  id: string;
  type: string[];
  issuer: string;
  holder: string;
  issuanceDate: Date;
  expirationDate?: Date;
  credentialSubject: Record<string, any>;
  proof: CredentialProof;
  status: 'valid' | 'expired' | 'revoked' | 'suspended';
  verificationLevel: 'self_attested' | 'social' | 'institutional' | 'government';
}

/**
 * 資格情報証明
 */
export interface CredentialProof {
  type: string;
  created: Date;
  verificationMethod: string;
  signature: string;
  merkleRoot?: string;
  blockchainAnchor?: {
    network: BlockchainNetwork;
    transactionHash: string;
    blockNumber: number;
  };
}

/**
 * DID公開鍵
 */
export interface DidPublicKey {
  id: string;
  type: 'EcdsaSecp256k1VerificationKey2019' | 'Ed25519VerificationKey2018' | 'RsaVerificationKey2018';
  controller: string;
  publicKeyMultibase?: string;
  publicKeyBase58?: string;
  publicKeyHex?: string;
  usage: ('authentication' | 'keyAgreement' | 'assertionMethod' | 'capabilityInvocation' | 'capabilityDelegation')[];
  revoked: boolean;
  createdAt: Date;
}

/**
 * DIDサービス
 */
export interface DidService {
  id: string;
  type: string;
  serviceEndpoint: string | string[];
  description?: string;
  routingKeys?: string[];
  accept?: string[];
  metadata?: Record<string, any>;
}

/**
 * ソーシャルプルーフ
 */
export interface SocialProof {
  platform: 'twitter' | 'github' | 'linkedin' | 'discord' | 'telegram' | 'reddit' | 'instagram' | 'youtube' | 'other';
  handle: string;
  verified: boolean;
  verificationMethod: 'dns' | 'oauth' | 'signature' | 'manual';
  verificationDate?: Date;
  proof?: string;
  metadata?: Record<string, any>;
}

/**
 * 評判バッジ
 */
export interface ReputationBadge {
  id: string;
  name: string;
  description: string;
  category: 'contributor' | 'expert' | 'community' | 'security' | 'innovation' | 'governance';
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  issuer: string;
  criteria: string;
  imageUrl?: string;
  nftTokenId?: string;
  earned: Date;
  expires?: Date;
}

/**
 * 証明
 */
export interface Attestation {
  id: string;
  attester: string;
  recipient: string;
  schema: string;
  data: Record<string, any>;
  timestamp: Date;
  expirationDate?: Date;
  revocable: boolean;
  revoked: boolean;
  txHash?: string;
  blockNumber?: number;
  confidence: number;        // 0-100
}

/**
 * 通知設定
 */
export interface NotificationSettings {
  enabled: boolean;
  channels: ('email' | 'push' | 'discord' | 'telegram' | 'slack')[];
  preferences: {
    domainExpiry: boolean;
    transactions: boolean;
    governance: boolean;
    security: boolean;
    social: boolean;
    marketing: boolean;
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;           // HH:mm
    end: string;             // HH:mm
    timezone: string;
  };
}

/**
 * アイデンティティセキュリティ設定
 */
export interface IdentitySecuritySettings {
  twoFactorAuth: boolean;
  biometricAuth: boolean;
  socialRecovery: boolean;
  guardians: string[];
  recoveryThreshold: number;
  sessionTimeout: number;    // minutes
  ipWhitelist: string[];
  deviceTrust: boolean;
  riskAssessment: boolean;
}

/**
 * NFTコレクション
 */
export interface NftCollection {
  id: string;
  contractAddress: string;
  network: BlockchainNetwork;
  name: string;
  symbol: string;
  description?: string;
  
  // メタデータ
  metadata: {
    image?: string;
    bannerImage?: string;
    featuredImage?: string;
    website?: string;
    discord?: string;
    twitter?: string;
    medium?: string;
    telegram?: string;
  };
  
  // 統計
  statistics: {
    totalSupply: number;
    owners: number;
    floorPrice?: string;      // in wei
    volume24h?: string;       // in wei
    volumeTotal?: string;     // in wei
    averagePrice?: string;    // in wei
    marketCap?: string;       // in wei
    listed: number;
    sales24h: number;
  };
  
  // 特徴
  traits: NftTrait[];
  
  // DNS統合
  dnsIntegration: {
    enabled: boolean;
    domainPattern?: string;   // e.g., "#{tokenId}.collection.eth"
    customResolver?: string;
    recordTypes: string[];
  };
  
  // Web3機能
  web3Features: {
    stakingEnabled: boolean;
    gamingUtility: boolean;
    metaverseIntegration: boolean;
    daoGovernance: boolean;
    fractionalization: boolean;
    lending: boolean;
  };
  
  // 認証・検証
  verification: {
    verified: boolean;
    verifiedBy: string[];
    authenticity: 'original' | 'derivative' | 'remix' | 'fork' | 'fake';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * NFT特徴
 */
export interface NftTrait {
  traitType: string;
  value: string | number;
  displayType?: 'number' | 'boost_number' | 'boost_percentage' | 'date';
  rarity?: number;          // 0-100
  count?: number;
}

/**
 * DeFiプロトコル統合
 */
export interface DefiIntegration {
  id: string;
  protocol: string;
  network: BlockchainNetwork;
  category: 'dex' | 'lending' | 'yield_farming' | 'staking' | 'insurance' | 'synthetic' | 'bridge' | 'dao';
  
  // プロトコル情報
  protocolInfo: {
    name: string;
    version: string;
    contractAddress: string;
    abi?: any[];
    tvl?: string;            // Total Value Locked in wei
    apy?: number;            // Annual Percentage Yield
    risks: string[];
    audits: AuditInfo[];
  };
  
  // 統合設定
  integration: {
    enabled: boolean;
    autoCompound: boolean;
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
    maxSlippage: number;     // percentage
    minYield: number;        // percentage
    rebalanceStrategy: 'none' | 'monthly' | 'quarterly' | 'dynamic';
  };
  
  // ポジション
  positions: DefiPosition[];
  
  // 履歴
  transactions: DefiTransaction[];
  
  // リスク管理
  riskManagement: {
    maxExposure: string;     // in wei
    stopLoss?: number;       // percentage
    takeProfit?: number;     // percentage
    diversificationLimit: number; // percentage
    impermanentLossProtection: boolean;
  };
  
  status: 'active' | 'paused' | 'emergency_exit' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 監査情報
 */
export interface AuditInfo {
  auditor: string;
  date: Date;
  score: number;            // 0-100
  reportUrl?: string;
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
}

/**
 * DeFiポジション
 */
export interface DefiPosition {
  id: string;
  type: 'lend' | 'borrow' | 'stake' | 'pool' | 'farm' | 'vault';
  token: string;
  amount: string;           // in wei
  valueUsd?: number;
  apy: number;
  rewards: string[];        // token addresses
  rewardsEarned: Record<string, string>; // token -> amount in wei
  openedAt: Date;
  lastRebalance?: Date;
}

/**
 * DeFiトランザクション
 */
export interface DefiTransaction {
  hash: string;
  type: 'deposit' | 'withdraw' | 'compound' | 'harvest' | 'rebalance';
  token: string;
  amount: string;           // in wei
  valueUsd?: number;
  gasUsed: string;
  gasPrice: string;         // in wei
  timestamp: Date;
  status: 'pending' | 'success' | 'failed';
}

/**
 * DAOガバナンス
 */
export interface DaoGovernance {
  id: string;
  daoAddress: string;
  network: BlockchainNetwork;
  name: string;
  description?: string;
  
  // ガバナンス設定
  governance: {
    votingToken: string;
    proposalThreshold: string; // minimum tokens to create proposal
    quorum: number;           // percentage
    votingPeriod: number;     // blocks or seconds
    executionDelay: number;   // blocks or seconds
    gracePeriod: number;      // blocks or seconds
  };
  
  // メンバーシップ
  membership: {
    totalMembers: number;
    votingPower: string;      // in wei
    delegatedPower?: string;  // in wei
    memberTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    joinedAt: Date;
    lastVote?: Date;
  };
  
  // 提案
  proposals: DaoProposal[];
  
  // 投票履歴
  votes: DaoVote[];
  
  // 委任
  delegation: {
    delegate?: string;        // address
    delegators: string[];     // addresses
    totalDelegated: string;   // in wei
  };
  
  // 報酬
  rewards: {
    totalEarned: Record<string, string>; // token -> amount
    claimable: Record<string, string>;   // token -> amount
    lastClaim?: Date;
  };
  
  status: 'active' | 'inactive' | 'banned' | 'exited';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DAO提案
 */
export interface DaoProposal {
  id: string;
  proposalId: number;
  title: string;
  description: string;
  proposer: string;         // address
  
  // 投票状況
  voting: {
    startBlock: number;
    endBlock: number;
    forVotes: string;        // in wei
    againstVotes: string;    // in wei
    abstainVotes: string;    // in wei
    quorumReached: boolean;
    executed: boolean;
    cancelled: boolean;
  };
  
  // アクション
  actions: ProposalAction[];
  
  status: 'pending' | 'active' | 'defeated' | 'succeeded' | 'queued' | 'executed' | 'cancelled' | 'expired';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 提案アクション
 */
export interface ProposalAction {
  target: string;           // contract address
  value: string;            // wei
  signature: string;        // function signature
  data: string;             // encoded call data
  description?: string;
}

/**
 * DAO投票
 */
export interface DaoVote {
  proposalId: string;
  voter: string;            // address
  support: 'for' | 'against' | 'abstain';
  votes: string;            // voting power in wei
  reason?: string;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
}

/**
 * Web3ドメイン分析
 */
export interface Web3DomainAnalysis {
  domain: string;
  network: BlockchainNetwork;
  
  // 基本情報
  basicInfo: {
    owner: string;
    registrant: string;
    registrationDate: Date;
    expirationDate: Date;
    registrar: string;
    nameservers: string[];
  };
  
  // Web3機能
  web3Features: {
    ensEnabled: boolean;
    ipfsEnabled: boolean;
    arweaveEnabled: boolean;
    unstoppableEnabled: boolean;
    handshakeEnabled: boolean;
    dnsLinkEnabled: boolean;
    multiHash?: string;
    contentHash?: string;
  };
  
  // ブロックチェーン情報
  blockchainInfo: {
    tokenId?: string;
    nftContract?: string;
    lastTransaction?: string;
    transactionCount: number;
    smartContractVerified: boolean;
  };
  
  // セキュリティ分析
  security: {
    dnssecEnabled: boolean;
    httpsEnabled: boolean;
    certificateValid: boolean;
    reputationScore: number;  // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    threatsDetected: string[];
    blacklistStatus: boolean;
  };
  
  // メタバース統合
  metaverseIntegration: {
    platforms: MetaversePlatform[];
    virtualLand: VirtualLandInfo[];
    avatarLinks: AvatarLink[];
    nftCollections: string[];
  };
  
  // DeFi統合
  defiIntegration: {
    protocols: string[];
    totalValueLocked?: string; // in wei
    liquidityPools: string[];
    yieldFarming: boolean;
    governance: boolean;
  };
  
  // 統計
  statistics: {
    resolveCount24h: number;
    resolveCountTotal: number;
    uniqueVisitors24h: number;
    trafficSources: Record<string, number>;
    deviceTypes: Record<string, number>;
    geoDistribution: Record<string, number>;
  };
  
  // 予測・推奨
  insights: {
    trendPrediction: 'increasing' | 'stable' | 'decreasing';
    optimizationSuggestions: string[];
    securityRecommendations: string[];
    monetizationOpportunities: string[];
    web3Opportunities: string[];
  };
  
  analyzedAt: Date;
  nextAnalysis: Date;
}

/**
 * 仮想土地情報
 */
export interface VirtualLandInfo {
  platform: MetaversePlatform;
  landId: string;
  coordinates: {
    x: number;
    y: number;
    z?: number;
  };
  size: {
    width: number;
    height: number;
    depth?: number;
  };
  value?: {
    current: string;        // in wei
    currency: string;
    lastSale?: string;      // in wei
    lastSaleDate?: Date;
  };
  development: {
    hasBuilding: boolean;
    buildingType?: string;
    lastModified?: Date;
    visitorCount?: number;
  };
}

/**
 * アバターリンク
 */
export interface AvatarLink {
  platform: MetaversePlatform;
  avatarId: string;
  avatarName?: string;
  nftContract?: string;
  tokenId?: string;
  verified: boolean;
  lastUsed?: Date;
}

/**
 * 分散型ストレージ設定
 */
export interface DecentralizedStorage {
  id: string;
  provider: 'ipfs' | 'arweave' | 'filecoin' | 'storj' | 'sia' | 'swarm';
  
  // 設定
  configuration: {
    endpoint?: string;
    apiKey?: string;
    gateway?: string;
    timeout: number;          // milliseconds
    maxFileSize: number;      // bytes
    encryption: boolean;
    redundancy: number;
    pinning: boolean;
  };
  
  // 統計
  statistics: {
    totalFiles: number;
    totalSize: number;        // bytes
    retrievalCount: number;
    averageRetrievalTime: number; // milliseconds
    uptime: number;           // percentage
    cost: {
      storage: number;        // per GB
      retrieval: number;      // per GB
      bandwidth: number;      // per GB
    };
  };
  
  // ファイル
  files: DecentralizedFile[];
  
  status: 'active' | 'inactive' | 'maintenance' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 分散型ファイル
 */
export interface DecentralizedFile {
  id: string;
  filename: string;
  contentType: string;
  size: number;              // bytes
  hash: string;              // IPFS hash, Arweave txid, etc.
  gateway: string;
  pinned: boolean;
  encrypted: boolean;
  replicas: number;
  uploadedAt: Date;
  lastAccessed?: Date;
  accessCount: number;
  tags: string[];
  metadata?: Record<string, any>;
}

/**
 * ブロックチェーン分析結果
 */
export interface BlockchainAnalysisResult {
  network: BlockchainNetwork;
  address: string;
  
  // アドレス情報
  addressInfo: {
    type: 'eoa' | 'contract' | 'multisig' | 'dao' | 'nft' | 'token';
    balance: string;          // in wei
    balanceUsd?: number;
    transactionCount: number;
    firstSeen: Date;
    lastActivity: Date;
    isContract: boolean;
    contractVerified?: boolean;
  };
  
  // トークン保有
  tokenHoldings: TokenHolding[];
  
  // NFT保有
  nftHoldings: NftHolding[];
  
  // DeFi活動
  defiActivity: {
    protocols: string[];
    totalValueLocked: string; // in wei
    totalVolume: string;      // in wei
    yieldEarned: string;      // in wei
    positions: number;
  };
  
  // リスク分析
  riskAnalysis: {
    riskScore: number;        // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    sanctionsCheck: boolean;
    mixerUsage: boolean;
    suspiciousActivity: boolean;
  };
  
  // ネットワーク分析
  networkAnalysis: {
    clusterId?: string;
    relatedAddresses: string[];
    transactionPatterns: TransactionPattern[];
    behaviorAnalysis: BehaviorAnalysis;
  };
  
  analyzedAt: Date;
}

/**
 * トークン保有
 */
export interface TokenHolding {
  contractAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;           // in smallest unit
  balanceFormatted: string;
  balanceUsd?: number;
  percentage?: number;       // percentage of total portfolio
  priceChange24h?: number;   // percentage
}

/**
 * NFT保有
 */
export interface NftHolding {
  contractAddress: string;
  tokenId: string;
  name?: string;
  description?: string;
  image?: string;
  collection: string;
  rarity?: number;          // 0-100
  lastPrice?: string;       // in wei
  estimatedValue?: string;  // in wei
  acquiredAt: Date;
}

/**
 * トランザクションパターン
 */
export interface TransactionPattern {
  pattern: 'high_frequency' | 'large_amounts' | 'circular' | 'mixer' | 'anomalous' | 'bot_like';
  confidence: number;        // 0-100
  description: string;
  occurrences: number;
  timeframe: {
    start: Date;
    end: Date;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 行動分析
 */
export interface BehaviorAnalysis {
  userType: 'individual' | 'institution' | 'bot' | 'exchange' | 'protocol' | 'unknown';
  activityLevel: 'low' | 'medium' | 'high' | 'very_high';
  preferredHours: number[];  // hours of day (0-23)
  preferredDays: number[];   // days of week (0-6)
  averageTransactionValue: string; // in wei
  gasOptimization: number;   // 0-100
  privacyOriented: boolean;
  defiUser: boolean;
  nftCollector: boolean;
  governanceParticipant: boolean;
}