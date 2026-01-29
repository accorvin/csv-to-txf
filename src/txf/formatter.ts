export interface DetailLineParams {
  date: Date;
  account: string;
  organization: string;
  ein?: string;
}

export function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

export function formatDetailLine(params: DetailLineParams): string {
  const { date, account, organization, ein } = params;

  // Truncate organization name to 64 characters
  const truncatedOrg = organization.length > 64
    ? organization.slice(0, 64)
    : organization;

  const dateStr = formatDate(date);

  const parts = [dateStr, account, truncatedOrg];

  if (ein) {
    parts.push(`EIN:${ein}`);
  }

  return parts.join(' ');
}
