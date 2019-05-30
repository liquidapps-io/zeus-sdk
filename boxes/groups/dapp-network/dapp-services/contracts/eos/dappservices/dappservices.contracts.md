<h1 class="contract"> claimrewards </h1>

As an authorized party, I {{ signer }} wish to have the rewards earned by {{ provider }} deposited into the {{ provider }} account.

<h1 class="contract"> close </h1>

As an authorized party I {{ signer }} wish to free the memory associated with the balance of {{owner}} {{symbol}} tokens.


<h1 class="contract"> closeprv </h1>

As an authorized party I {{ signer }} wish to free the memory associated with the data associated with the {{service}} from {{provider}}.


<h1 class="contract"> create </h1>
The DAPP token created will have a maximum supply of {{maximum_supply_amount}}. The inflation per block rate is {{inflation_per_block}} and the inflation will start at {{inflation _starts_at}} epoch time (ms).


<h1 class="contract"> issue </h1>

As an authorized party I {{ signer }} wish to issue {{quantity}} amount of DAPP Token/s to {{to}} with the following memo: {{memo}}.



<h1 class="contract"> open </h1>

As an authorized party I {{ signer }} wish to allocate memory from {{ram_payer}} for the purpose of opening balance for the  {{symbol}} token in the {{owner}} account.

<h1 class="contract"> refund </h1>

As an authorized party I {{ signer }} wish to have the unstaked {{symcode}} tokens of {{ to }} previously staked to {{service}} of {{ provider } returned to {{ to }}.

<h1 class="contract"> regpkg </h1>

The intent of the REGPKG action is to enable the registration of a potential Service Package to be provided by a DAPP Service Provider (“PKG” and ”DSP”, respectively).
Once the action is completed, a DSP’s PKG will be registered in the DAPP Token Smart Contract, enabling users to select it (via SelectPKG action) and use it (via Stake action).
“Registered PKG” means a PKG that is registered under REGPKG action;

A Registered PKG is comprised of these minimum core elements, which are provided by the DSP (the “PKG Properties”):

PKG ID: {{newpackage.package_id}}

PKG provided by {{newpackage.provider}}
DSP API address: {{newpackage.api_endpoint}}

PKG service type: {{newpackage.service}}
PKG service type amount (quota) {{newpackage.qouta}}

PKG specifications, as declared by the DAPP Service Provider and included herein by reference: {{newpackage.package_json_uri}}

The required amount of time the tokens must remain staked (locked) to enable the PKG: {{newpackage.min_unstake_period}}

What is the duration of the PKG: {{newpackage.package_period}}
How many DAPP Tokens needed to be staked in order to use the PKG: {{newpackage.min_stake_quantity}}

Since the DAPP Network is built, operated and developed by its users, it is upon community members to set for themselves whatever terms will apply to transactions on the DAPP Network. Having said that, as a service to the DAPP Network at its early stage and for guidance, LiquidApps can propose the following frame for the regpkg Contract: 

I, {{newpackage.provider}} (the “DSP”), hereby state my interest and readiness to provide that certain Registered PKG to DAPP Token users, utilizing the DAPP Token and related smart contracts deployed on the EOS blockchain (the “DAPP Network”).
With respect to the Registered PKG, DSP confirms that:
It has validated the PKG Properties and that it is capable of supplying the Registered PKG under the PKG Properties.
Other than as stated in the PKG Properties (specifically, the minimum amount of DAPP Tokens that must be staked to use the PKG: {{newpackage.min_stake_quantity}}), the use of the PKG is not subjected to or conditioned upon any terms.
The {{newpackage.provider}} will keep his servers maintained and secured, with only the DSP having access to features connected with the PKG and services provided.
should the DSP use, within the course of providing the services under the PKG, any technique, code or smart contract developed, amended, adapted, upgraded or otherwise altered by the DSP, DSP accepts liability for any and all provable damages that result from such actions of the DSP, unless specifically stated otherwise.  
It will not interfere with, harm, infringe, breach or otherwise abuse the DAPP Network, its ongoing operations, related terms and conditions (as may be applicable) and any of its users rights.
I agree to process all producer election transactions that occur in blocks I create, to sign all objectively valid blocks I create that contain election transactions, and to sign all pre-confirmation and confirmations necessary to facilitate the transfer of control to the next set of producers as determined by the system contract.
DSP’s offering and/or supplying of PKG’s will not subject DSP to any limitations, other than explicitly set forth herein. 
Should DSP maintain a website related to the PKG’s which contains supported by the DSP, DSP may include at its sole discretion additional terms and conditions applicable to DSP’s services.
DSP is providing PKG and services on its own account while understanding all risks and liabilities and by providing PKG agrees and accepts the applicable terms of the complete DAPP Token Purchase Agreement and its annexes available at https://www.liquidapps.io/ including the DAPP Token White Paper available at https://www.liquidapps.io/ (the “Transaction Documents”).


<h1 class="contract"> retire </h1>

As an authorized party I {{ signer }} wish to retire {{quantity}} tokens out of the total supply with the following memo: {{memo}}.



<h1 class="contract"> transfer </h1>

I, {{from}}, certify the following to be true to the best of my knowledge:
 
I have disclosed any contractual terms & conditions with respect to {{quantity}} to {{to}} as may be applicable.
I understand that funds transfers are not reversible after the {{transaction.delay}} seconds or other delays as configured by {{from}}'s permissions.
By executing and approving this transfer, I hereby irrevocably and unconditionally represent and confirm all the following:
I am the owner of the {{quantity}} DAPP tokens used in executing this transfer (if for myself), or have all requisite authorization and power to use this account and {{quantity}} DAPP tokens used for this transfer (if for an entity or person I represent);
My use of this account and {{quantity}} DAPP tokens for executing this transfer. is lawful and does not impair or in breach of any third-party rights;  



<h1 class="contract"> unstake </h1>

As an authorized party I {{ signer }} hereby unstake {{ quantity }} from {{ provider }}. .
By executing and approving this unstake, I hereby irrevocably and unconditionally represent and confirm all the following:
I am the owner of the the DAPP tokens used in executing this unstake (if for myself), or have all requisite authorization and power to use this account and DAPP tokens used for this unstake (if for an entity or person I represent);
My use of this account and DAPP tokens for executing this unstake. is lawful and does not impair or in breach of any third-party rights;


<h1 class="contract"> selectpkg </h1>

As an authorized party I {{ signer }}, certify the following to be true to the best of my knowledge:
 
As an authorized party, I {{ signer }} declare that I have read the description of the {{provider}} and the {{package}} I choose to select.
I agree to any contractual terms & conditions with respect to {{package}} in the specific {{service}} set forth and/or published by the {{provider}}, and accept that the use of the {{package}} and/or {{service}} shall be governed by such terms. 
I understand that this action by itself will entitle or grant me any right or claim, and the right and ability to use {{package}} and/or {{service}} will be enabled only when I have invoked <staked> of sufficient DAPP tokens in {{owner}} account as described in the specific {{package}}.
If a {{package}} is selected while having sufficient amount of staked DAPP tokens, this action will lock in {{owner}} staked token for the period of time defined in the {{package}}.



<h1 class="contract"> stake </h1>
As an authorized party I {{ signer }} wish to stake {{ quantity }} for a {{ service }} from {{ provider }} the liquid tokens of {{ from }} will be staked to the {{ provider }} for the specific {{ service }}.
If you have invoked selectpkg and have sufficient {{ quantity }} DAPP tokens staked to the {{service}} of the {{provider}}, this action will lock in {{from}} staked token for the period of time defined in the specific {{service}} of the {{provider}} as defined in the package.
By executing and approving this stake, I hereby irrevocably and unconditionally represent and confirm all the following:
I am the owner of the the DAPP tokens used in executing this stake (if for myself), or have all requisite authorization and power to use this account and DAPP tokens used for this stake (if for an entity or person I represent);
My use of this account and DAPP tokens for executing this stake. is lawful and does not impair or in breach of any third-party rights;
