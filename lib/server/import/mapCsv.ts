// Pure CSV-row → table-row mapping (unit tested; no I/O).
type Rec = Record<string, string | undefined>;
const v = (r: Rec, k: string) => (r[k] ?? '').trim();

export type SchoolRow = {
  name: string; location: string; tier: string; curriculum: string; school_phone: string; school_email: string;
  website: string; research_status: string; research_notes: string; research_sources: string;
  verified_school_contact: string; research_date: string;
};
export type ContactRow = {
  schoolKey: string; name: string; position: string; linkedin: string; email: string; phone: string; priority: string;
  current_role_verification: string; email_verification_status: string; linkedin_verification_status: string;
  confidence_score: string; outreach_priority: string; record_audit_flags: string;
};

export function mapCsvRows(records: Rec[]) {
  const schools = new Map<string, SchoolRow>();
  const contacts = new Map<string, ContactRow>();
  let skipped = 0;
  for (const r of records) {
    const name = v(r, 'School Name');
    if (!name) { skipped++; continue; }
    const location = v(r, 'Location');
    const schoolKey = `${name}\u0000${location}`;
    // First row seen for a school defines its school-level fields.
    if (!schools.has(schoolKey)) {
      schools.set(schoolKey, {
        name, location, tier: v(r, 'Tier'), curriculum: v(r, 'Curriculum'), school_phone: v(r, 'School Phone'),
        school_email: v(r, 'School Email'), website: v(r, 'Website'), research_status: v(r, 'Research Status'),
        research_notes: v(r, 'Research Notes'), research_sources: v(r, 'Research Sources'),
        verified_school_contact: v(r, 'Verified School Contact'), research_date: v(r, 'Research Date'),
      });
    }
    const cName = v(r, 'Decision Maker Name') || 'Unknown';
    const position = v(r, 'Position');
    // Later duplicate rows win, matching an in-place update.
    contacts.set(`${schoolKey}\u0000${cName}\u0000${position}`, {
      schoolKey, name: cName, position, linkedin: v(r, 'LinkedIn'), email: v(r, 'Email'), phone: v(r, 'Phone'),
      priority: v(r, 'Priority'), current_role_verification: v(r, 'Current Role Verification'),
      email_verification_status: v(r, 'Email Verification Status'), linkedin_verification_status: v(r, 'LinkedIn Verification Status'),
      confidence_score: v(r, 'Confidence Score'), outreach_priority: v(r, 'Outreach Priority'), record_audit_flags: v(r, 'Record Audit Flags'),
    });
  }
  return { schools: [...schools.values()], contacts: [...contacts.values()], skipped };
}
