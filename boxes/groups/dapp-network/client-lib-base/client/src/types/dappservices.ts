export interface Accountext {
    id: number;
    account: string;
    service: string;
    provider: string;
    quota: string;
    balance: string;
    last_usage: number;
    last_reward: number;
    package: string;
    pending_package: string;
    package_started: number;
    package_end: number;
    status?: string;
  }

export interface Package {
    id: number;
    api_endpoint: string;
    package_json_uri: string;
    package_id: string;
    service: string;
    provider: string;
    quota: string;
    package_period: number;
    min_stake_quantity: string;
    min_unstake_period: number;
    enabled: number;
  }

export interface Staking {
    id: number;
    account: string;
    balance: string;
    service: string;
    provider: string;
  }

export interface Refunds {
    id: number;
    account: string;
    amount: string;
    unstake_time: number;
    service: string;
    provider: string;
  }
