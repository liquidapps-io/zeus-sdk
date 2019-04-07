# Modify Package

The intent of the REGPKG action is to enable the modification of an existing Service Package provided by a DAPP Service Provider (“PKG” and ”DSP”, respectively).
Once the action is completed, a DSP’s PKG will be modified in the DAPP Token Smart Contract, enabling users to select it (via SelectPKG action) and use it (via Stake action) with the new settings.
“Registered PKG” means a PKG that is registered under REGPKG action;

A Registered PKG is comprised of these minimum core elements, which are provided by the DSP (the “PKG Properties”):

PKG ID: {{package_id}}

PKG provided by {{provider}}
DSP API address: {{api_endpoint}}

PKG service type: {{service}}

PKG specifications, as declared by the DAPP Service Provider and included herein by reference: {{package_json_uri}}