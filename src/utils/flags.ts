/**
 * Maps country names to their flag emojis
 */
export const countryFlags: Record<string, string> = {
  // Europe
  Germany: '🇩🇪',
  France: '🇫🇷',
  Spain: '🇪🇸',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Italy: '🇮🇹',
  Portugal: '🇵🇹',
  Netherlands: '🇳🇱',
  Belgium: '🇧🇪',
  Croatia: '🇭🇷',
  Denmark: '🇩🇰',
  Switzerland: '🇨🇭',
  Poland: '🇵🇱',
  Ukraine: '🇺🇦',
  Sweden: '🇸🇪',
  Austria: '🇦🇹',
  'Czech Republic': '🇨🇿',
  Serbia: '🇷🇸',
  Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Norway: '🇳🇴',
  Turkey: '🇹🇷',
  Greece: '🇬🇷',
  Romania: '🇷🇴',
  Slovakia: '🇸🇰',
  Hungary: '🇭🇺',
  Russia: '🇷🇺',
  Iceland: '🇮🇸',
  'Bosnia and Herzegovina': '🇧🇦',
  Slovenia: '🇸🇮',
  'North Macedonia': '🇲🇰',
  Finland: '🇫🇮',
  Albania: '🇦🇱',
  Bulgaria: '🇧🇬',
  'Republic of Ireland': '🇮🇪',
  'Northern Ireland': '🇬🇧',

  // South America
  Brazil: '🇧🇷',
  Argentina: '🇦🇷',
  Uruguay: '🇺🇾',
  Colombia: '🇨🇴',
  Chile: '🇨🇱',
  Peru: '🇵🇪',
  Ecuador: '🇪🇨',
  Paraguay: '🇵🇾',
  Venezuela: '🇻🇪',
  Bolivia: '🇧🇴',

  // North America
  'United States': '🇺🇸',
  USA: '🇺🇸',
  Mexico: '🇲🇽',
  Canada: '🇨🇦',
  'Costa Rica': '🇨🇷',
  Jamaica: '🇯🇲',
  Panama: '🇵🇦',
  Honduras: '🇭🇳',
  'El Salvador': '🇸🇻',
  'Trinidad and Tobago': '🇹🇹',

  // Africa
  Senegal: '🇸🇳',
  Morocco: '🇲🇦',
  Tunisia: '🇹🇳',
  Algeria: '🇩🇿',
  Nigeria: '🇳🇬',
  Cameroon: '🇨🇲',
  Ghana: '🇬🇭',
  Egypt: '🇪🇬',
  'South Africa': '🇿🇦',
  'Ivory Coast': '🇨🇮',
  Mali: '🇲🇱',
  'Burkina Faso': '🇧🇫',
  Guinea: '🇬🇳',
  'DR Congo': '🇨🇩',
  Kenya: '🇰🇪',
  Zambia: '🇿🇲',
  Uganda: '🇺🇬',

  // Asia
  Japan: '🇯🇵',
  'South Korea': '🇰🇷',
  Iran: '🇮🇷',
  'Saudi Arabia': '🇸🇦',
  Qatar: '🇶🇦',
  Australia: '🇦🇺',
  Iraq: '🇮🇶',
  'United Arab Emirates': '🇦🇪',
  UAE: '🇦🇪',
  China: '🇨🇳',
  Thailand: '🇹🇭',
  Vietnam: '🇻🇳',
  Indonesia: '🇮🇩',
  India: '🇮🇳',
  Oman: '🇴🇲',
  Uzbekistan: '🇺🇿',
  Bahrain: '🇧🇭',
  Syria: '🇸🇾',
  Palestine: '🇵🇸',
  Jordan: '🇯🇴',
  Lebanon: '🇱🇧',
  'Korea Republic': '🇰🇷',
  'IR Iran': '🇮🇷',

  // Oceania
  'New Zealand': '🇳🇿',

  // Other common variations
  'Korea DPR': '🇰🇵',
  'North Korea': '🇰🇵',
  Czechia: '🇨🇿',
};

/**
 * Get flag emoji for a country/team name
 * @param teamName - The name of the team/country
 * @returns Flag emoji if found, empty string if not found
 */
export function getFlag(teamName: string): string {
  return countryFlags[teamName] || '';
}

/**
 * Format team name with flag emoji
 * @param teamName - The name of the team/country
 * @returns Formatted string with flag emoji (if found) and team name
 */
export function formatTeamWithFlag(teamName: string): string {
  const flag = getFlag(teamName);
  return flag ? `${flag} ${teamName}` : teamName;
}
