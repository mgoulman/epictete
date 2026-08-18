/**
 * Meta Ads Account Management
 */

import { makeAPIRequest, normalizeAccountId, isDSARequired } from './api';

export interface AdAccount {
  id: string;
  account_id: string;
  name: string;
  account_status: number;
  amount_spent: string;
  balance: string;
  currency: string;
  age?: number;
  business_city?: string;
  business_country_code?: string;
  timezone_name?: string;
  dsa_required?: boolean;
  dsa_compliance_note?: string;
}

export interface Page {
  id: string;
  name: string;
  access_token?: string;
  category?: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  };
}

const ACCOUNT_FIELDS = 'id,name,account_id,account_status,amount_spent,balance,currency,age,business_city,business_country_code,timezone_name';

export async function getAdAccounts(
  accessToken: string,
  userId: string = 'me',
  limit: number = 200
): Promise<{ data: AdAccount[] }> {
  return makeAPIRequest(`${userId}/adaccounts`, accessToken, {
    params: {
      fields: ACCOUNT_FIELDS,
      limit,
    },
  });
}

export async function getAccountInfo(
  accessToken: string,
  accountId: string
): Promise<AdAccount> {
  const normalizedId = normalizeAccountId(accountId);
  
  const data = await makeAPIRequest<AdAccount>(normalizedId, accessToken, {
    params: {
      fields: ACCOUNT_FIELDS,
    },
  });

  // Add DSA requirement detection
  if (data.business_country_code) {
    data.dsa_required = isDSARequired(data.business_country_code);
    data.dsa_compliance_note = data.dsa_required
      ? 'This account is subject to European DSA (Digital Services Act) requirements'
      : 'This account is not subject to European DSA requirements';
  }

  return data;
}

export async function getAccountPages(
  accessToken: string,
  accountId: string
): Promise<{ data: Page[] }> {
  const normalizedId = normalizeAccountId(accountId);
  
  return makeAPIRequest(`${normalizedId}/promote_pages`, accessToken, {
    params: {
      fields: 'id,name,access_token,category,instagram_business_account{id,username}',
    },
  });
}

export async function getUserPages(
  accessToken: string
): Promise<{ data: Page[] }> {
  return makeAPIRequest('me/accounts', accessToken, {
    params: {
      fields: 'id,name,access_token,category,instagram_business_account{id,username}',
    },
  });
}
