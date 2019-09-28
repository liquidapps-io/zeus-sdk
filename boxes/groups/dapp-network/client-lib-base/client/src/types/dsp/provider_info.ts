export interface Package {
    api_endpoint: string;
    package_json_uri: string;
    package_id: string;
    service: string;
    provider: string;
    quota: string;
    package_period: string;
    min_stake_quantity: string;
    min_unstake_period: string;
    enabled: string;
}

export interface Api {
    api_endpoint: string;
}

export interface ApiProvider {
    api_endpoint: string;
    provider: string;
}
