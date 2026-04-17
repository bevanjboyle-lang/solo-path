export interface ApolloQuery {
  person_titles: string[];
  sector_keywords: string;
  seniority_levels: string[];
  location: string;
  company_size_ranges: string[];
}

export interface ApolloContact {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  company: string | null;
  linkedin_url: string | null;
}

export interface OutreachTaskExtension {
  outreach_subtype: 'warm' | 'cold';
  apollo_query: ApolloQuery | null;
}
