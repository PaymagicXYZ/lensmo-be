import {
    TypedDataDomain,
    TypedDataField,
  } from "@ethersproject/abstract-signer";
  import { ethers, utils, Wallet, providers } from "ethers";
  import { omit } from "./helpers";
  import {
    LENS_HUB_CONTRACT,
    LENS_PERIPHERY_CONTRACT,
    LENS_HUB_ABI,
    LENS_PERIPHERY_ABI,
  } from "../constants";
  import * as dotenv from "dotenv";
  dotenv.config();
  
  const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
  const PK = process.env.PK;
  
  export const ethersProvider = new ethers.providers.JsonRpcProvider(
    MUMBAI_RPC_URL
  );
  
  export const getSigner = () => {
    return new Wallet(PK!, ethersProvider);
  };
  
  export const getAddressFromSigner = () => {
    return getSigner().address;
  };
  
  export const signedTypeData = (
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, any>
  ) => {
    const signer = getSigner();
    // remove the __typedname from the signature!
    return signer._signTypedData(
      omit(domain, "__typename"),
      omit(types, "__typename"),
      omit(value, "__typename")
    );
  };
  
  export const splitSignature = (signature: string) => {
    return utils.splitSignature(signature);
  };
  
  export const sendTx = (
    transaction: utils.Deferrable<providers.TransactionRequest>
  ) => {
    const signer = getSigner();
    return signer.sendTransaction(transaction);
  };
  
  export const signText = (text: string) => {
    return getSigner().signMessage(text);
  };
  
  export const lensHub = new ethers.Contract(
    LENS_HUB_CONTRACT,
    LENS_HUB_ABI,
    getSigner()
  );
  
  export const lensPeriphery = new ethers.Contract(
    LENS_PERIPHERY_CONTRACT,
    LENS_PERIPHERY_ABI,
    getSigner()
  );
  