# EOS Detective Reports

> EOSIO based smart contract that publishes token forensic reports on chain.

## How to Install

[`eosio.cdt`](https://github.com/EOSIO/eosio.cdt) & [`cleos`](https://github.com/EOSIO/eos) (or [`eosc`](https://github.com/eoscanada/eosc)) must already be installed installed.

**Mac OS X Brew Install**

**install `eosio-cpp`**
```
$ brew tap eosio/eosio.cdt
$ brew install eosio.cdt
```
**install `cleos`**
```
$ brew tap eosio/eosio
$ brew install eosio
```

**Build .wasm**

```
$ git clone git@github.com:EOS-Nation/eos-detective-reports.git
$ cd eos-detective-reports/src
$ eosio-cpp detective.cpp -o detective.wasm
```

**Deploy Contract**

`<account>` is the account name used to deploy the smart contract.

```
$ cleos set contract [account name] [contract-dir] [wasm file] [abi file]
$ eosc system setcontract [account name] [wasm file] [abi file]
```

## How to Use

Get Account Data

```
$ cleos get table [code account] [scope] accounts
```

Push new report

```
$ cleos push action [code account] post '["account",score,"metadata"]' -p <account>@active
```

Update report

```
$ cleos push action [code account] post '["account",score,"metadata"]' -p <account>@active
```

Remove report before expiry

```
$ cleos push action [code account] post '["account",0,""]' -p <account>@active
```

Remove report after expiry

```
$ cleos push action [code account] expire '["account"]' -p <account>@active
```

## Tables

**accounts**

| variable  | type    | description        |
|-----------|---------|--------------------|
| account   | account | EOSIO Account Name |
| score     | integer | Token Weighted Score     |
| metadata  | JSON    | Token Forensics Metadata |
| timestamp | datetime| Last updated             |

## Setup Custom Permissions

It is recommended that you set custom permissions for the following reasons:
- Not exposing your `active` or `owner` private key
- Permission has explicit actions it can perform (ex: `post` & `expire`)

```
$ cleos set account permission [account] [permission_name] [authority] [parent permission or ""]
$ cleos set action permission [your account] [code account] [action name] [permission name]

$ eosc system updateauth [account] [permission_name] [parent permission or ""] [authority]
$ eosc system linkauth [your account] [code account] [action name] [permission name]
```

**Example**

```
$ cleos set account permission account12345 reports EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV active
$ cleos set action permission account12345 [code account] post reports

$ eosc system updateauth account12345 reports active EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV
$ eosc system linkauth account12345 [code account] post reports
```