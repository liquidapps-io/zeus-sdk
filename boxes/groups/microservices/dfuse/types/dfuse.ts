export interface EventNum {
    tx: string,
    num: number
}

export interface Meta {
    txId: string,
    blockNum: number,
    timestamp: string,
    blockId: string,
    sidechain: string,
    eventNum: number
}

export interface Event {
    tx: string,
    num: number,
    meta: Meta
}

export interface  DappService {
    from?: string
    to?: string
    provider: string
    service: string
    quantity?: string
    symcode?: string
}

export interface  AccountextEntry {
  package_end: string
  package_started: string
  pending_package: string
  package: string
  last_reward: string
  last_usage: string
  balance: string
  quota: string
  provider: string
  service: string
  account: string
  id: number
}

export interface PackageItem {
  id: number
  api_endpoint: string
  package_json_uri: string
  package_id: string
  service: string
  provider: string
  quota: string
  package_period: string
  min_stake_quantity: string
  min_unstake_period: string
  enabled: number
}

export interface PackageEntry {
  rows: [
    PackageItem
  ],
  more: boolean,
  next_key: string
}

export interface ServiceMessage {
    searchTransactionsForward: {
      undo: boolean
      cursor: string    
      block: {
        id: string
        num: number
      }
      trace?: {
        id: string,
        matchingActions: {
            json: object
            receiver: string
            account: string
            name: string
            data: object
            console: string
        }[],
        block: {
            num: number,
            id: string,
            confirmed: string,
            timestamp: string,
            previous: string
        }
      }
    }
}

export interface StakingMessage {
    searchTransactionsForward: {
      undo: boolean
      cursor: string    
      block: {
        id: string
        num: number
      }
      trace?: {
        id: string,
        matchingActions: {
            json: object
            receiver: string
            account: string
            name: string
            data: DappService
            console: string
            dbOps: {
              key: {
                table: string
              }
              operation: string
              newJSON: {
                object: AccountextEntry
              }
            }[]
        }[],
        block: {
            num: number,
            id: string,
            confirmed: string,
            timestamp: string,
            previous: string
        }
      }
    }
}