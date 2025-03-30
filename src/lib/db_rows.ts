export interface UserRow {
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

export interface NewsArticleRow {
  id: number;
  preview: string;
  title: string;
  contents: string;
  datetime: string;
}
