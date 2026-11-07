/**
 * City catalog for programmatic SEO pages (/adopt/near/[city] and /adopt/[breed]/[city]).
 *
 * `zip` is a central postal code used for the listings provider's radius search.
 */

export interface CityEntry {
  slug: string;
  city: string;
  state: string;
  stateName: string;
  zip: string;
  /** Top metros get breed x city pages in the sitemap. All cities still render on demand. */
  major: boolean;
}

export const CITIES: CityEntry[] = [
  { slug: 'new-york-ny', city: 'New York', state: 'NY', stateName: 'New York', zip: '10001', major: true },
  { slug: 'los-angeles-ca', city: 'Los Angeles', state: 'CA', stateName: 'California', zip: '90012', major: true },
  { slug: 'chicago-il', city: 'Chicago', state: 'IL', stateName: 'Illinois', zip: '60601', major: true },
  { slug: 'houston-tx', city: 'Houston', state: 'TX', stateName: 'Texas', zip: '77002', major: true },
  { slug: 'phoenix-az', city: 'Phoenix', state: 'AZ', stateName: 'Arizona', zip: '85004', major: true },
  { slug: 'philadelphia-pa', city: 'Philadelphia', state: 'PA', stateName: 'Pennsylvania', zip: '19107', major: true },
  { slug: 'san-antonio-tx', city: 'San Antonio', state: 'TX', stateName: 'Texas', zip: '78205', major: true },
  { slug: 'san-diego-ca', city: 'San Diego', state: 'CA', stateName: 'California', zip: '92101', major: true },
  { slug: 'dallas-tx', city: 'Dallas', state: 'TX', stateName: 'Texas', zip: '75201', major: true },
  { slug: 'austin-tx', city: 'Austin', state: 'TX', stateName: 'Texas', zip: '78701', major: true },
  { slug: 'san-jose-ca', city: 'San Jose', state: 'CA', stateName: 'California', zip: '95113', major: false },
  { slug: 'jacksonville-fl', city: 'Jacksonville', state: 'FL', stateName: 'Florida', zip: '32202', major: false },
  { slug: 'fort-worth-tx', city: 'Fort Worth', state: 'TX', stateName: 'Texas', zip: '76102', major: false },
  { slug: 'columbus-oh', city: 'Columbus', state: 'OH', stateName: 'Ohio', zip: '43215', major: true },
  { slug: 'charlotte-nc', city: 'Charlotte', state: 'NC', stateName: 'North Carolina', zip: '28202', major: true },
  { slug: 'indianapolis-in', city: 'Indianapolis', state: 'IN', stateName: 'Indiana', zip: '46204', major: false },
  { slug: 'san-francisco-ca', city: 'San Francisco', state: 'CA', stateName: 'California', zip: '94103', major: true },
  { slug: 'seattle-wa', city: 'Seattle', state: 'WA', stateName: 'Washington', zip: '98101', major: true },
  { slug: 'denver-co', city: 'Denver', state: 'CO', stateName: 'Colorado', zip: '80202', major: true },
  { slug: 'washington-dc', city: 'Washington', state: 'DC', stateName: 'District of Columbia', zip: '20001', major: true },
  { slug: 'boston-ma', city: 'Boston', state: 'MA', stateName: 'Massachusetts', zip: '02108', major: true },
  { slug: 'nashville-tn', city: 'Nashville', state: 'TN', stateName: 'Tennessee', zip: '37203', major: true },
  { slug: 'detroit-mi', city: 'Detroit', state: 'MI', stateName: 'Michigan', zip: '48226', major: false },
  { slug: 'portland-or', city: 'Portland', state: 'OR', stateName: 'Oregon', zip: '97204', major: true },
  { slug: 'las-vegas-nv', city: 'Las Vegas', state: 'NV', stateName: 'Nevada', zip: '89101', major: false },
  { slug: 'memphis-tn', city: 'Memphis', state: 'TN', stateName: 'Tennessee', zip: '38103', major: false },
  { slug: 'louisville-ky', city: 'Louisville', state: 'KY', stateName: 'Kentucky', zip: '40202', major: false },
  { slug: 'baltimore-md', city: 'Baltimore', state: 'MD', stateName: 'Maryland', zip: '21201', major: false },
  { slug: 'milwaukee-wi', city: 'Milwaukee', state: 'WI', stateName: 'Wisconsin', zip: '53202', major: false },
  { slug: 'albuquerque-nm', city: 'Albuquerque', state: 'NM', stateName: 'New Mexico', zip: '87102', major: false },
  { slug: 'tucson-az', city: 'Tucson', state: 'AZ', stateName: 'Arizona', zip: '85701', major: false },
  { slug: 'sacramento-ca', city: 'Sacramento', state: 'CA', stateName: 'California', zip: '95814', major: false },
  { slug: 'kansas-city-mo', city: 'Kansas City', state: 'MO', stateName: 'Missouri', zip: '64106', major: false },
  { slug: 'atlanta-ga', city: 'Atlanta', state: 'GA', stateName: 'Georgia', zip: '30303', major: true },
  { slug: 'miami-fl', city: 'Miami', state: 'FL', stateName: 'Florida', zip: '33131', major: true },
  { slug: 'raleigh-nc', city: 'Raleigh', state: 'NC', stateName: 'North Carolina', zip: '27601', major: false },
  { slug: 'omaha-ne', city: 'Omaha', state: 'NE', stateName: 'Nebraska', zip: '68102', major: false },
  { slug: 'minneapolis-mn', city: 'Minneapolis', state: 'MN', stateName: 'Minnesota', zip: '55401', major: true },
  { slug: 'tampa-fl', city: 'Tampa', state: 'FL', stateName: 'Florida', zip: '33602', major: false },
  { slug: 'orlando-fl', city: 'Orlando', state: 'FL', stateName: 'Florida', zip: '32801', major: false },
  { slug: 'new-orleans-la', city: 'New Orleans', state: 'LA', stateName: 'Louisiana', zip: '70112', major: false },
  { slug: 'cleveland-oh', city: 'Cleveland', state: 'OH', stateName: 'Ohio', zip: '44113', major: false },
  { slug: 'pittsburgh-pa', city: 'Pittsburgh', state: 'PA', stateName: 'Pennsylvania', zip: '15222', major: false },
  { slug: 'cincinnati-oh', city: 'Cincinnati', state: 'OH', stateName: 'Ohio', zip: '45202', major: false },
  { slug: 'st-louis-mo', city: 'St. Louis', state: 'MO', stateName: 'Missouri', zip: '63101', major: false },
  { slug: 'salt-lake-city-ut', city: 'Salt Lake City', state: 'UT', stateName: 'Utah', zip: '84111', major: false },
  { slug: 'richmond-va', city: 'Richmond', state: 'VA', stateName: 'Virginia', zip: '23219', major: false },
  { slug: 'virginia-beach-va', city: 'Virginia Beach', state: 'VA', stateName: 'Virginia', zip: '23451', major: false },
  { slug: 'buffalo-ny', city: 'Buffalo', state: 'NY', stateName: 'New York', zip: '14202', major: false },
  { slug: 'hartford-ct', city: 'Hartford', state: 'CT', stateName: 'Connecticut', zip: '06103', major: false },
  { slug: 'providence-ri', city: 'Providence', state: 'RI', stateName: 'Rhode Island', zip: '02903', major: false },
  { slug: 'charleston-sc', city: 'Charleston', state: 'SC', stateName: 'South Carolina', zip: '29401', major: false },
  { slug: 'boise-id', city: 'Boise', state: 'ID', stateName: 'Idaho', zip: '83702', major: false },
  { slug: 'oklahoma-city-ok', city: 'Oklahoma City', state: 'OK', stateName: 'Oklahoma', zip: '73102', major: false },
  { slug: 'tulsa-ok', city: 'Tulsa', state: 'OK', stateName: 'Oklahoma', zip: '74103', major: false },
  { slug: 'birmingham-al', city: 'Birmingham', state: 'AL', stateName: 'Alabama', zip: '35203', major: false },
  { slug: 'madison-wi', city: 'Madison', state: 'WI', stateName: 'Wisconsin', zip: '53703', major: false },
  { slug: 'des-moines-ia', city: 'Des Moines', state: 'IA', stateName: 'Iowa', zip: '50309', major: false },
  { slug: 'rochester-ny', city: 'Rochester', state: 'NY', stateName: 'New York', zip: '14604', major: false },
  { slug: 'albany-ny', city: 'Albany', state: 'NY', stateName: 'New York', zip: '12207', major: false },
  { slug: 'newark-nj', city: 'Newark', state: 'NJ', stateName: 'New Jersey', zip: '07102', major: false },
  { slug: 'oakland-ca', city: 'Oakland', state: 'CA', stateName: 'California', zip: '94612', major: false },
  { slug: 'colorado-springs-co', city: 'Colorado Springs', state: 'CO', stateName: 'Colorado', zip: '80903', major: false },
  { slug: 'fresno-ca', city: 'Fresno', state: 'CA', stateName: 'California', zip: '93721', major: false },
  { slug: 'el-paso-tx', city: 'El Paso', state: 'TX', stateName: 'Texas', zip: '79901', major: false },
  { slug: 'spokane-wa', city: 'Spokane', state: 'WA', stateName: 'Washington', zip: '99201', major: false },
  { slug: 'greensboro-nc', city: 'Greensboro', state: 'NC', stateName: 'North Carolina', zip: '27401', major: false },
  { slug: 'durham-nc', city: 'Durham', state: 'NC', stateName: 'North Carolina', zip: '27701', major: false },
  { slug: 'asheville-nc', city: 'Asheville', state: 'NC', stateName: 'North Carolina', zip: '28801', major: false },
  { slug: 'savannah-ga', city: 'Savannah', state: 'GA', stateName: 'Georgia', zip: '31401', major: false },
  { slug: 'knoxville-tn', city: 'Knoxville', state: 'TN', stateName: 'Tennessee', zip: '37902', major: false },
  { slug: 'chattanooga-tn', city: 'Chattanooga', state: 'TN', stateName: 'Tennessee', zip: '37402', major: false },
  { slug: 'lexington-ky', city: 'Lexington', state: 'KY', stateName: 'Kentucky', zip: '40507', major: false },
  { slug: 'grand-rapids-mi', city: 'Grand Rapids', state: 'MI', stateName: 'Michigan', zip: '49503', major: false },
  { slug: 'ann-arbor-mi', city: 'Ann Arbor', state: 'MI', stateName: 'Michigan', zip: '48104', major: false },
  { slug: 'boulder-co', city: 'Boulder', state: 'CO', stateName: 'Colorado', zip: '80302', major: false },
  { slug: 'santa-fe-nm', city: 'Santa Fe', state: 'NM', stateName: 'New Mexico', zip: '87501', major: false },
  { slug: 'reno-nv', city: 'Reno', state: 'NV', stateName: 'Nevada', zip: '89501', major: false },
  { slug: 'eugene-or', city: 'Eugene', state: 'OR', stateName: 'Oregon', zip: '97401', major: false },
  { slug: 'tacoma-wa', city: 'Tacoma', state: 'WA', stateName: 'Washington', zip: '98402', major: false },
  { slug: 'burlington-vt', city: 'Burlington', state: 'VT', stateName: 'Vermont', zip: '05401', major: false },
  { slug: 'portland-me', city: 'Portland', state: 'ME', stateName: 'Maine', zip: '04101', major: false },
  { slug: 'honolulu-hi', city: 'Honolulu', state: 'HI', stateName: 'Hawaii', zip: '96813', major: false },
  { slug: 'anchorage-ak', city: 'Anchorage', state: 'AK', stateName: 'Alaska', zip: '99501', major: false },
];

const CITY_BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));

export function getCityBySlug(slug: string): CityEntry | undefined {
  return CITY_BY_SLUG.get(slug);
}

export function getMajorCities(): CityEntry[] {
  return CITIES.filter((c) => c.major);
}

export function cityLabel(city: CityEntry): string {
  return `${city.city}, ${city.state}`;
}
