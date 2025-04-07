export interface UserRow {
  // in db vcttools_users.users
  id: number;
  riot_puuid: string;
  riot_refresh_token: string;
  riot_id_token: string;
  riot_access_token: string;
  account_created: string;
  token_last_refreshed: string;
  token_expires_in: number;
  email: string;
  email_on_file: number; // boolean but sql stores as tinyint(1)
}

export interface EmailVerificationRow {
  // in db vcttools_users.email_codes
  for_user_id: number;
  verification_code: string; // VARCHAR(6)
  attempts_remaining: number;
  new_email: string;
}

export interface NewsArticleRow {
  // in db vcttools_news.articles
  id: number;
  preview: string;
  title: string;
  contents: string;
  datetime: string;
}

export interface DataRequestRow {
  // in db vcttools_users.data_requests
  user_id: number;
  last_data_request: string; // VARCHAR(255)
}
